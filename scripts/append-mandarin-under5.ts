/**
 * Append missing questions to under-5 Mandarin quizzes using project's callLLM.
 *
 * Usage: npx tsx scripts/append-mandarin-under5.ts
 */
import { prisma } from "../src/lib/prisma";
import { callLLM } from "../src/llm/client";
import type { ChatMessage } from "../src/llm/types";

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

async function main() {
  const under5 = await prisma.quiz.findMany({
    where: { maxScore: { lt: 5 } },
    include: {
      material: { select: { id: true, topic: true, subject: true, processedContent: true } },
    },
  });

  if (under5.length === 0) {
    console.log("No under-5 quizzes found.");
    return;
  }

  console.log(`Found ${under5.length} under-5 quizzes (all Mandarin).`);

  let ok = 0;
  let fail = 0;

  for (const quiz of under5) {
    const currentQs = quiz.questions as unknown as Question[];
    const currentLen = currentQs.length;
    const needed = 5 - currentLen;
    const topic = quiz.material.topic;
    const context = quiz.material.processedContent?.slice(0, 500) || topic;

    console.log(`\n[${ok + fail + 1}/${under5.length}] ${topic} — need ${needed} more (curr=${currentLen})`);

    // find a material-level studentId
    const material = await prisma.material.findUnique({
      where: { id: quiz.materialId },
      include: { curriculum: { select: { studentId: true } } },
    });
    const studentId = material?.curriculum?.studentId;

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `Anda membuat soal Bahasa Mandarin untuk siswa SD/SMP Indonesia.
Format JSON array, setiap soal: { question, options: [4 string], correctIndex: 0-3, explanation }.
Soal baru harus BERBEDA dari yang sudah ada. Kembalikan HANYA JSON array.`,
      },
      {
        role: "user",
        content: `Topik: ${topic}
Konteks: ${context}

Soal yang sudah ada (${currentLen} soal):
${JSON.stringify(currentQs, null, 2)}

Buat tepat ${needed} soal BARU dengan format JSON array.`,
      },
    ];

    let success = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const text = await callLLM("assessment", messages, {
          studentId: studentId ?? undefined,
          maxTokens: 2000,
          timeoutMs: 120_000,
        });

        if (!text) {
          console.log(`  Attempt ${attempt}: empty response`);
          continue;
        }

        const parsed = parseQuestions(text);
        if (!parsed || parsed.length === 0) {
          console.log(`  Attempt ${attempt}: unparseable response`);
          continue;
        }

        const addQs = parsed.slice(0, needed);
        const allQs = [...currentQs, ...addQs];
        const newScore = allQs.length;

        await prisma.quiz.update({
          where: { id: quiz.id },
          data: {
            questions: allQs as any,
            maxScore: newScore,
          },
        });

        console.log(`  ✅ ${currentLen}→${newScore} (attempt ${attempt})`);
        ok++;
        success = true;
        break;
      } catch (err) {
        console.log(`  Attempt ${attempt}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (!success) {
      console.log(`  ❌ Failed after 3 attempts`);
      fail++;
    }
  }

  console.log(`\n=== DONE: ${ok} ok, ${fail} failed ===`);
}

function parseQuestions(text: string): Question[] | null {
  // Strip code fences
  let cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  // Find JSON array bounds
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) return null;

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;
    for (const q of parsed) {
      if (!q.question || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correctIndex !== "number") {
        return null;
      }
    }
    return parsed as Question[];
  } catch {
    return null;
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
