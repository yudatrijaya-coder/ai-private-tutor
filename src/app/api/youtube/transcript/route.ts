/**
 * POST /api/youtube/transcript
 *
 * Get YouTube video transcript for summarization.
 * Uses youtube-transcript npm package (works from server).
 *
 * Returns: { ok, transcript, videoId, title, source }
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchTranscript } from "youtube-transcript";

const rateLimits = new Map<string, number[]>();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimits.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW);
  recent.push(now);
  rateLimits.set(ip, recent);
  return recent.length <= RATE_LIMIT;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as { url: string };
    const videoUrl = body?.url?.trim();

    if (!videoUrl) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    // Try fetching transcript (auto-detect language first)
    const result = await getTranscript(videoId);
    if (result) {
      return NextResponse.json({
        ok: true,
        transcript: result.text,
        videoId,
        title: result.title,
        source: result.source,
      });
    }

    return NextResponse.json({
      ok: false,
      error: "Video ini tidak memiliki subtitle/transcript.",
      note: "Banyak video edukasi Indonesia belum dilengkapi caption. Tanya langsung aja topiknya ke tutor!",
    });
  } catch (err) {
    console.error("[youtube/transcript] Error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function getTranscript(
  videoId: string,
): Promise<{ text: string; title: string; source: string } | null> {
  // Try languages in order of preference
  const langs = ["id", "en", "es", undefined]; // undefined = auto-detect

  for (const lang of langs) {
    try {
      const segments = await fetchTranscript(videoId, lang ? { lang } : undefined);

      if (!segments || segments.length === 0) continue;

      const text = segments
        .map((s: { text: string }) => s.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .replace(/\[.*?\]/g, "") // remove sound effects like [Music]
        .trim();

      if (text.length < 20) continue;

      return {
        text,
        title: "Video YouTube",
        source: `subtitle-${lang ?? "auto"}`,
      };
    } catch {
      // Try next language
    }
  }

  return null;
}
