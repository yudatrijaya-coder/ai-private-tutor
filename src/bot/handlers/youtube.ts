/**
 * YouTube handler for the bot.
 *
 * Three features:
 * 1. [VIDEOS:topic] — Promote curated YouTube links from our database.
 *    Automatically tries to fetch transcript for the first video and offers explanation.
 * 2. [YOUTUBE:VIDEO_ID] — Summarize a YouTube video (student shares link).
 *    Fetches transcript and explains via LLM.
 * 3. Auto-summary in [VIDEOS] — When promoting, also offers to explain the content.
 */

import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { callLLM } from "@/llm/client";
import { getPersona } from "../personas";
import { prisma } from "@/lib/prisma";
import { getYouTubeForTopic } from "@/data/youtube";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://senangbelajar.web.id";

function getGradeName(grade?: string | null): string {
  const map: Record<string, string> = { SD_5: "SD Kelas 5", SMP_1: "SMP Kelas 1 (Kurikulum Merdeka)", SMA_2: "SMA Kelas 2 (Kurikulum Merdeka)" };
  return map[grade ?? ""] ?? grade ?? "SD Kelas 5";
}

/**
 * Extract video ID from various YouTube URL formats.
 */
function extractVideoId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * Fetch transcript from internal API.
 */
async function fetchTranscriptText(videoId: string): Promise<{ transcript: string; title: string } | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/youtube/transcript`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}` }),
    });
    const data = await response.json() as { ok: boolean; transcript?: string; title?: string };
    if (data.ok && data.transcript) {
      return { transcript: data.transcript, title: data.title ?? "Video YouTube" };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Handle video recommendation request.
 * Called when the LLM outputs [VIDEOS:topic].
 *
 * Shows curated videos AND auto-tries to fetch transcript for the first one.
 * If transcript available → offers to explain right away.
 */
export async function handleVideoRecommendation(
  ctx: Context,
  student: Student,
  topic: string,
): Promise<void> {
  const persona = getPersona(student.persona);

  // Look up videos from curated database
  const videos = getYouTubeForTopic(topic, topic, student.gradeLevel ?? undefined);

  // Try broader search if no matches
  const allVideos = videos.length > 0 ? videos : getYouTubeForTopic(topic, topic, undefined);

  if (allVideos.length === 0) {
    await ctx.reply(
      `${persona.emoji} Hmm, aku belum punya video tentang *${topic}* nih. Tapi aku bisa jelasin langsung kok! Ada topik lain yang mau ditanyakan? 😊`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // Show videos
  const lines = allVideos.slice(0, 3).map((v, i) =>
    `${i + 1}. *${v.title}*\n   🔗 ${v.url}\n   📺 ${v.channel}`
  );
  const gradeLabel = getGradeName(student.gradeLevel);

  // Try to auto-fetch transcript for the FIRST video
  const firstVideo = allVideos[0];
  const firstVideoId = extractVideoId(firstVideo.url);

  let transcriptData: { transcript: string; title: string } | null = null;
  if (firstVideoId) {
    transcriptData = await fetchTranscriptText(firstVideoId);
  }

  if (transcriptData) {
    // We got transcript! Offer explanation right away
    const transcript = transcriptData.transcript;
    const title = transcriptData.title;

    // Log
    prisma.chatLog.create({
      data: {
        studentId: student.id,
        role: "system",
        content: `[VIDEOS] Auto-fetched transcript for ${firstVideoId} (${title}), length=${transcript.length} chars`,
        source: "telegram",
      },
    }).catch(() => {});

    // Generate explanation using LLM
    const maxTranscriptLen = 8000;
    const trimmedTranscript = transcript.length > maxTranscriptLen
      ? transcript.substring(0, maxTranscriptLen) + "\n\n[...bersambung]"
      : transcript;

    const systemPrompt = `Kamu adalah ${persona.displayName}, tutor ${persona.toneRules.join(" ")}.
Student: ${student.name} (${student.studentId}).
Kamu baru saja merekomendasikan video YouTube tentang *${topic}*.
Student mau kamu jelaskan isi video ini.

PENJELASAN:
- Judul video: ${title}
- Link: ${firstVideo.url}

Gaya ngomong: ${persona.toneRules.join(", ")}

FORMAT:
1. Langsung ke penjelasan — ga usah preamble
2. Bisa sebut "Oh iya, di video ${title} dijelaskan..."
3. Sampaikan poin-poin utama dari video
4. Tambah contoh biar jelas
5. Akhiri dengan tanya paham

TRANSCRIPT VIDEO:
${trimmedTranscript}

Jelaskan isi video ini dengan bahasa yang seru!`;

    const explanation = await callLLM("tutor", [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Jelaskan isi video tentang ${topic}: ${title}` },
    ], { studentId: student.id });

    // Send videos + explanation combined
    await ctx.reply(
      `📹 *Rekomendasi Video* — *${topic}*\n\n` +
      `Cocok buat ${gradeLabel}!\n\n` +
      `${lines.join("\n\n")}\n\n`,
      { parse_mode: "Markdown" }
    );

    if (explanation) {
      await ctx.reply(
        `${persona.emoji} *Penjelasan dari video ${title}:*\n\n${explanation}`
      );
    } else {
      const summary = transcript.length > 500
        ? transcript.substring(0, 500) + "..."
        : transcript;
      await ctx.reply(
        `📖 *Ringkasan video ${title}:*\n\n${summary}\n\nAda yang mau ditanyakan? 😊`,
        { parse_mode: "Markdown" }
      );
    }
  } else {
    // No transcript available — just show video links
    await ctx.reply(
      `📹 *Rekomendasi Video* — *${topic}*\n\n` +
      `Cocok buat ${gradeLabel}!\n\n${lines.join("\n\n")}\n\n` +
      `${persona.emoji} Tonton ya! Sayangnya video ini belum ada captionnya, jadi aku belum bisa jelasin isinya. Tapi kalau ada topik yang mau ditanyain, bilang aja!`,
      { parse_mode: "Markdown" },
    );
  }
}

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

    prisma.chatLog.create({
      data: {
        studentId: student.id,
        role: "system",
        content: `[YOUTUBE] Fetched transcript for ${videoId} (${title}), source=${data.source}, length=${transcript.length} chars`,
        source: "telegram",
      },
    }).catch(() => {});

    const maxTranscriptLen = 8000;
    const trimmedTranscript = transcript.length > maxTranscriptLen
      ? transcript.substring(0, maxTranscriptLen) + "\n\n[...bersambung]"
      : transcript;

    const systemPrompt = `Kamu adalah ${persona.displayName}, tutor ${persona.toneRules.join(" ")}.
Student: ${student.name} (${student.studentId}).
Seorang student mengirim link video YouTube dan kamu harus menjelaskan isi video tersebut dengan bahasa yang mudah dipahami.

Gaya ngomong: ${persona.toneRules.join(", ")}

FORMAT JAWABAN:
1. Langsung ke penjelasan — ga usah preamble
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
