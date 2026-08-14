/**
 * YouTube Link Audit Script
 * Validates all YouTube URLs in youtube-smp7.ts and youtube-sma11.ts
 * Checks: URL validity, video availability, topic alignment
 */

import { YOUTUBE_SMP7 } from "./src/data/youtube-smp7";
import { YOUTUBE_SMA11 } from "./src/data/youtube-sma11";

interface AuditResult {
  title: string;
  url: string;
  topic: string;
  status: "ok" | "error" | "mismatch";
  message: string;
  videoId?: string;
}

// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Verify URL via YouTube oEmbed API
async function verifyOembed(videoId: string): Promise<{ ok: boolean; title?: string; channel?: string }> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false };
    const data = await res.json() as { title?: string; author_name?: string };
    return { ok: true, title: data.title, channel: data.author_name };
  } catch {
    return { ok: false };
  }
}

// Keywords that indicate topic mismatch
const MISMATCH_KEYWORDS: Record<string, string[]> = {
  "Ilmu Sains": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Zat dan Perubahan": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Suhu dan Kalor": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Gerak dan Gaya": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Makhluk Hidup": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Ekologi": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Bumi dan Tata Surya": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Jelajah Nusantara": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Dunia Imajinasi": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Hal Baik bagi Tubuh": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Pelindung Bumi": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Bilangan": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Aljabar": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Persamaan": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Perbandingan": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Aritmatika Sosial": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Bangun Datar": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Statistika": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Ruang dan Interaksi": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Interaksi Sosial": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Keragaman Budaya": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Peninggalan Sejarah": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Ekonomi IPS": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Berpikir Komputasional": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Algoritma Informatika": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Internet": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Keamanan": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Dampak Sosial": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Pancasila": ["kelas 8", "kelas 9", "kelas 10", "kelas 12"],
  "Fungsi": ["kelas 10", "kelas 12", "kelas 7", "kelas 8", "kelas 9"],
  "Polinomial": ["kelas 10", "kelas 12", "kelas 7", "kelas 8", "kelas 9"],
  "Trigonometri": ["kelas 10", "kelas 12", "kelas 7", "kelas 8", "kelas 9"],
  "Limit": ["kelas 10", "kelas 12", "kelas 7", "kelas 8", "kelas 9"],
  "Turunan": ["kelas 10", "kelas 12", "kelas 7", "kelas 8", "kelas 9"],
  "Integral": ["kelas 10", "kelas 12", "kelas 7", "kelas 8", "kelas 9"],
  "Matriks": ["kelas 10", "kelas 12", "kelas 7", "kelas 8", "kelas 9"],
  "Vektor": ["kelas 10", "kelas 12", "kelas 7", "kelas 8", "kelas 9"],
};

function checkTopicMismatch(title: string, topic: string): string | null {
  const badKeywords = MISMATCH_KEYWORDS[topic] || [];
  for (const kw of badKeywords) {
    if (title.toLowerCase().includes(kw.toLowerCase())) {
      return `Title mentions "${kw}" but topic is "${topic}"`;
    }
  }
  return null;
}

async function auditDataset(
  data: typeof YOUTUBE_SMP7,
  datasetName: string
): Promise<{ results: AuditResult[]; summary: Record<string, number> }> {
  const results: AuditResult[] = [];
  const summary = { total: 0, ok: 0, error: 0, mismatch: 0 };

  for (const item of data) {
    summary.total++;
    const videoId = extractVideoId(item.url);
    const result: AuditResult = {
      title: item.title,
      url: item.url,
      topic: item.topic,
      status: "ok",
      message: "OK",
      videoId: videoId || undefined,
    };

    if (!videoId) {
      result.status = "error";
      result.message = "Could not extract video ID from URL";
      summary.error++;
    } else {
      // Verify with oEmbed
      const oembed = await verifyOembed(videoId);
      if (!oembed.ok) {
        result.status = "error";
        result.message = "Video unavailable or private";
        summary.error++;
      } else {
        // Check topic mismatch in title
        const mismatchReason = checkTopicMismatch(item.title, item.topic);
        if (mismatchReason) {
          result.status = "mismatch";
          result.message = mismatchReason;
          summary.mismatch++;
        } else {
          summary.ok++;
        }
      }
    }

    results.push(result);

    // Rate limit: 5 requests/sec max for oEmbed
    await new Promise((r) => setTimeout(r, 200));
  }

  return { results, summary };
}

async function main() {
  console.log("=".repeat(80));
  console.log("YOUTUBE LINK AUDIT — SMP/SMA Mapping");
  console.log("=".repeat(80));

  // Audit SMP7
  console.log("\n[1/2] Auditing SMP Kelas 7...");
  const { results: smpResults, summary: smpSummary } = await auditDataset(
    YOUTUBE_SMP7,
    "SMP Kelas 7"
  );

  console.log(`\n  Total links checked: ${smpSummary.total}`);
  console.log(`  OK: ${smpSummary.ok} | Errors: ${smpSummary.error} | Mismatches: ${smpSummary.mismatch}`);

  if (smpSummary.error > 0 || smpSummary.mismatch > 0) {
    console.log("\n  ISSUES FOUND:");
    smpResults
      .filter((r) => r.status !== "ok")
      .forEach((r) => {
        const icon = r.status === "error" ? "❌" : "⚠️";
        console.log(`  ${icon} [${r.topic}] ${r.message}`);
        console.log(`     Title: ${r.title}`);
        console.log(`     URL: ${r.url}`);
      });
  }

  // Audit SMA11
  console.log("\n[2/2] Auditing SMA Kelas 11...");
  const { results: smaResults, summary: smaSummary } = await auditDataset(
    YOUTUBE_SMA11,
    "SMA Kelas 11"
  );

  console.log(`\n  Total links checked: ${smaSummary.total}`);
  console.log(`  OK: ${smaSummary.ok} | Errors: ${smaSummary.error} | Mismatches: ${smaSummary.mismatch}`);

  if (smaSummary.error > 0 || smaSummary.mismatch > 0) {
    console.log("\n  ISSUES FOUND:");
    smaResults
      .filter((r) => r.status !== "ok")
      .forEach((r) => {
        const icon = r.status === "error" ? "❌" : "⚠️";
        console.log(`  ${icon} [${r.topic}] ${r.message}`);
        console.log(`     Title: ${r.title}`);
        console.log(`     URL: ${r.url}`);
      });
  }

  // Grand summary
  const grandTotal = smpSummary.total + smaSummary.total;
  const grandOk = smpSummary.ok + smaSummary.ok;
  const grandError = smpSummary.error + smaSummary.error;
  const grandMismatch = smpSummary.mismatch + smaSummary.mismatch;

  console.log("\n" + "=".repeat(80));
  console.log("GRAND SUMMARY");
  console.log("=".repeat(80));
  console.log(`  Total links checked: ${grandTotal}`);
  console.log(`  ✅ Valid & Matched: ${grandOk} (${((grandOk / grandTotal) * 100).toFixed(1)}%)`);
  console.log(`  ❌ Errors (dead/private): ${grandError}`);
  console.log(`  ⚠️  Topic mismatches: ${grandMismatch}`);
  console.log("=".repeat(80));

  // Exit code based on issues
  process.exit(grandError > 0 ? 1 : 0);
}

main().catch(console.error);
