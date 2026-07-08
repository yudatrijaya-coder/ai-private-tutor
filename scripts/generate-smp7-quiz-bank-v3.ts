/**
 * Generate SMP/1 quiz bank — V3 with better flushing and timeout handling
 *
 * Run: npx tsx scripts/generate-smp7-quiz-bank-v3.ts
 */
import { writeFileSync, existsSync, readFileSync } from "fs";
import OpenAI from "openai";
import { GRADE_TOPICS_SMP7 } from "../src/data/curriculum-topics-smp7";
import type { TopicEntry } from "../src/data/curriculum-topics";

const client = new OpenAI({
  baseURL: "http://localhost:20128/v1",
  apiKey: "not-needed",
  defaultQuery: { combo: "ai_tutor_agent" },
  timeout: 60000,
  maxRetries: 2,
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
      return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
    } catch { return []; }
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
    .replace(/[\x00-\x1f]/g, " ")
    .replace(/\s+/g, " ");
  try { JSON.parse(json); return json; } catch { return null; }
}

async function generateQuizForSubTopic(entry: TopicEntry): Promise<QuizQuestion[]> {
  const { subject, topic, subTopic } = entry;
  const prompt = `Buatkan 5 soal pilihan ganda untuk pelajaran ${subject} tingkat ${GRADE} topik "${topic}", sub-topik "${subTopic}".

PERSYARATAN:
- 4 pilihan jawaban per soal
- 2 easy, 2 medium, 1 hard
- Akurat secara ilmiah/akademik
- Kunci jawaban (0=A, 1=B, 2=C, 3=D)
- Sertakan penjelasan
- Soal SPESIFIK untuk "${subTopic}"

Hanya JSON array, tanpa teks lain:
[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"difficulty":"easy","explanation":"..."}]`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model: "ai_tutor_agent",
        messages: [
          { role: "system", content: "Kamu adalah pembuat soal. Keluarkan hanya JSON array valid." },
          { role: "user", content: prompt },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });
      const content = res.choices?.[0]?.message?.content || "";
      const jsonStr = extractJSON(content);
      if (!jsonStr) continue;
      const questions = JSON.parse(jsonStr) as QuizQuestion[];
      const valid = questions.filter(
        q => q.question && Array.isArray(q.options) && q.options.length === 4 &&
             typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3 && q.explanation
      );
      if (valid.length >= 3) return valid.slice(0, 5);
    } catch {
      if (attempt < 2) await new Promise(r => setTimeout(r, 3000));
    }
  }
  return [];
}

function generateOutputFile(quizzes: QuizEntry[]): string {
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
    `export function quizKey(`,
    `  subject: string,`,
    `  topic: string,`,
    `  subTopic: string,`,
    `): string {`,
    `  return \`\${subject}||\${topic}||\${subTopic}\`;`,
    `}`,
    ``,
    `const QUIZ_MAP: Record<string, QuestionData[]> = {`,
  ];

  for (const q of quizzes) {
    lines.push(`  [quizKey(${JSON.stringify(q.subject)}, ${JSON.stringify(q.topic)}, ${JSON.stringify(q.subTopic)})]: [`);
    for (let i = 0; i < q.questions.length; i++) {
      const qq = q.questions[i];
      lines.push(
        `    { question: ${JSON.stringify(qq.question)}, options: ${JSON.stringify(qq.options)}, correctIndex: ${qq.correctIndex}, difficulty: ${JSON.stringify(qq.difficulty)}, explanation: ${JSON.stringify(qq.explanation)} }${i < q.questions.length - 1 ? "," : ""}`
      );
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
  
  console.log(`📚 ${entries.length} total sub-topics`);
  console.log(`📊 ${progress.length} already done`);
  
  const remaining = entries.filter(e => !completedKeys.has(`${e.subject}||${e.topic}||${e.subTopic}`));
  console.log(`🎯 ${remaining.length} remaining\n`);
  
  if (remaining.length === 0) {
    writeFileSync(OUT_PATH, generateOutputFile(progress));
    const totalQs = progress.reduce((s, q) => s + q.questions.length, 0);
    console.log(`✅ Done! ${OUT_PATH} — ${progress.length} sub-topics, ${totalQs} questions`);
    return;
  }

  const allQuizzes = [...progress];
  const CONCURRENCY = 3; // lower concurrency to avoid issues
  let completed = progress.length;

  for (let i = 0; i < remaining.length; i += CONCURRENCY) {
    const batch = remaining.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (entry) => {
        const qs = await generateQuizForSubTopic(entry);
        return { entry, questions: qs };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        const { entry, questions } = result.value;
        completed++;
        const status = questions.length > 0 ? `✅ ${questions.length} soal` : "❌ GAGAL";
        console.log(`[${completed}/${entries.length}] ${entry.subject} — ${entry.subTopic}: ${status}`);
        if (questions.length > 0) {
          allQuizzes.push({ subject: entry.subject, topic: entry.topic, subTopic: entry.subTopic, questions });
        }
      } else {
        completed++;
        console.log(`[${completed}/${entries.length}] ❌ ERROR: ${result.reason?.message?.slice(0, 100)}`);
      }
    }

    saveProgress(allQuizzes);
    console.log(`  💾 Saved progress (${allQuizzes.length}/${entries.length})`);
    
    if (i + CONCURRENCY < remaining.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  writeFileSync(OUT_PATH, generateOutputFile(allQuizzes));
  const totalQs = allQuizzes.reduce((sum, q) => sum + q.questions.length, 0);
  console.log(`\n✅ ${OUT_PATH} — ${allQuizzes.length} sub-topics, ${totalQs} questions`);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
