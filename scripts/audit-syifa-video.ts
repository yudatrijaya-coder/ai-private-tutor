/**
 * Audit all YouTube videoUrls for SYIFA001 (SD_5).
 * Uses oEmbed to verify video title/grade.
 * Reports grade mismatches and wrong content.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { writeFileSync } from "fs";

const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432"),
  database: process.env.PGDATABASE || "ai_private_tutor",
  user: process.env.PGUSER || "tutor",
  password: process.env.PGPASSWORD || "tutor123",
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const TARGET_GRADE = "SD_5";
const OUTPUT_FILE = "/tmp/syifa-video-audit.json";

interface AuditResult {
  materialId: string;
  subTopic: string;
  subject: string;
  videoUrl: string | null;
  videoTitle: string | null;
  grade: string | null;
  status: "ok" | "wrong_grade" | "dead" | "no_video" | "error";
  notes: string;
}

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function fetchOEmbed(videoId: string): Promise<{ title: string } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    return await res.json() as { title: string };
  } catch {
    return null;
  }
}

function inferGrade(title: string): string {
  const t = title.toLowerCase();
  if (/kelas\s*4\s*sd| kelas ?4 /i.test(t)) return "SD_4";
  if (/kelas\s*5\s*sd| kelas ?5 /i.test(t)) return "SD_5";
  if (/kelas\s*6\s*sd| kelas ?6 /i.test(t)) return "SD_6";
  if (/kelas\s*7\s*smp| kelas ?7 /i.test(t)) return "SMP_1";
  if (/kelas\s*8\s*smp| kelas ?8 /i.test(t)) return "SMP_2";
  if (/kelas\s*9\s*smp| kelas ?9 /i.test(t)) return "SMP_3";
  if (/kelas\s*(10|sepuluh)\s*sma| kelas ?10 /i.test(t)) return "SMA_1";
  if (/kelas\s*(11|sebelas)\s*sma| kelas ?11 /i.test(t)) return "SMA_2";
  if (/kelas\s*(12|duabelas)\s*sma| kelas ?12 /i.test(t)) return "SMA_3";
  if (/kelas\s*1\s*sd| kelas ?1 /i.test(t)) return "SD_1";
  if (/kelas\s*2\s*sd| kelas ?2 /i.test(t)) return "SD_2";
  if (/kelas\s*3\s*sd| kelas ?3 /i.test(t)) return "SD_3";
  if (/SMA|SMK|MA|Kelas\s*(10|11|12)|SMA/i.test(t)) return "SMA";
  if (/SMP|MTs|Kelas\s*(7|8|9)/i.test(t)) return "SMP";
  if (/SD|MI|Kelas\s*(1|2|3|4|5|6)/i.test(t)) return "SD";
  return "unknown";
}

async function main() {
  // Get all SYIFA materials with their metadata.videoUrl
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT m.id, m.subject, m.topic, m."subTopic", m.metadata
    FROM "Material" m
    JOIN "Curriculum" c ON c.id = m."curriculumId"
    JOIN "Student" s ON s.id = c."studentId"
    WHERE s."studentId" = 'SYIFA001'
    ORDER BY m.subject, m.topic, m."subTopic"
  `);

  const results: AuditResult[] = [];
  let processed = 0;
  const total = rows.length;

  console.log(`Auditing ${total} materials for SYIFA...`);

  for (const row of rows) {
    processed++;
    const videoUrl = row.metadata?.videoUrl || null;
    const result: AuditResult = {
      materialId: row.id,
      subTopic: row.subTopic,
      subject: row.subject,
      videoUrl,
      videoTitle: null,
      grade: null,
      status: "no_video",
      notes: "",
    };

    if (!videoUrl) {
      result.status = "no_video";
      result.notes = "Tidak ada videoUrl di metadata";
      results.push(result);
      continue;
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      result.status = "error";
      result.notes = "Tidak bisa parse video ID";
      results.push(result);
      continue;
    }

    // Rate limit: 5 requests/sec to YouTube oEmbed
    const oembed = await fetchOEmbed(videoId);
    await new Promise(r => setTimeout(r, 200));

    if (!oembed) {
      result.status = "dead";
      result.notes = "Video tidak bisa diakses / private / deleted";
      results.push(result);
      continue;
    }

    result.videoTitle = oembed.title;
    const inferredGrade = inferGrade(oembed.title);
    result.grade = inferredGrade;

    if (inferredGrade === "SD_5") {
      result.status = "ok";
      result.notes = "Grade sesuai SD_5";
    } else if (inferredGrade === "SD" || inferredGrade === "unknown") {
      result.status = "ok";
      result.notes = `Grade umum (${inferredGrade}), tidak terdeteksi salah`;
    } else {
      result.status = "wrong_grade";
      result.notes = `Video untuk grade ${inferredGrade}, seharusnya SD_5`;
    }

    results.push(result);

    if (processed % 20 === 0) {
      console.log(`Progress: ${processed}/${total}`);
    }
  }

  // Summary
  const summary = {
    total,
    ok: results.filter(r => r.status === "ok").length,
    wrong_grade: results.filter(r => r.status === "wrong_grade").length,
    dead: results.filter(r => r.status === "dead").length,
    no_video: results.filter(r => r.status === "no_video").length,
    error: results.filter(r => r.status === "error").length,
  };

  const wrongGrade = results.filter(r => r.status === "wrong_grade");
  const noVideo = results.filter(r => r.status === "no_video");

  console.log("\n=== AUDIT SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));

  if (wrongGrade.length > 0) {
    console.log("\n=== WRONG GRADE VIDEOS ===");
    for (const r of wrongGrade) {
      console.log(`[${r.subject}] ${r.subTopic}`);
      console.log(`  Video: ${r.videoTitle}`);
      console.log(`  Grade detected: ${r.grade}`);
      console.log(`  URL: ${r.videoUrl}`);
    }
  }

  if (noVideo.length > 0) {
    console.log(`\n=== NO VIDEO (${noVideo.length}) ===`);
    for (const r of noVideo.slice(0, 10)) {
      console.log(`  [${r.subject}] ${r.subTopic}`);
    }
    if (noVideo.length > 10) console.log(`  ... and ${noVideo.length - 10} more`);
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify({ summary, results, auditedAt: new Date().toISOString() }, null, 2));
  console.log(`\nFull report: ${OUTPUT_FILE}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async e => {
  console.error("Fatal:", e);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
