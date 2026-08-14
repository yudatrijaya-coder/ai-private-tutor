/**
 * Fix missing quizzes + audit HIGH severity items.
 * Uses pg Pool directly for all raw queries (avoiding Prisma adapter issues).
 * LLM-native: generates quiz from topic/subtopic + existing content.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import OpenAI from "openai";
import { writeFileSync, appendFileSync } from "fs";

const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432"),
  database: process.env.PGDATABASE || "ai_private_tutor",
  user: process.env.PGUSER || "tutor",
  password: process.env.PGPASSWORD || "tutor123",
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const llm = new OpenAI({ baseURL: "http://localhost:20128/v1", apiKey: "local" });

const PROGRESS_FILE = "/tmp/fix-all-progress.txt";
const LOG_FILE = "/tmp/fix-all-log.json";
const AUDIT_DIR = "/home/ubuntu/ai-private-tutor/audit-reports";

interface Q {
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: string;
  explanation: string;
}

interface FixItem {
  materialId: string;
  studentId: string;
  subject: string;
  topic: string;
  subTopic: string;
  issue?: string;
  itemType: "missing_quiz" | "high_severity";
}

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
  appendFileSync(PROGRESS_FILE, msg + "\n");
}

function saveProgress(current: number, total: number, status: string, item: string) {
  const data = { current, total, status, item, updatedAt: new Date().toISOString() };
  writeFileSync(LOG_FILE, JSON.stringify(data));
}

const GRADE_MAP: Record<string, string> = {
  SD_5: "kelas 5 SD",
  SMP_1: "kelas 7 SMP",
  SMA_2: "kelas 11 SMA",
};

function gradeLabel(grade: string): string {
  return GRADE_MAP[grade] || grade;
}

async function generateQuiz(
  subject: string, topic: string, subTopic: string,
  studentGrade: string, existingContent?: string
): Promise<Q[] | null> {
  const contentHint = existingContent
    ? `Konten materi:\n${existingContent.slice(0, 2000)}`
    : "";

  const prompt = `Buat 5 soal pilihan ganda untuk sub-topik "${subTopic}" (mata pelajaran: ${subject}, topik: ${topic}, jenjang: ${gradeLabel(studentGrade)}).
${contentHint}

Soal harus akurat secara ilmiah dan sesuai tingkat ${gradeLabel(studentGrade)}.
Distribusi: 2 easy, 2 medium, 1 hard.
Format JSON array:
[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"difficulty":"easy","explanation":"..."}]

HANYA output JSON. Tidak ada teks di luar JSON.`;

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

    let text = (res.choices?.[0]?.message?.content || "").trim();
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
    log(`  ❌ LLM quiz error for ${subTopic}: ${(err as Error).message?.slice(0, 80)}`);
    return null;
  }
}

async function generateContent(
  subject: string, topic: string, subTopic: string, studentGrade: string
): Promise<string | null> {
  const prompt = `Buat konten pembelajaran untuk sub-topik "${subTopic}" (mata pelajaran: ${subject}, topik: ${topic}, jenjang: ${gradeLabel(studentGrade)}).

Konten harus:
- 3-5 paragraf penjelasan lengkap dan akurat secara ilmiah
- Sesuai kurikulum Indonesia (Kurikulum Merdeka)
- Bahasa Indonesia formal, mudah dipahami siswa
- Cantumkan contoh konkret dan istilah kunci

HANYA output konten pembelajaran, tidak perlu format khusus.`;

  try {
    const res = await llm.chat.completions.create({
      model: "sumopod/deepseek-v4-flash",
      messages: [
        { role: "system", content: "Anda guru profesional Indonesia yang menyusun materi pembelajaran." },
        { role: "user", content: prompt },
      ],
      max_tokens: 4000,
      temperature: 0.5,
    }, { timeout: 180000 });
    const text = res.choices?.[0]?.message?.content?.trim() || "";
    return text.length > 100 ? text : null;
  } catch (err) {
    log(`  ❌ LLM content error: ${(err as Error).message?.slice(0, 80)}`);
    return null;
  }
}

function getGrade(studentId: string): string {
  if (studentId.includes("SYIFA")) return "SD_5";
  if (studentId.includes("RAIHAN")) return "SMP_1";
  return "SMA_2";
}

async function getStudentDbId(studentId: string): Promise<string | null> {
  const rows = await pool.query(`SELECT id FROM "Student" WHERE "studentId" = $1 LIMIT 1`, [studentId]);
  return rows.rows[0]?.id || null;
}

async function quizExists(materialId: string, studentDbId: string): Promise<string | null> {
  const rows = await pool.query(
    `SELECT id FROM "Quiz" WHERE "materialId" = $1 AND "studentId" = $2 LIMIT 1`,
    [materialId, studentDbId]
  );
  return rows.rows[0]?.id || null;
}

async function getMaterialContent(materialId: string): Promise<string | null> {
  const rows = await pool.query(
    `SELECT COALESCE("processedContent","rawContent") as content FROM "Material" WHERE id = $1 LIMIT 1`,
    [materialId]
  );
  return rows.rows[0]?.content || null;
}

async function upsertQuiz(materialId: string, studentDbId: string, questions: Q[]) {
  // Delete existing quiz for this material+student
  await pool.query(
    `DELETE FROM "Quiz" WHERE "materialId" = $1 AND "studentId" = $2`,
    [materialId, studentDbId]
  );
  // Create new quiz
  const questionsJson = JSON.stringify(questions);
  await pool.query(
    `INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "timeLimit", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, 'QUIZ', $3::jsonb, $4, NULL, NOW(), NOW())`,
    [materialId, studentDbId, questionsJson, questions.length * 10]
  );
}

async function insertQuizNew(materialId: string, studentDbId: string, questions: Q[]) {
  const questionsJson = JSON.stringify(questions);
  await pool.query(
    `INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "timeLimit", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, 'QUIZ', $3::jsonb, $4, NULL, NOW(), NOW())`,
    [materialId, studentDbId, questionsJson, questions.length * 10]
  );
}

async function updateMaterialContent(materialId: string, content: string) {
  await pool.query(
    `UPDATE "Material" SET "processedContent" = $2, "rawContent" = $2, "updatedAt" = NOW() WHERE id = $1`,
    [materialId, content]
  );
}

async function main() {
  writeFileSync(PROGRESS_FILE, `=== FIX ALL STARTED ${new Date().toISOString()} ===\n`);

  // ===== PART 1: Missing quizzes =====
  const missingQuizzes: FixItem[] = [
    { materialId: "963460d0-9891-4a85-b787-f3a96cb19e2e", studentId: "RAIHAN001", subject: "PJOK", topic: "Permainan Bola Kecil", subTopic: "Bulu Tangkis", itemType: "missing_quiz" },
    { materialId: "fb0096c70dc4444491369ae8", studentId: "RAIHAN001", subject: "Pendidikan Pancasila", topic: "Bhinneka Tunggal Ika", subTopic: "Toleransi dan Kerukunan", itemType: "missing_quiz" },
    { materialId: "97ca7940a0084cda8f43276b", studentId: "RAIHAN001", subject: "PJOK", topic: "Renang", subTopic: "Pengenalan Renang", itemType: "missing_quiz" },
    { materialId: "d9c3922e236b4319b3f5d620", studentId: "RAIHAN001", subject: "Bahasa Indonesia", topic: "Menyajikan Teks Deskripsi", subTopic: "Menyunting Teks", itemType: "missing_quiz" },
    { materialId: "9d627b47df64422386d550ba", studentId: "RAIHAN001", subject: "Informatika", topic: "Analisis Data", subTopic: "Pengolahan Data Sederhana", itemType: "missing_quiz" },
  ];

  // ===== PART 2: HIGH severity from audit =====
  const highSevItems: FixItem[] = [];
  const auditFiles = [
    { fname: `${AUDIT_DIR}/2026-08-02-SD_5-audit.json`, grade: "SD_5" },
    { fname: `${AUDIT_DIR}/2026-08-02-SMP_1-audit.json`, grade: "SMP_1" },
    { fname: `${AUDIT_DIR}/2026-08-02-SMA_2-audit.json`, grade: "SMA_2" },
  ];

  for (const af of auditFiles) {
    try {
      const d = JSON.parse(await (await import("fs")).promises.readFile(af.fname, "utf-8"));
      for (const r of d.results || []) {
        const allIssues = [...(r.slideIssues || []), ...(r.quizIssues || [])];
        const highIssues = allIssues.filter((i: any) => i.severity === "high");
        if (highIssues.length > 0) {
          const subTopic = r.subTopic || r.topic || "unknown";
          let studentId = af.grade === "SD_5" ? "SYIFA001" : af.grade === "SMP_1" ? "RAIHAN001" : "SHOFI001";
          highSevItems.push({
            materialId: r.materialId,
            studentId,
            subject: r.subject,
            topic: r.topic,
            subTopic,
            issue: highIssues.map((i: any) => i.issue).join("; "),
            itemType: "high_severity",
          });
        }
      }
    } catch (e) {
      log(`Failed to read ${af.fname}: ${e}`);
    }
  }

  const allItems: FixItem[] = [...missingQuizzes, ...highSevItems];
  const total = allItems.length;
  log(`Total items to fix: ${total} (${missingQuizzes.length} missing quiz + ${highSevItems.length} high severity)`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const idx = i + 1;
    const grade = getGrade(item.studentId);
    const studentDbId = await getStudentDbId(item.studentId);

    if (!studentDbId) {
      log(`❌ No student DB id for ${item.studentId}, skipping`);
      skipped++;
      saveProgress(idx, total, "skip", item.subTopic);
      continue;
    }

    log(`\n📝 [${idx}/${total}] ${item.subject} > ${item.topic} > ${item.subTopic} (${grade})`);
    saveProgress(idx, total, "working", item.subTopic);

    const existingQuizId = await quizExists(item.materialId, studentDbId);

    if (item.itemType === "missing_quiz") {
      // Get existing content (may be null)
      let content = await getMaterialContent(item.materialId);
      if (!content || content.length < 50) {
        content = await generateContent(item.subject, item.topic, item.subTopic, grade);
      }
      const questions = await generateQuiz(item.subject, item.topic, item.subTopic, grade, content || undefined);

      if (!questions || questions.length < 3) {
        failed++;
        log(`❌ FAILED (missing_quiz): ${item.subTopic}`);
        saveProgress(idx, total, "failed", item.subTopic);
      } else {
        try {
          if (content) await updateMaterialContent(item.materialId, content);
          if (existingQuizId) {
            await upsertQuiz(item.materialId, studentDbId, questions);
            log(`🔄 REGENERATED: ${item.subTopic} (${questions.length} soal)`);
          } else {
            await insertQuizNew(item.materialId, studentDbId, questions);
            log(`✅ NEW QUIZ: ${item.subTopic} (${questions.length} soal)`);
          }
          success++;
          saveProgress(idx, total, "success", item.subTopic);
        } catch (e: any) {
          if (e.code === "23505") {
            success++;
            log(`⚠️  Already exists: ${item.subTopic}`);
          } else {
            failed++;
            log(`💾 ❌ DB Error: ${e.message?.slice(0, 80)}`);
            saveProgress(idx, total, "failed", item.subTopic);
          }
        }
      }
    } else {
      // HIGH severity: regenerate quiz using existing content
      const existingContent = await getMaterialContent(item.materialId);
      const questions = await generateQuiz(item.subject, item.topic, item.subTopic, grade, existingContent || undefined);

      if (!questions || questions.length < 3) {
        failed++;
        log(`❌ FAILED (high_sev): ${item.subTopic}`);
        saveProgress(idx, total, "failed", item.subTopic);
      } else {
        try {
          if (existingQuizId) {
            await upsertQuiz(item.materialId, studentDbId, questions);
            log(`🔄 REGENERATED: ${item.subTopic} (${questions.length} soal)`);
          } else {
            await insertQuizNew(item.materialId, studentDbId, questions);
            log(`✅ NEW QUIZ: ${item.subTopic} (${questions.length} soal)`);
          }
          success++;
          saveProgress(idx, total, "success", item.subTopic);
        } catch (e: any) {
          if (e.code === "23505") {
            success++;
            log(`⚠️  Already exists: ${item.subTopic}`);
          } else {
            failed++;
            log(`💾 ❌ DB Error: ${e.message?.slice(0, 80)}`);
            saveProgress(idx, total, "failed", item.subTopic);
          }
        }
      }
    }

    // Rate limit: 3s between items
    await new Promise(r => setTimeout(r, 3000));
  }

  const summary = `\n=== ALL DONE ===\nTotal: ${total}\nSuccess: ${success}\nFailed: ${failed}\nSkipped: ${skipped}`;
  log(summary);
  saveProgress(total, total, "complete", summary);
  log("Done!");

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => {
  console.error("Fatal error:", e);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
