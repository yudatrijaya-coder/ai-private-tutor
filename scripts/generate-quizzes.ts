/**
 * Mass quiz generator — creates 5 questions per sub-topic via LLM
 * Uses 9Router ai_tutor_agent for high-quality, accurate questions
 * 
 * Run: npx tsx scripts/generate-quizzes.ts
 */
import { writeFileSync } from "fs";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:20128/v1",
  apiKey: "sk-9router",
  defaultQuery: { "combo": "ai_tutor_agent" },
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

// All curriculum sub-topics grouped for batch generation
const BATCHES = [
  { subject: "Matematika", topics: [
    "Bilangan", "Aljabar", "Persamaan", "Perbandingan",
    "Aritmatika Sosial", "Bangun Datar", "Statistika"
  ], grade: "SD/5" },
  { subject: "IPA", topics: [
    "Ilmu Sains", "Zat dan Perubahan", "Suhu dan Kalor",
    "Gerak dan Gaya", "Makhluk Hidup", "Ekologi", "Bumi dan Tata Surya"
  ], grade: "SMP/1" },
];

async function generateQuiz(
  subject: string,
  topic: string,
  grade: string,
  count = 5
): Promise<QuizQuestion[]> {
  const prompt = `Buatkan ${count} soal pilihan ganda untuk pelajaran ${subject} tingkat ${grade} dengan topik "${topic}".

PERSYARATAN:
- Setiap soal punya 4 pilihan jawaban (A, B, C, D)
- Campur level kesulitan: easy, medium, hard
- Soal harus AKURAT secara ilmiah/akademik — jangan menyesatkan
- Sertakan kunci jawaban (0=A, 1=B, 2=C, 3=D)
- Sertakan penjelasan singkat kenapa jawaban itu benar
- Gunakan bahasa Indonesia yang baik

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

  try {
    const res = await client.chat.completions.create({
      model: "ai_tutor_agent",
      messages: [
        { role: "system", content: "Kamu adalah pembuat soal pendidikan Indonesia. Keluarkan hanya JSON valid tanpa markdown." },
        { role: "user", content: prompt },
      ],
      max_tokens: 3000,
      temperature: 0.7,
    });

    const content = res.choices?.[0]?.message?.content || "";
    // Try to extract JSON from response (handle reasoning models)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn(`⚠️ No JSON found for ${subject}/${topic}`);
      return [];
    }
    
    const questions = JSON.parse(jsonMatch[0]) as QuizQuestion[];
    return questions.slice(0, count);
  } catch (err) {
    console.error(`❌ Error generating ${subject}/${topic}:`, (err as Error).message?.slice(0, 100));
    return [];
  }
}

async function main() {
  const allQuizzes: QuizEntry[] = [];
  
  for (const batch of BATCHES) {
    for (const topic of batch.topics) {
      console.log(`📝 ${batch.subject} — ${topic}...`);
      const questions = await generateQuiz(batch.subject, topic, batch.grade);
      if (questions.length > 0) {
        // Create sub-topics for each main topic
        const subTopics = [
          `${topic}: Konsep Dasar`,
          `${topic}: Penerapan`,
          `${topic}: Soal Cerita`,
        ];
        for (const sub of subTopics) {
          allQuizzes.push({
            subject: batch.subject,
            topic,
            subTopic: sub,
            questions: questions.map(q => ({
              ...q,
              difficulty: q.difficulty || (Math.random() > 0.6 ? "hard" : Math.random() > 0.3 ? "medium" : "easy"),
            } satisfies QuizQuestion)),
          });
        }
      }
      // Small delay to avoid rate limit
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Output
  const output = `// Auto-generated quiz bank — ${allQuizzes.length} entries
// Generated via LLM on ${new Date().toISOString()}
import type { QuestionData } from '@/agents/assessment/types';

export function quizKey(subject: string, topic: string, subTopic: string): string {
  return \`\${subject}||\${topic}||\${subTopic}\`;
}

const QUIZ_MAP: Record<string, QuestionData[]> = {
${allQuizzes.map(q => {
  const key = `"${q.subject}||${q.topic}||${q.subTopic}"`;
  const questions = q.questions.map(qq =>
    `    { question: ${JSON.stringify(qq.question)}, options: ${JSON.stringify(qq.options)}, correctIndex: ${qq.correctIndex}, difficulty: "${qq.difficulty}", explanation: ${JSON.stringify(qq.explanation)} }`
  ).join(",\n");
  return `  ${key}: [\n${questions}\n  ],`;
}).join("\n\n")}
};

export function getQuiz(subject: string, topic: string, subTopic: string): QuestionData[] {
  return QUIZ_MAP[quizKey(subject, topic, subTopic)] || [];
}

export function getAllQuizzes(): Record<string, QuestionData[]> {
  return QUIZ_MAP;
}
`;

  const outPath = "/home/ubuntu/ai-private-tutor/src/data/quiz-bank-generated.ts";
  writeFileSync(outPath, output);
  console.log(`\n✅ Generated ${allQuizzes.length} quiz entries → ${outPath}`);
}

main().catch(console.error);
