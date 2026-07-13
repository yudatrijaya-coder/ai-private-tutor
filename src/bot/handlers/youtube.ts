/**
 * YouTube summary handler for the bot.
 *
 * When a student shares a YouTube link, this handler:
 * 1. Fetches the transcript via /api/youtube/transcript
 * 2. Feeds the transcript to LLM for summarization/explanation
 * 3. Sends the explanation back to the student
 */

import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { callLLM } from "@/llm/client";
import { getPersona } from "../personas";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://senangbelajar.web.id";

/**
 * Handle YouTube video summarization request.
 * Called when the LLM outputs [YOUTUBE:VIDEO_ID].
 */
export async function handleYoutubeSummary(
  ctx: Context,
  student: Student,
  videoId: string,
): Promise<void> {
  const persona = getPersona(student.persona);
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    await ctx.reply(`${persona.emoji} Baik, aku ambil dulu ringkasan videonya ya... ⏳`);

    // Fetch transcript via internal API
    const response = await fetch(`${BASE_URL}/api/youtube/transcript`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: videoUrl }),
    });

    const data = await response.json() as {
      ok: boolean;
      transcript?: string;
      title?: string;
      source?: string;
      note?: string;
      error?: string;
    };

    if (!data.ok || !data.transcript) {
      await ctx.reply(
        `${persona.emoji} Maaf, aku belum bisa mengambil video ini. ` +
          `${data.note ?? data.error ?? "YouTube mungkin memblokir akses."}\n\n` +
          `Coba tanya langsung aja tentang topik yang mau dipelajari ya! 😊`,
      );
      return;
    }

    const transcript = data.transcript;
    const title = data.title ?? "Video YouTube";

    // Log the transcript fetch (fire-and-forget)
    prisma.chatLog.create({
      data: {
        studentId: student.id,
        role: "system",
        content: `[YOUTUBE] Fetched transcript for ${videoId} (${title}), source=${data.source}, length=${transcript.length} chars`,
        source: "telegram",
      },
    }).catch(() => {});

    // If transcript is very long, truncate for the LLM
    const maxTranscriptLen = 8000;
    const trimmedTranscript = transcript.length > maxTranscriptLen
      ? transcript.substring(0, maxTranscriptLen) + "\n\n[...transcript dipotong karena terlalu panjang]"
      : transcript;

    // Generate explanation using LLM
    const systemPrompt = `Kamu adalah ${persona.displayName}, tutor ${persona.toneRules.join(" ")}. 
Student: ${student.name} (${student.studentId}).
Seorang student mengirim link video YouTube dan kamu harus menjelaskan isi video tersebut dengan bahasa yang mudah dipahami.

Gaya ngomong: ${persona.toneRules.join(", ")}

FORMAT JAWABAN:
1. Langsung ke penjelasan — ga usah preamble "Baik, saya jelaskan..."
2. Judul video di bold
3. Jelaskan poin-poin utama dari video dengan bahasa sederhana
4. Tambah contoh nyata biar ga abstrak
5. Akhiri dengan tanya apakah mereka paham atau ada yang mau ditanya lagi

Video: ${title}
Link: ${videoUrl}

TRANSCRIPT:
${trimmedTranscript}

Jelaskan isi video ini dengan bahasa yang asyik dan mudah dipahami!`;

    const explanation = await callLLM("tutor", [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Jelaskan isi video YouTube ini: ${title}` },
    ], { studentId: student.id });

    if (explanation) {
      await ctx.reply(explanation);
    } else {
      // Fallback: send raw transcript summary
      const summary = transcript.length > 500
        ? transcript.substring(0, 500) + "..."
        : transcript;
      await ctx.reply(
        `📹 *${title}*\n\n` +
        `Berikut ringkasan dari video:\n\n${summary}\n\n` +
        `Tanya aja kalau ada yang mau didiskusikan! 😊`,
        { parse_mode: "Markdown" },
      );
    }
  } catch (err) {
    console.error("[youtube/handler] Error:", err);
    await ctx.reply(
      `${persona.emoji} Maaf, ada kendala teknis waktu ambil video. ` +
      `Coba kirim link-nya lagi atau tanya langsung aja ya! 🙏`,
    );
  }
}
