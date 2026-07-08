/**
 * Generate SMP/1 quiz bank — 99 sub-topics × 5 questions = 495 questions
 * Uses 9Router ai_tutor_agent (localhost:20128)
 *
 * Run: npx tsx scripts/generate-smp7-quiz-bank.ts
 */
import { writeFileSync } from "fs";
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

const GRADE = "SMP/1";

async function generateQuizForSubTopic(
  entry: TopicEntry,
  retries = 2
): Promise<QuizQuestion[]> {
  const { subject, topic, subTopic } = entry;
  const prompt = `Buatkan 5 soal pilihan ganda untuk pelajaran ${subject} tingkat ${GRADE} dengan topik "${topic}" dan sub-topik "${subTopic}".

PERSYARATAN:
- Setiap soal punya 4 pilihan jawaban
- Campur level kesulitan: 2 easy, 2 medium, 1 hard
- Soal harus AKURAT secara ilmiah/akademik — jangan menyesatkan
- Sertakan kunci jawaban (0=A, 1=B, 2=C, 3=D)
- Sertakan penjelasan singkat kenapa jawaban itu benar
- Gunakan bahasa Indonesia yang baik dan benar
- Soal harus SPESIFIK untuk sub-topik "${subTopic}", jangan terlalu umum

Format JSON array:
[
  {
    "question": "teks soal",
    "options": ["pilihan A", "pilihan B", "pilihan C", "pilihan D"],
    "correctIndex": 0,
    "difficulty": "easy",
    "explanation": "penjelasan jawaban benar"
  }
]

Keluarkan HANYA array JSON, tanpa teks lain.`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model: "ai_tutor_agent",
        messages: [
          {
            role: "system",
            content:
              "Kamu adalah pembuat soal pendidikan Indonesia. Keluarkan hanya JSON valid tanpa markdown.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });

      const content = res.choices?.[0]?.message?.content || "";
      // Try to extract JSON from response (handle reasoning models)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn(
          `  ⚠️ No JSON found for ${subject}/${topic}/${subTopic} (attempt ${attempt + 1})`
        );
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        return [];
      }

      const questions = JSON.parse(jsonMatch[0]) as QuizQuestion[];
      return questions.slice(0, 5);
    } catch (err) {
      console.error(
        `  ❌ Error (attempt ${attempt + 1}): ${
          (err as Error).message?.slice(0, 120)
        }`
      );
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }
  return [];
}

async function main() {
  const entries = GRADE_TOPICS_SMP7.SMP_1;
  console.log(`📚 Found ${entries.length} sub-topics to generate`);

  const allQuizzes: {
    subject: string;
    topic: string;
    subTopic: string;
    questions: QuizQuestion[];
  }[] = [];

  // Process with concurrency of 3 to speed things up
  const CONCURRENCY = 5;
  let completed = 0;

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (entry) => {
        const qs = await generateQuizForSubTopic(entry);
        return { entry, questions: qs };
      })
    );

    for (const { entry, questions } of results) {
      completed++;
      const status =
        questions.length > 0
          ? `✅ ${questions.length} soal`
          : "❌ GAGAL";
      console.log(
        `[${completed}/${entries.length}] ${entry.subject} — ${entry.subTopic}: ${status}`
      );

      if (questions.length > 0) {
        allQuizzes.push({
          subject: entry.subject,
          topic: entry.topic,
          subTopic: entry.subTopic,
          questions,
        });
      }
    }

    // Small delay between batches to avoid hammering
    if (i + CONCURRENCY < entries.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Generate output file
  const fileContent = generateOutputFile(allQuizzes);
  const outPath =
    "/home/ubuntu/ai-private-tutor/src/data/quiz-bank-smp7.ts";
  writeFileSync(outPath, fileContent);
  console.log(`\n✅ Generated ${allQuizzes.length} sub-topics with questions → ${outPath}`);

  // Count total questions
  const totalQs = allQuizzes.reduce((sum, q) => sum + q.questions.length, 0);
  console.log(`📊 Total questions: ${totalQs}`);
}

function generateOutputFile(
  quizzes: {
    subject: string;
    topic: string;
    subTopic: string;
    questions: QuizQuestion[];
  }[]
): string {
  const lines: string[] = [];
  lines.push(`/**
 * Quiz Bank — SMP Kelas 7 (Kurikulum Merdeka)
 * 
 * Auto-generated ${new Date().toISOString()}
 * ${quizzes.length} sub-topik, ${quizzes.reduce((s, q) => s + q.questions.length, 0)} soal
 * 
 * @module @/data/quiz-bank-smp7
 */`);
  lines.push("");
  lines.push("import type { QuestionData } from '@/agents/assessment/types';");
  lines.push("");
  lines.push("// ---------------------------------------------------------------------------");
  lines.push("//  Helper: build a lookup key");
  lines.push("// ---------------------------------------------------------------------------");
  lines.push("export function quizKey(");
  lines.push("  subject: string,");
  lines.push("  topic: string,");
  lines.push("  subTopic: string,");
  lines.push("): string {");
  lines.push("  return `${subject}||${topic}||${subTopic}`;");
  lines.push("}");
  lines.push("");
  lines.push("// ---------------------------------------------------------------------------");
  lines.push("// Quiz bank — 5 questions per sub-topic");
  lines.push("// Each question: question, options (4 items), correctIndex (0-3), difficulty, explanation");
  lines.push("// ---------------------------------------------------------------------------");
  lines.push("");
  lines.push("const QUIZ_MAP: Record<string, QuestionData[]> = {");

  for (const q of quizzes) {
    const key = `${q.subject}||${q.topic}||${q.subTopic}`;
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

  lines.push("};");
  lines.push("");
  lines.push("/**");
  lines.push(" * Get quiz questions for a specific subject/topic/sub-topic");
  lines.push(" */");
  lines.push("export function getQuiz(");
  lines.push("  subject: string,");
  lines.push("  topic: string,");
  lines.push("  subTopic: string,");
  lines.push("): QuestionData[] {");
  lines.push("  return QUIZ_MAP[quizKey(subject, topic, subTopic)] || [];");
  lines.push("}");
  lines.push("");
  lines.push("/**");
  lines.push(" * Get all quizzes as a flat map");
  lines.push(" */");
  lines.push("export function getAllQuizzes(): Record<string, QuestionData[]> {");
  lines.push("  return QUIZ_MAP;");
  lines.push("}");
  lines.push("");
  lines.push("export default QUIZ_MAP;");
  lines.push("");

  return lines.join("\n");
}

main().catch(console.error);
