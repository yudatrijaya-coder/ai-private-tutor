/**
 * TTS Engine — generates narration audio using edge-tts.
 *
 * Uses Microsoft Edge TTS (via `edge-tts` Python package) to generate
 * `.mp3` narration files with character-appropriate voices.
 *
 * @module @/agents/media/tts
 */

import { execSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// ─── Voice mapping ──────────────────────────────────────────────

const VOICE_MAP: Record<string, { voice: string; label: string }> = {
  ian:      { voice: "id-ID-GadisNeural", label: "Gadis (Wanita)" },
  mbappe:   { voice: "id-ID-ArdiNeural",  label: "Ardi (Pria)" },
  lisa:     { voice: "id-ID-GadisNeural", label: "Gadis (Wanita)" },
  "kak-budi":  { voice: "id-ID-ArdiNeural",  label: "Ardi (Pria)" },
  "kak-dewi":  { voice: "id-ID-GadisNeural", label: "Gadis (Wanita)" },
  "kak-raka":  { voice: "id-ID-ArdiNeural",  label: "Ardi (Pria)" },
};

function getVoice(characterKey: string): { voice: string; label: string } {
  return VOICE_MAP[characterKey.toLowerCase()] || VOICE_MAP["kak-budi"];
}

// ─── Audio output directory ────────────────────────────────────

const AUDIO_DIR = join(process.cwd(), "public", "audio");

function ensureDir() {
  if (!existsSync(AUDIO_DIR)) {
    mkdirSync(AUDIO_DIR, { recursive: true });
  }
}

// ─── TTS generation ────────────────────────────────────────────

export interface TTSOptions {
  /** Speed as percentage (e.g., 1.0 = normal, 1.2 = 20% faster) */
  rate?: number;
  /** Volume as percentage (e.g., 1.0 = normal, 1.5 = 50% louder) */
  volume?: number;
}

/**
 * Generate narration audio for a script with the given character voice.
 *
 * @param script - The full narration text to speak
 * @param characterKey - Character key ("ian", "mbappe", "lisa", etc.)
 * @param options - Optional TTS settings
 * @returns The public URL path to the generated MP3, or null on failure
 */
export async function generateNarration(
  script: string,
  characterKey: string,
  options?: TTSOptions,
): Promise<string | null> {
  const { voice, label } = getVoice(characterKey);
  const rate = options?.rate ?? 1.0;
  const volume = options?.volume ?? 1.0;

  // Create a unique filename from the first 60 chars of the script
  const hash = Buffer.from(script.slice(0, 60)).toString("base64url").slice(0, 30);
  const filename = `narration_${characterKey}_${hash}.mp3`;
  const outPath = join(AUDIO_DIR, filename);

  // Skip if already generated
  if (existsSync(outPath)) {
    console.log(`[TTS] Cache hit: ${filename}`);
    return `/audio/${filename}`;
  }

  ensureDir();

  try {
    const rateArg = `--rate=${rate >= 1 ? "+" : ""}${Math.round((rate - 1) * 100)}%`;
    const volumeArg = `--volume=${volume >= 1 ? "+" : ""}${Math.round((volume - 1) * 100)}%`;

    const cmd = [
      "edge-tts",
      `--text`, JSON.stringify(script),
      `--voice`, voice,
      rateArg,
      volumeArg,
      `--write-media`, outPath,
    ].join(" ");

    console.log(`[TTS] Generating with ${label} (${voice})...`);
    execSync(cmd, { timeout: 60_000 });
    console.log(`[TTS] Done: ${filename}`);

    return `/audio/${filename}`;
  } catch (err) {
    console.error("[TTS] Failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Estimate the speech duration in seconds for a given text.
 * Rough heuristic: ~4 words per second for Indonesian.
 */
export function estimateSpeechDuration(text: string): number {
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / 4);
}

/**
 * Get available voice name for a character key.
 */
export function getVoiceName(characterKey: string): string {
  return getVoice(characterKey).label;
}
