/**
 * Batch Quiz Generator — generates ALL missing quizzes across ALL students/templates
 * Updates progress to file every ~30 items.
 * 
 * Usage: npx tsx scripts/batch-gen-quiz.ts
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

const PROGRESS_FILE = "/tmp/quiz-gen-progress.txt";
const LOG_FILE = "/tmp/quiz-gen-log.json";

interface Q { question: string; options: string[]; correctIndex: number; difficulty: string; explanation: string; }

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
${content.slice(0, 2500)}

Buat 5 soal dengan distribusi: 2 easy, 2 medium, 1 hard.
Format JSON array:
[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"difficulty":"easy","explanation":"..."}]

HANYA output JSON. Soal akurat secara ilmiah.`;

  try {
    const res = await llm.chat.completions.create({
      model: "sumopod/deepseek-v4-flash",
      messages: [
        { role: "system", content: "Anda guru IPA/IPS/PAI profesional Indonesia. Output JSON saja." },
        { role: "user", content: prompt },
      ],
      max_tokens: 4000,
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
  // Clear progress file
  writeFileSync(PROGRESS_FILE, `=== QUIZ BATCH GENERATION STARTED ${new Date().toISOString()} ===\n`);
  
  // Get ALL missing quizzes across ALL students/templates
  log("Fetching missing quizzes...");
  
  const missing = await prisma.$queryRawUnsafe<Array<{studentId: string, studentName: string, materialId: string, subject: string, topic: string, subTopic: string, content: string}>>(
    `SELECT s.id as "studentId", s.name as "studentName", m.id as "materialId", 
            m.subject, m.topic, m."subTopic", COALESCE(m."processedContent", m."rawContent") as content
     FROM "Material" m
     JOIN "Curriculum" c ON c.id = m."curriculumId"
     JOIN "Student" s ON s.id = c."studentId"
     LEFT JOIN "Quiz" q ON q."materialId" = m.id AND q."studentId" = s.id
     WHERE q.id IS NULL
       AND m.subject IS NOT NULL
       AND (m."processedContent" IS NOT NULL OR m."rawContent" IS NOT NULL)
     ORDER BY s.name, m.subject, m.topic, m."subTopic"`
  );

  log(`Found ${missing.length} missing quizzes across all students/templates`);

  let done = 0;
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of missing) {
    done++;
    
    if (!item.content || item.content.length < 50) {
      log(`⏭️  [${done}/${missing.length}] SKIP (no content): ${item.studentName} > ${item.subject} > ${item.subTopic}`);
      saveProgress(done, missing.length, "skip_no_content", `${item.studentName} > ${item.subTopic}`);
      continue;
    }

    log(`📝 [${done}/${missing.length}] Generating: ${item.studentName} > ${item.subject} > ${item.subTopic}`);
    saveProgress(done, missing.length, "generating", `${item.studentName} > ${item.subject} > ${item.subTopic}`);

    const questions = await generateQuiz(item.materialId, item.content, item.topic, item.subTopic);
    
    if (!questions || questions.length < 2) {
      failed++;
      const errMsg = `FAILED: ${item.studentName} > ${item.subTopic}`;
      errors.push(errMsg);
      log(`❌ ${errMsg}`);
      saveProgress(done, missing.length, "failed", `${item.studentName} > ${item.subTopic}`);
    } else {
      try {
        await saveQuiz(item.materialId, item.studentId, questions);
        success++;
        log(`✅ ${item.studentName} > ${item.subject} > ${item.subTopic} (${questions.length} soal)`);
        saveProgress(done, missing.length, "success", `${item.studentName} > ${item.subject} > ${item.subTopic}`);
      } catch (e: any) {
        if (e.code === 'P2002') {
          // Already exists (race condition), count as success
          success++;
          log(`⚠️  Already exists: ${item.subTopic}`);
        } else {
          failed++;
          errors.push(`DB ERROR: ${item.studentName} > ${item.subTopic}: ${e.message}`);
          log(`💾 ❌ DB Error: ${e.message?.slice(0, 80)}`);
        }
      }
    }

    // Delay between calls to avoid rate limit
    await new Promise(r => setTimeout(r, 1500));
    
    // Save checkpoint every 30 items
    if (done % 30 === 0) {
      log(`📊 Progress: ${done}/${missing.length} | ✅ ${success} | ❌ ${failed}`);
    }
  }

  const summary = `\n=== COMPLETE ===\nTotal: ${missing.length}\nSuccess: ${success}\nFailed: ${failed}\nSkipped: ${missing.length - success - failed}`;
  log(summary);
  saveProgress(missing.length, missing.length, "complete", summary);
  
  if (errors.length > 0) {
    log("\n=== ERRORS ===");
    errors.forEach(e => log(e));
  }

  log("Done!");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Fatal error:", e);
  await prisma.$disconnect();
  process.exit(1);
});
