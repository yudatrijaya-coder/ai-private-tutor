/**
 * Generate SMP/1 quiz bank — Final version
 * Writes progress to log file for monitoring
 *
 * Run: npx tsx scripts/generate-smp7-final.ts
 */
import { writeFileSync, existsSync, readFileSync, appendFileSync } from "fs";
import OpenAI from "openai";
import { GRADE_TOPICS_SMP7 } from "../src/data/curriculum-topics-smp7";
import type { TopicEntry } from "../src/data/curriculum-topics";

const LOG_FILE = "/home/ubuntu/ai-private-tutor/scripts/smp7-gen.log";
const PROGRESS_FILE = "/home/ubuntu/ai-private-tutor/scripts/.smp7-progress.json";
const OUT_PATH = "/home/ubuntu/ai-private-tutor/src/data/quiz-bank-smp7.ts";

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(msg);
  appendFileSync(LOG_FILE, line + "\n");
}

const client = new OpenAI({
  baseURL: "http://localhost:20128/v1",
  apiKey: "not-needed",
  defaultQuery: { combo: "ai_tutor_agent" },
  timeout: 120000,
  maxRetries: 3,
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

function loadProgress(): QuizEntry[] {
  if (existsSync(PROGRESS_FILE)) {
    try { return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8")); } catch { return []; }
  }
  return [];
}

function saveProgress(entries: QuizEntry[]) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(entries, null, 2));
}

function extractJSON(content: string): string | null {
  const arrayMatch = content.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return null;
  let json = arrayMatch[0]
    .replace(/,\s*}/g, "}")
    .replace(/,\s*\]/g, "]")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  try { JSON.parse(json); return json; } catch { return null; }
}

async function generateQuiz(entry: TopicEntry): Promise<QuizQuestion[]> {
  const { subject, topic, subTopic } = entry;
  const prompt = `Buatkan 5 soal pilihan ganda untuk pelajaran ${subject} tingkat SMP/1 topik "${topic}", sub-topik "${subTopic}".

PERSYARATAN:
- 4 pilihan jawaban per soal
- 2 soal easy, 2 medium, 1 hard
- Soal harus AKURAT secara ilmiah/akademik
- Gunakan bahasa Indonesia yang baik dan benar
- Soal harus SPESIFIK untuk sub-topik "${subTopic}"

Keluarkan HANYA JSON array:
[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"difficulty":"easy","explanation":"..."}]`;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model: "ai_tutor_agent",
        messages: [
          { role: "system", content: "Kamu adalah pembuat soal pendidikan Indonesia. Keluarkan hanya JSON array valid, tanpa markdown atau teks lain." },
          { role: "user", content: prompt },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });
      const content = res.choices?.[0]?.message?.content || "";
      const jsonStr = extractJSON(content);
      if (!jsonStr) {
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      const questions = JSON.parse(jsonStr) as QuizQuestion[];
      const valid = questions.filter(
        q => q.question && Array.isArray(q.options) && q.options.length === 4 &&
             typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3 && q.explanation
      );
      if (valid.length >= 3) return valid.slice(0, 5);
    } catch (e) {
      if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
    }
  }
  return [];
}

function generateOutput(quizzes: QuizEntry[]): string {
  const totalQs = quizzes.reduce((s, q) => s + q.questions.length, 0);
  const lines: string[] = [
    `/**`,
    ` * Quiz Bank — SMP Kelas 7 (Kurikulum Merdeka)`,
    ` *`,
    ` * Auto-generated ${new Date().toISOString()}`,
    ` * ${quizzes.length} sub-topik, ${totalQs} soal`,
    ` *`,
    ` * @module @/data/quiz-bank-smp7`,
    ` */`,
    ``,
    `import type { QuestionData } from '@/agents/assessment/types';`,
    ``,
    `export function quizKey(subject: string, topic: string, subTopic: string): string {`,
    `  return \`\${subject}||\${topic}||\${subTopic}\`;`,
    `}`,
    ``,
    `const QUIZ_MAP: Record<string, QuestionData[]> = {`,
  ];

  for (const q of quizzes) {
    lines.push(`  [quizKey(${JSON.stringify(q.subject)}, ${JSON.stringify(q.topic)}, ${JSON.stringify(q.subTopic)})]: [`);
    for (let i = 0; i < q.questions.length; i++) {
      const qq = q.questions[i];
      const comma = i < q.questions.length - 1 ? "," : "";
      lines.push(`    { question: ${JSON.stringify(qq.question)}, options: ${JSON.stringify(qq.options)}, correctIndex: ${qq.correctIndex}, difficulty: ${JSON.stringify(qq.difficulty)}, explanation: ${JSON.stringify(qq.explanation)} }${comma}`);
    }
    lines.push("  ],");
  }

  lines.push(`};`);
  lines.push(``);
  lines.push(`export function getQuiz(subject: string, topic: string, subTopic: string): QuestionData[] {`);
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
  const completedKeys = new Set(progress.map(q => `${q.subject}||${q.topic}||${q.subTopic}`));
  
  const remaining = entries.filter(e => !completedKeys.has(`${e.subject}||${e.topic}||${e.subTopic}`));
  
  log(`📚 ${entries.length} total | ${progress.length} done | ${remaining.length} remaining`);
  
  if (remaining.length === 0) {
    writeFileSync(OUT_PATH, generateOutput(progress));
    const totalQs = progress.reduce((s, q) => s + q.questions.length, 0);
    log(`✅ Done! ${OUT_PATH} — ${progress.length} entries, ${totalQs} questions`);
    return;
  }

  const all = [...progress];
  const CONCURRENCY = 3;
  let done = progress.length;

  for (let i = 0; i < remaining.length; i += CONCURRENCY) {
    const batch = remaining.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (entry) => ({
        entry,
        questions: await generateQuiz(entry),
      }))
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        const { entry, questions } = r.value;
        done++;
        if (questions.length > 0) {
          all.push({ subject: entry.subject, topic: entry.topic, subTopic: entry.subTopic, questions });
          log(`[${done}/${entries.length}] ✅ ${entry.subject} — ${entry.subTopic} (${questions.length} soal)`);
        } else {
          log(`[${done}/${entries.length}] ❌ ${entry.subject} — ${entry.subTopic} (GAGAL)`);
        }
      } else {
        done++;
        log(`[${done}/${entries.length}] ❌ ERROR: ${r.reason?.message?.slice(0, 100)}`);
      }
    }
    saveProgress(all);
    if (i + CONCURRENCY < remaining.length) await new Promise(r => setTimeout(r, 300));
  }

  writeFileSync(OUT_PATH, generateOutput(all));
  const totalQs = all.reduce((s, q) => s + q.questions.length, 0);
  log(`\n✅ ${OUT_PATH} — ${all.length} entries, ${totalQs} questions`);
}

main().catch(e => { log(`FATAL: ${e.message}`); process.exit(1); });
