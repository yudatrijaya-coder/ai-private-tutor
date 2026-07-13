/**
 * YouTube handler for the bot.
 *
 * Two features:
 * 1. [VIDEOS:topic] — Promote curated YouTube links from our database.
 *    Called when the tutor wants to recommend a video about a topic.
 * 2. [YOUTUBE:VIDEO_ID] — Summarize a YouTube video (student shares link).
 *    Fetches transcript and explains via LLM.
 */

import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { callLLM } from "@/llm/client";
import { getPersona } from "../personas";
import { prisma } from "@/lib/prisma";
import { getYouTubeForTopic } from "@/data/youtube";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://senangbelajar.web.id";

/**
 * Map grade level to display name
 */
function getGradeName(grade?: string | null): string {
  const map: Record<string, string> = {
    SD_5: "SD Kelas 5",
    SMP_1: "SMP Kelas 1 (Kurikulum Merdeka)",
    SMA_2: "SMA Kelas 2 (Kurikulum Merdeka)",
  };
  return map[grade ?? ""] ?? grade ?? "SD Kelas 5";
}

/**
 * Handle video recommendation request.
 * Called when the LLM outputs [VIDEOS:topic].
 *
 * Looks up curated videos from our database and sends them to the student.
 */
export async function handleVideoRecommendation(
  ctx: Context,
  student: Student,
  topic: string,
): Promise<void> {
  const persona = getPersona(student.persona);

  // Look up videos from our curated database
  const videos = getYouTubeForTopic(
    topic,
    topic,
    student.gradeLevel ?? undefined,
  );

  // If no exact match, try broader search by subject
  if (videos.length === 0) {
    // Try searching all grades
    const allVideos = getYouTubeForTopic(topic, topic, undefined);
    if (allVideos.length > 0) {
      // Found in other grades — show anyway
      const lines = allVideos.slice(0, 5).map((v, i) =>
        `${i + 1}. *${v.title}*\n   🔗 ${v.url}\n   📺 ${v.channel}`
      );
      await ctx.reply(
        `📹 *Video Rekomendasi* tentang *${topic}*\\n\\n` +
        `${lines.join("\\n\\n")}\\n\\n` +
        `${persona.emoji} Tonton ya, seru loh! Kalau ada yang mau ditanyain, bilang aja!`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    await ctx.reply(
      `${persona.emoji} Hmm, aku belum punya video tentang *${topic}* nih. Tapi aku bisa jelasin langsung kok! ` +
      `Ada topik lain yang mau ditanyakan? 😊`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // Show up to 5 recommended videos
  const lines = videos.slice(0, 5).map((v, i) =>
    `${i + 1}. *${v.title}*\n   🔗 ${v.url}\n   📺 ${v.channel}`
  );

  const gradeLabel = getGradeName(student.gradeLevel);

  await ctx.reply(
    `📹 *Rekomendasi Video* — *${topic}*\\n\\n` +
    `Cocok buat ${gradeLabel}! Langsung tonton aja:\\n\\n` +
    `${lines.join("\\n\\n")}\\n\\n` +
    `${persona.emoji} Seru kan? Kalau ada bagian yang kurang paham, tanya aja ya!`,
    { parse_mode: "Markdown" },
  );
}

/**
 * Handle YouTube video summarization request.
 * Called when the LLM outputs [YOUTUBE:VIDEO_ID].
 *
 * Fetches transcript and explains it via LLM.
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
