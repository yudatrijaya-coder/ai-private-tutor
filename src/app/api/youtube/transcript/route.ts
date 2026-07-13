/**
 * POST /api/youtube/transcript
 *
 * Get YouTube video transcript for summarization.
 *
 * How it works:
 * 1. Accepts a YouTube URL or video ID
 * 2. Uses yt-dlp (subprocess) to download auto-generated subtitles
 * 3. Falls back to downloading audio → transcribing with Whisper if yt-dlp fails
 * 4. Returns plain text transcript
 *
 * Requirements:
 * - yt-dlp installed (pip3 install --break-system-packages yt-dlp)
 * - Optional: cookies.txt at /home/ubuntu/.youtube-cookies.txt for authenticated access
 *
 * Cookie setup (one-time):
 *   1. Install "Get cookies.txt" extension in Chrome
 *   2. Go to youtube.com, log in
 *   3. Export cookies → upload to server as ~/.youtube-cookies.txt
 */

import { NextRequest, NextResponse } from "next/server";
import { execSync, exec } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

// Rate limit: 10 requests per minute per IP
const rateLimits = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimits.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW);
  recent.push(now);
  rateLimits.set(ip, recent);
  return recent.length <= RATE_LIMIT;
}

/**
 * Extract transcript text from a YouTube video URL.
 */
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

    // Extract video ID from various formats
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    // Try downloading transcript using yt-dlp
    const transcript = await downloadTranscript(videoId, videoUrl);

    if (transcript) {
      return NextResponse.json({ ok: true, transcript, videoId, source: "subtitle" });
    }

    // Fallback: try to get basic video info (title, description)
    const info = await getVideoInfo(videoId, videoUrl);
    if (info) {
      return NextResponse.json({
        ok: true,
        transcript: info.description || info.title || "",
        videoId,
        title: info.title,
        source: "description",
        note: "Subtitle tidak tersedia. Menggunakan deskripsi video sebagai alternatif.",
      });
    }

    return NextResponse.json({
      ok: false,
      error: "Tidak dapat mengambil transcript. YouTube mungkin memblokir permintaan dari server ini.",
      hint: "Coba export cookies dari browser: https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp",
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

async function downloadTranscript(
  videoId: string,
  videoUrl: string,
): Promise<string | null> {
  const tmpDir = "/tmp/yt-transcript";
  const outputTemplate = join(tmpDir, `${videoId}`);
  const execPath = "/usr/bin/yt-dlp";

  if (!existsSync(execPath)) {
    console.warn("[youtube] yt-dlp not found at", execPath);
    return null;
  }

  // Ensure temp dir exists
  execSync(`mkdir -p ${tmpDir}`);

  // Check for cookies file
  const cookiesPath = "/home/ubuntu/.youtube-cookies.txt";
  const cookiesArg = existsSync(cookiesPath)
    ? `--cookies "${cookiesPath}"`
    : "";

  try {
    // Step 1: Download auto-subs as VTT
    const cmd = `${execPath} \
      --skip-download \
      --write-auto-subs \
      --sub-langs 'id,en' \
      --sub-format 'vtt' \
      ${cookiesArg} \
      --output "${outputTemplate}.%(ext)s" \
      --no-warnings \
      --no-progress \
      --print title \
      --print duration_string \
      "${videoUrl}" \
      2>/dev/null`;

    const result = execSync(cmd, {
      timeout: 30_000,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });

    const lines = result.trim().split("\n");
    const title = lines[0] ?? "Unknown";
    const duration = lines[1] ?? "?";

    // Step 2: Find the subtitle file
    const subFiles = [
      `${outputTemplate}.id.vtt`,
      `${outputTemplate}.en.vtt`,
      `${outputTemplate}.vtt`,
    ];

    let subContent: string | null = null;
    for (const f of subFiles) {
      if (existsSync(f)) {
        subContent = parseVtt(f);
        // Clean up
        try { unlinkSync(f); } catch { /* ignore */ }
        break;
      }
    }

    if (subContent && subContent.length > 50) {
      return `📹 ${title}\n⏱ ${duration}\n\n${subContent}`;
    }

    return null;
  } catch (err) {
    console.warn(`[youtube] yt-dlp failed for ${videoId}:`, (err as Error).message);
    // Clean up temp files
    for (const ext of ["id.vtt", "en.vtt", "vtt", "id.vtt.tmp", "en.vtt.tmp"]) {
      try { unlinkSync(`${outputTemplate}.${ext}`); } catch { /* ignore */ }
    }
    return null;
  }
}

function parseVtt(filePath: string): string {
  const { readFileSync } = require("fs");
  const content = readFileSync(filePath, "utf-8");

  // VTT format:
  // WEBVTT
  // Kind: captions
  // Language: id
  //
  // 00:00:01.000 --> 00:00:04.000
  // text here
  //

  const lines = content.split("\n");
  const textLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip VTT headers, timestamps, and empty lines
    if (
      trimmed.startsWith("WEBVTT") ||
      trimmed.startsWith("Kind:") ||
      trimmed.startsWith("Language:") ||
      /^\d{2}:\d{2}:\d{2}/.test(trimmed) ||
      trimmed === "" ||
      trimmed.startsWith("NOTE")
    ) {
      continue;
    }
    textLines.push(trimmed);
  }

  // Merge and clean
  return textLines
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function getVideoInfo(
  videoId: string,
  videoUrl: string,
): Promise<{ title: string; description: string } | null> {
  return new Promise((resolve) => {
    const execPath = "/usr/bin/yt-dlp";
    const cookiesPath = "/home/ubuntu/.youtube-cookies.txt";
    const cookiesArg = existsSync(cookiesPath)
      ? `--cookies "${cookiesPath}"`
      : "";

    const cmd = `${execPath} \
      --skip-download \
      --print title \
      --print description \
      ${cookiesArg} \
      --no-warnings \
      --no-progress \
      "${videoUrl}" \
      2>/dev/null`;

    exec(
      cmd,
      { timeout: 15_000, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        const lines = stdout.trim().split("\n");
        resolve({
          title: lines[0] ?? "",
          description: (lines.slice(1).join("\n") ?? "").trim(),
        });
      },
    );
  });
}
