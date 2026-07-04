/**
 * Script Generator — produces video narration scripts using LLM with
 * character persona context.
 *
 * The character name comes from `student.characterPreference`
 * ("mbappe", "lisa", "kak-budi", etc.) and is used to shape the
 * narration voice, style, and energy level.
 *
 * @module @/agents/media/script
 */

import { callLLM } from "@/llm/client";
import { getSystemPrompt } from "@/llm/prompts";
import type { ChatMessage } from "@/llm/types";
import { getCharacter, type CharacterKey } from "./characters";

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface ScriptInput {
  topic: string;
  subTopic?: string | null;
  subject: string;
  processedContent: string;
  characterKey: CharacterKey | string;
}

export interface ScriptResult {
  script: string;
  character: string;
  estimatedDurationSec: number;
  /** Visual cues extracted from [VISUAL: ...] markers in the script */
  visualCues: string[];
}

/**
 * Generate a video script from processed learning material using the
 * LLM with character persona shaping.
 *
 * The system prompt is augmented with:
 *  - The base `media_script` prompt from prompts.ts
 *  - The selected character's personality description and voice style
 *
 * Falls back to a simple template-based script when the LLM call fails.
 */
export async function generateScript(
  input: ScriptInput,
): Promise<ScriptResult> {
  const character = getCharacter(input.characterKey);

  // --- Build system message with character persona ---
  const basePrompt = getSystemPrompt("media_script");

  const characterAugmented = [
    basePrompt,
    "",
    `=== KARAKTER NARASI: ${character.name} ${character.emoji} ===`,
    `Gaya bicara: ${character.voiceStyle}`,
    `Deskripsi karakter: ${character.description ?? character.voiceStyle}`,
    "",
    "TULISLAH NASKAH DENGAN GAYA BICARA KARAKTER DI ATAS.",
    "Pastikan naskah terdengar seperti karakter tersebut sedang berbicara",
    "kepada anak SD kelas 5 Indonesia — bukan seperti guru di kelas.",
  ].join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: characterAugmented },
    {
      role: "user",
      content: [
        `Buat naskah video pembelajaran (max 2 menit jika dibacakan) untuk:`,
        ``,
        `Topik: ${input.topic}`,
        input.subTopic ? `Sub-topik: ${input.subTopic}` : "",
        `Mata Pelajaran: ${input.subject}`,
        ``,
        `Materi:`,
        input.processedContent.slice(0, 3000),
        ``,
        `Panduan:`,
        `- Naskah untuk suara, bukan tulisan — seperti orang ngomong`,
        `- Gunakan intonasi: tanda seru, jeda (...), penekanan (HURUF KAPITAL)`,
        `- Cocok untuk text-to-speech`,
        `- Sertakan panduan visual di margin [VISUAL: ...]`,
        `- Akhiri dengan ajakan bertindak (misal "coba ulangi ya!")`,
        `- Bicaralah KARAKTER ${character.name} dengan gaya ${character.voiceStyle}`,
        ``,
        `Output dalam format:`,
        `---`,
        `[NASKAH]`,
        `... naskah lengkap ...`,
        `---`,
        `[DURASI_ESTIMASI]`,
        `... perkiraan durasi dalam detik ...`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  // --- Try LLM first ---
  try {
    const llmResponse = await callLLM("media_script", messages, {
      temperature: 0.8,
      maxTokens: 2048,
    });

    if (llmResponse) {
      return parseScriptResponse(llmResponse, character.name);
    }
  } catch {
    // fallback below
    console.warn(
      `[media/script] LLM call failed — using template fallback`,
    );
  }

  // --- Fallback: template-based script ---
  return generateTemplateScript(input, character.name);
}

/* ------------------------------------------------------------------ */
/*  LLM Response Parsing                                               */
/* ------------------------------------------------------------------ */

function parseScriptResponse(
  text: string,
  characterName: string,
): ScriptResult {
  let script = text;
  let estimatedDurationSec = 60;

  // Extract [NASKAH] section if present
  const naskahMatch = text.match(/\[NASKAH\]\s*([\s\S]*?)(?:---|$)/);
  if (naskahMatch) {
    script = naskahMatch[1].trim();
  }

  // Extract [DURASI_ESTIMASI] section
  const durasiMatch = text.match(/\[DURASI_ESTIMASI\]\s*(\d+)/);
  if (durasiMatch) {
    const parsed = parseInt(durasiMatch[1], 10);
    if (parsed > 0 && parsed <= 600) {
      estimatedDurationSec = parsed;
    }
  }

  // Extract visual cues
  const visualCues: string[] = [];
  const visualRegex = /\[VISUAL:\s*([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = visualRegex.exec(script)) !== null) {
    visualCues.push(match[1].trim());
  }

  return {
    script,
    character: characterName,
    estimatedDurationSec,
    visualCues,
  };
}

/* ------------------------------------------------------------------ */
/*  Template Fallback                                                   */
/* ------------------------------------------------------------------ */

function generateTemplateScript(
  input: ScriptInput,
  characterName: string,
): ScriptResult {
  const { topic, subject } = input;

  const script = [
    `Halo adik-adik! Aku ${characterName}!`,
    ``,
    `Hari ini kita akan belajar tentang ${topic} dalam pelajaran ${subject}.`,
    ``,
    `[VISUAL: Tampilkan judul topik "${topic}" dengan gambar menarik]`,
    ``,
    `${topic} itu sebenarnya seru lho!`,
    ``,
    `[VISUAL: Ilustrasi sederhana tentang ${topic}]`,
    ``,
    `Yuk kita pelajari sama-sama!`,
    ``,
    `${topic} adalah salah satu hal penting yang perlu kita pahami`,
    `supaya makin pintar dalam ${subject}.`,
    ``,
    `[VISUAL: Contoh ${topic} dalam kehidupan sehari-hari]`,
    ``,
    `Gimana? Mulai paham kan? Coba ulangi lagi ya pelan-pelan`,
    `supaya makin ngerti!`,
    ``,
    `Sampai jumpa di video selanjutnya!`,
  ].join("\n");

  return {
    script,
    character: characterName,
    estimatedDurationSec: 60,
    visualCues: [
      `Tampilkan judul topik "${topic}" dengan gambar menarik`,
      `Ilustrasi sederhana tentang ${topic}`,
      `Contoh ${topic} dalam kehidupan sehari-hari`,
    ],
  };
}
