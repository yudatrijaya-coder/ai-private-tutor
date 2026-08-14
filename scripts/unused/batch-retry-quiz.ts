/**
 * Retry failed quiz generation — re-generates the 22 items that failed in batch 1.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import OpenAI from "openai";
import { writeFileSync, appendFileSync } from "fs";

const PG = {
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432"),
  database: process.env.PGDATABASE || "ai_private_tutor",
  user: process.env.PGUSER || "tutor",
  password: process.env.PGPASSWORD || "tutor123",
};

const prisma = new PrismaClient({ adapter: new PrismaPg(new pg.Pool(PG)) });
const llm = new OpenAI({ baseURL: "http://localhost:20128/v1", apiKey: "sk-9router" });

const PROGRESS_FILE = "/tmp/quiz-retry-progress.txt";
const LOG_FILE = "/tmp/quiz-retry-log.json";

interface Q { question: string; options: string[]; correctIndex: number; difficulty: string; explanation: string; }

const FAILED_ITEMS = [
  "Unsur Puisi Rakyat",
  "Menyajikan Teks Deskripsi",
  "Unsur Bahasa dalam Teks Deskripsi",
  "Teks Berita",
  "Unsur dan Jenis Puisi Rakyat",
  "Unsur-Unsur Berita",
  "Describing Family Members",
  "Algoritma dan Pemrograman",
  "Dasar-Dasar Algoritma dan Flowchart",
  "Definisi dan Ruang Lingkup Informatika",
  "Hakikat Ilmu Sains",
  "Klasifikasi Makhluk Hidup",
  "Besaran dan Pengukuran",
  "Kerajaan Hindu-Buddha di Indonesia",
  "Lambang Unsur dan Tabel Periodik",
  "Tantangan Keberagaman",
  "Penerapan Norma",
  "Nilai-Nilai Pancasila",
  "Konsep Gerak",
  "Latihan Kebugaran",
  "Peran dalam Tim",
  "Bulu Tangkis",
];

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
  appendFileSync(PROGRESS_FILE, msg + "\n");
}

function saveProgress(current: number, total: number, status: string, item: string) {
  const data = { current, total, status, item, updatedAt: new Date().toISOString() };
  writeFileSync(LOG_FILE, JSON.stringify(data, null, 2));
}

async function generateQuiz(materialId: string, content: string, topic: string, subTopic: string): Promise<Q[] | null> {
  const prompt = `Buat 5 soal pilihan ganda untuk sub-topik "${subTopic}" (topik: ${topic}).

Konten materi:
${content.slice(0, 3000)}

Buat 5 soal dengan distribusi: 2 easy, 2 medium, 1 hard.
Format JSON array:
[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"difficulty":"easy","explanation":"..."}]

HANYA output JSON. Soal akurat secara ilmiah.`;

  try {
    const res = await llm.chat.completions.create({
      model: "sumopod/deepseek-v4-flash",
      messages: [
        { role: "system", content: "Anda guru profesional Indonesia. Output JSON saja." },
        { role: "user", content: prompt },
      ],
      max_tokens: 5000,
      temperature: 0.7,
    }, { timeout: 120000 });

    let text = res.choices?.[0]?.message?.content || "";
    text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    
    const parsed = JSON.parse(match[0]);
    return parsed.map((q: any) => ({
      question: q.question || "",
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : ["A", "B", "C", "D"],
      correctIndex: Number(q.correctIndex ?? 0),
      difficulty: q.difficulty || "medium",
      explanation: q.explanation || "",
    }));
  } catch (err) {
    log(`  ❌ LLM error for ${subTopic}: ${(err as Error).message?.slice(0, 100)}`);
    return null;
  }
}

async function saveQuiz(materialId: string, studentId: string, questions: Q[]) {
  await prisma.quiz.create({
    data: {
      materialId,
      studentId,
      type: "QUIZ",
      questions: questions as any,
      maxScore: questions.length * 10,
      timeLimit: null,
    },
  });
}

async function main() {
  writeFileSync(PROGRESS_FILE, `=== QUIZ RETRY STARTED ${new Date().toISOString()} ===\n`);
  
  const total = FAILED_ITEMS.length;
  log(`Retrying ${total} failed items...`);

  // Get materials for failed sub-topics
  const rows = await prisma.$queryRawUnsafe<Array<{studentId: string, materialId: string, subject: string, topic: string, content: string}>>(
    `SELECT DISTINCT ON (m."subTopic") m."subTopic", s.id as "studentId", m.id as "materialId", m.subject, m.topic, COALESCE(m."processedContent", m."rawContent") as content
     FROM "Material" m
     JOIN "Curriculum" c ON c.id = m."curriculumId"
     JOIN "Student" s ON s.id = c."studentId"
     LEFT JOIN "Quiz" q ON q."materialId" = m.id AND q."studentId" = s.id
     WHERE q.id IS NULL
       AND s."studentId" = 'RAIHAN001'
       AND m."subTopic" = ANY($1)
     ORDER BY m."subTopic"`
  , FAILED_ITEMS);

  log(`Found ${rows.length} materials to retry`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const item = rows[i];
    const idx = i + 1;
    
    if (!item.content || item.content.length < 50) {
      log(`⏭️  [${idx}/${total}] SKIP (no content): ${item.subject} > ${(item as any).subTopic || "unknown"}`);
      saveProgress(idx, total, "skip", (item as any).subTopic || "unknown");
      continue;
    }

    log(`📝 [${idx}/${total}] Retrying: ${item.subject} > ${item.subTopic}`);
    saveProgress(idx, total, "generating", item.subTopic || "unknown");

    const questions = await generateQuiz(item.materialId, item.content, item.topic, item.subTopic || "");
    
    if (!questions || questions.length < 2) {
      failed++;
      log(`❌ FAILED: ${item.subject} > ${item.subTopic}`);
      saveProgress(idx, total, "failed", item.subTopic || "unknown");
    } else {
      try {
        await saveQuiz(item.materialId, item.studentId, questions);
        success++;
        log(`✅ ${item.subject} > ${item.subTopic} (${questions.length} soal)`);
        saveProgress(idx, total, "success", item.subTopic || "unknown");
      } catch (e: any) {
        if (e.code === 'P2002') {
          success++;
          log(`⚠️  Already exists: ${item.subTopic}`);
        } else {
          failed++;
          log(`💾 ❌ DB Error: ${e.message?.slice(0, 80)}`);
        }
      }
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  const summary = `\n=== RETRY COMPLETE ===\nTotal: ${total}\nSuccess: ${success}\nFailed: ${failed}`;
  log(summary);
  saveProgress(total, total, "complete", summary);
  log("Done!");
  
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Fatal error:", e);
  await prisma.$disconnect();
  process.exit(1);
});
