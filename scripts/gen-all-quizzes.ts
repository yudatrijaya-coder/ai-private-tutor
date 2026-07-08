/** 
 * Efficient quiz bank generator — one LLM call per SUBJECT (not per sub-topic)
 * Uses sumopod/deepseek-v4-flash (faster than ai_tutor_agent combo)
 */
import { writeFileSync } from "fs";
import OpenAI from "openai";
import { GRADE_TOPICS } from "../src/data/curriculum-topics";

const client = new OpenAI({ baseURL: "http://localhost:20128/v1", apiKey: "sk-9router" });

interface Q { question: string; options: string[]; correctIndex: number; difficulty: string; explanation: string; }

async function generateForSubject(subject: string, grade: string, subTopics: string[]): Promise<Record<string, Q[]>> {
  const prompt = `Buat 5 soal pilihan ganda per sub-topik untuk ${subject} ${grade}.

Sub-topik: ${subTopics.join(", ")}

Untuk SETIAP sub-topik, buat 5 soal dengan detail:
- 2 soal easy, 2 medium, 1 hard
- 4 pilihan jawaban (A,B,C,D)
- Kunci jawaban (0=A,1=B,2=C,3=D)
- Penjelasan singkat

Output HARUS berupa JSON array of objects:
[{"subTopic": "...", "questions": [{"question":"...","options":["A","B","C","D"],"correctIndex":0,"difficulty":"easy","explanation":"..."}]}]

HANYA output JSON, tanpa teks lain. Soal harus AKURAT secara ilmiah.`;

  const res = await client.chat.completions.create({
    model: "sumopod/deepseek-v4-flash",
    messages: [
      { role: "system", content: "Anda guru profesional. Output JSON saja." },
      { role: "user", content: prompt },
    ],
    max_tokens: 8000,
    temperature: 0.7,
  }, { timeout: 60000 });

  let content = res.choices?.[0]?.message?.content || "";
  content = content.replace(/^data:.*$/gm, "").trim();
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON in response");
  
  const result: Record<string, Q[]> = {};
  for (const entry of JSON.parse(jsonMatch[0])) {
    result[`${subject}||${entry.subTopic}||`] = entry.questions;
  }
  return result;
}

async function main() {
  const grades = [
    { key: "SD_5", label: "SD Kelas 5" },
    { key: "SMP_1", label: "SMP Kelas 1" },
    { key: "SMA_2", label: "SMA Kelas 2" },
  ];

  for (const grade of grades) {
    const topics = GRADE_TOPICS[grade.key] || [];
    const subjects: Record<string, string[]> = {};
    for (const t of topics) {
      if (!subjects[t.subject]) subjects[t.subject] = [];
      subjects[t.subject].push(t.subTopic);
    }

    const allEntries: Record<string, Q[]> = {};
    for (const [subject, subTopics] of Object.entries(subjects)) {
      // Skip if quiz bank already exists for this subject
      console.log(`[${grade.label}] ${subject} (${subTopics.length} sub-topik)...`);
      try {
        const result = await generateForSubject(subject, grade.label, subTopics);
        Object.assign(allEntries, result);
        console.log(`  ✅ ${Object.keys(result).length} sub-topik generated`);
      } catch (err) {
        console.log(`  ❌ ${(err as Error).message?.slice(0, 80)}`);
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    // Write output file
    const lines = [
      `// Auto-generated quiz bank — ${grade.label}`,
      `import type { QuestionData } from '@/agents/assessment/types';`,
      ``,
      `export function quizKey(subject: string, topic: string, subTopic: string): string {`,
      `  return \`\${subject}||\${topic}||\${subTopic}\`;`,
      `}`,
      ``,
      `const QUIZ_MAP: Record<string, QuestionData[]> = {`,
    ];

    for (const [key, questions] of Object.entries(allEntries)) {
      const qStr = questions.map(q => 
        `    { question: ${JSON.stringify(q.question)}, options: ${JSON.stringify(q.options)}, correctIndex: ${q.correctIndex}, difficulty: ${JSON.stringify(q.difficulty)}, explanation: ${JSON.stringify(q.explanation)} }`
      ).join(",\n");
      lines.push(`  [quizKey(${key.split("||").map(s => JSON.stringify(s)).join(", ")})]: [\n${qStr}\n  ],`);
    }

    lines.push(`};`, ``, `export function getQuiz(subject: string, topic: string, subTopic: string): QuestionData[] {`, `  return QUIZ_MAP[quizKey(subject, topic, subTopic)] || [];`, `}`, ``, `export function getAllQuizzes() { return QUIZ_MAP; }`, ``);

    const fileKey = grade.key === "SD_5" ? "sd5" : grade.key === "SMP_1" ? "smp7" : "sma11";
    const outPath = `/home/ubuntu/ai-private-tutor/src/data/quiz-bank-${fileKey}.ts`;
    writeFileSync(outPath, lines.join("\n"));
    console.log(`\n✅ ${grade.label}: ${Object.keys(allEntries).length} entries → ${outPath}`);
  }

  console.log("\n🎉 Done! All quiz banks generated.");
}

main().catch(console.error);
