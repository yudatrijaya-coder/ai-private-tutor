/**
 * Generate SMP/1 quiz bank — 99 sub-topics × 5 questions = 495 questions
 * Uses 9Router ai_tutor_agent (localhost:20128)
 * 
 * V2 — incremental save, resume capability, better JSON parsing
 *
 * Run: npx tsx scripts/generate-smp7-quiz-bank-v2.ts
 */
import { appendFileSync, writeFileSync, existsSync, readFileSync } from "fs";
import OpenAI from "openai";
import { GRADE_TOPICS_SMP7 } from "../src/data/curriculum-topics-smp7";
import type { TopicEntry } from "../src/data/curriculum-topics";

const client = new OpenAI({
  baseURL: "http://localhost:20128/v1",
  apiKey: "not-needed",
  defaultQuery: { combo: "ai_tutor_agent" },
});

interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
}

interface QuizEntry {
  subject: string;
  topic: string;
  subTopic: string;
  questions: QuizQuestion[];
}

const GRADE = "SMP/1";
const PROGRESS_FILE = "/home/ubuntu/ai-private-tutor/scripts/.smp7-progress.json";
const OUT_PATH = "/home/ubuntu/ai-private-tutor/src/data/quiz-bank-smp7.ts";

function loadProgress(): QuizEntry[] {
  if (existsSync(PROGRESS_FILE)) {
    try {
      const data = readFileSync(PROGRESS_FILE, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  return [];
}

function saveProgress(entries: QuizEntry[]) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(entries, null, 2));
}

// Attempt to fix common JSON issues from LLM output
function extractJSON(content: string): string | null {
  // Try direct JSON array match first
  const arrayMatch = content.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return null;

  let json = arrayMatch[0];
  
  // Fix trailing commas before closing braces/brackets (common LLM issue)
  json = json.replace(/,\s*}/g, "}");
  json = json.replace(/,\s*\]/g, "]");
  
  // Fix unescaped quotes inside strings
  // Try to find problematic spots
  try {
    JSON.parse(json);
    return json; // It's valid
  } catch {
    // More aggressive fixes
    // Replace single quotes used as string delimiters
    json = json.replace(/(?<!\\)'/g, "'"); 
    json = json.replace(/'/g, '"');
    
    // Fix unescaped control characters
    json = json.replace(/[\x00-\x1f]/g, "");
    
    try {
      JSON.parse(json);
      return json;
    } catch {
      // Extract individual objects and reconstruct
      const objMatches = json.match(/\{[^{}]*\}/g);
      if (objMatches && objMatches.length >= 3) {
        // Try to rebuild array from individual objects
        const validated = objMatches
          .map((obj) => {
            try {
              const fixed = obj
                .replace(/,\s*}/g, "}")
                .replace(/(['"])?([a-zA-Z_]\w*)(['"])?\s*:/g, '"$2":')
                .replace(/:\s*'([^']*)'/g, ':"$1"')
                .replace(/"\s*\+\s*"/g, "");
              JSON.parse(fixed);
              return fixed;
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        if (validated.length >= 3) {
          return `[${validated.join(",")}]`;
        }
      }
      return null;
    }
  }
}

async function generateQuizForSubTopic(
  entry: TopicEntry,
  retries = 3
): Promise<QuizQuestion[]> {
  const { subject, topic, subTopic } = entry;
  const prompt = `Buatkan 5 soal pilihan ganda untuk pelajaran ${subject} tingkat ${GRADE} dengan topik "${topic}" dan sub-topik "${subTopic}".

PERSYARATAN:
- Setiap soal punya 4 pilihan jawaban
- Campur level kesulitan: 2 easy, 2 medium, 1 hard
- Soal harus AKURAT secara ilmiah/akademik
- Sertakan kunci jawaban (0=A, 1=B, 2=C, 3=D)
- Sertakan penjelasan singkat kenapa jawaban itu benar
- Gunakan bahasa Indonesia yang baik dan benar
- Soal harus SPESIFIK untuk sub-topik "${subTopic}"

Format JSON array saja, tanpa markdown atau teks lain:
[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"difficulty":"easy","explanation":"..."}]`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model: "ai_tutor_agent",
        messages: [
          {
            role: "system",
            content:
              "Kamu adalah pembuat soal pendidikan Indonesia. Keluarkan hanya JSON array valid, tanpa markdown atau teks lain.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });

      const content = res.choices?.[0]?.message?.content || "";
      const jsonStr = extractJSON(content);
      if (!jsonStr) {
        console.warn(`  ⚠️ No valid JSON (attempt ${attempt + 1})`);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        return [];
      }

      const questions = JSON.parse(jsonStr) as QuizQuestion[];
      // Validate structure
      const valid = questions.filter(
        (q) =>
          q.question &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correctIndex === "number" &&
          q.correctIndex >= 0 &&
          q.correctIndex <= 3 &&
          q.explanation
      );
      if (valid.length >= 3) {
        return valid.slice(0, 5);
      }
      console.warn(`  ⚠️ Only ${valid.length} valid questions (attempt ${attempt + 1})`);
    } catch (err) {
      console.error(`  ❌ Error (attempt ${attempt + 1}): ${(err as Error).message?.slice(0, 150)}`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }
  return [];
}

function generateOutputFile(quizzes: QuizEntry[]): string {
  const lines: string[] = [];
  const totalQs = quizzes.reduce((s, q) => s + q.questions.length, 0);
  
  lines.push(`/**`);
  lines.push(` * Quiz Bank — SMP Kelas 7 (Kurikulum Merdeka)`);
  lines.push(` * `);
  lines.push(` * Auto-generated ${new Date().toISOString()}`);
  lines.push(` * ${quizzes.length} sub-topik, ${totalQs} soal`);
  lines.push(` * `);
  lines.push(` * @module @/data/quiz-bank-smp7`);
  lines.push(` */`);
  lines.push(``);
  lines.push(`import type { QuestionData } from '@/agents/assessment/types';`);
  lines.push(``);
  lines.push(`// ---------------------------------------------------------------------------`);
  lines.push(`//  Helper: build a lookup key`);
  lines.push(`// ---------------------------------------------------------------------------`);
  lines.push(`export function quizKey(`);
  lines.push(`  subject: string,`);
  lines.push(`  topic: string,`);
  lines.push(`  subTopic: string,`);
  lines.push(`): string {`);
  lines.push(`  return \`\${subject}||\${topic}||\${subTopic}\`;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`// ---------------------------------------------------------------------------`);
  lines.push(`// Quiz bank — 5 questions per sub-topic`);
  lines.push(`// ---------------------------------------------------------------------------`);
  lines.push(``);
  lines.push(`const QUIZ_MAP: Record<string, QuestionData[]> = {`);

  for (const q of quizzes) {
    lines.push(`  [quizKey(${JSON.stringify(q.subject)}, ${JSON.stringify(q.topic)}, ${JSON.stringify(q.subTopic)})]: [`);
    for (let i = 0; i < q.questions.length; i++) {
      const qq = q.questions[i];
      const comma = i < q.questions.length - 1 ? "," : "";
      lines.push(
        `    { question: ${JSON.stringify(qq.question)}, options: ${JSON.stringify(qq.options)}, correctIndex: ${qq.correctIndex}, difficulty: ${JSON.stringify(qq.difficulty)}, explanation: ${JSON.stringify(qq.explanation)} }${comma}`
      );
    }
    lines.push("  ],");
  }

  lines.push(`};`);
  lines.push(``);
  lines.push(`export function getQuiz(`);
  lines.push(`  subject: string,`);
  lines.push(`  topic: string,`);
  lines.push(`  subTopic: string,`);
  lines.push(`): QuestionData[] {`);
  lines.push(`  return QUIZ_MAP[quizKey(subject, topic, subTopic)] || [];`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function getAllQuizzes(): Record<string, QuestionData[]> {`);
  lines.push(`  return QUIZ_MAP;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export default QUIZ_MAP;`);
  lines.push(``);

  return lines.join("\n");
}

async function main() {
  const entries = GRADE_TOPICS_SMP7.SMP_1;
  const progress = loadProgress();
  const completedKeys = new Set(progress.map((q) => `${q.subject}||${q.topic}||${q.subTopic}`));
  
  console.log(`📚 Found ${entries.length} sub-topics`);
  console.log(`📊 Progress: ${progress.length} already done`);
  
  const remaining = entries.filter(
    (e) => !completedKeys.has(`${e.subject}||${e.topic}||${e.subTopic}`)
  );
  console.log(`🎯 Remaining: ${remaining.length} sub-topics to generate`);
  
  if (remaining.length === 0) {
    console.log("✅ All done! Re-generating output file...");
    writeFileSync(OUT_PATH, generateOutputFile(progress));
    const totalQs = progress.reduce((s, q) => s + q.questions.length, 0);
    console.log(`✅ Written ${OUT_PATH} — ${progress.length} sub-topics, ${totalQs} questions`);
    return;
  }

  const allQuizzes = [...progress];
  const CONCURRENCY = 5;
  let completed = progress.length;

  for (let i = 0; i < remaining.length; i += CONCURRENCY) {
    const batch = remaining.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (entry) => {
        const qs = await generateQuizForSubTopic(entry);
        return { entry, questions: qs };
      })
    );

    for (const { entry, questions } of results) {
      completed++;
      const status = questions.length > 0 ? `✅ ${questions.length} soal` : "❌ GAGAL";
      console.log(`[${completed}/${entries.length}] ${entry.subject} — ${entry.subTopic}: ${status}`);

      if (questions.length > 0) {
        allQuizzes.push({
          subject: entry.subject,
          topic: entry.topic,
          subTopic: entry.subTopic,
          questions,
        });
      }
    }

    // Save progress every batch
    saveProgress(allQuizzes);

    // Small delay between batches
    if (i + CONCURRENCY < remaining.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Final write
  writeFileSync(OUT_PATH, generateOutputFile(allQuizzes));
  const totalQs = allQuizzes.reduce((sum, q) => sum + q.questions.length, 0);
  console.log(`\n✅ Generated ${allQuizzes.length} sub-topics → ${OUT_PATH}`);
  console.log(`📊 Total questions: ${totalQs}`);
  
  // Clean up progress file
  // writeFileSync(PROGRESS_FILE, JSON.stringify(allQuizzes, null, 2));
}

main().catch(console.error);
