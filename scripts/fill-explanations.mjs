import { PrismaClient } from "../src/generated/prisma/client/index.js";

const prisma = new PrismaClient();

function generateExplanation(question, options, correctIdx) {
  const correct = options[correctIdx] || "";
  const q = question.toLowerCase();

  if (/\bhasil|nilai|tentukan|hitung\b/.test(q))
    return `Hasil perhitungan yang benar adalah "${correct}".`;
  if (/\brumus\b/.test(q))
    return `Rumus yang tepat adalah "${correct}".`;
  if (/\bdefinisi|pengertian|yang dimaksud\b/.test(q))
    return `Definisi yang tepat adalah "${correct}".`;
  if (/\bmanakah|berikut ini|yang bukan|yang merupakan\b/.test(q))
    return `Jawaban yang tepat adalah "${correct}".`;
  if (/\bfungsi|kegunaan|tujuan\b/.test(q))
    return `Fungsinya adalah "${correct}".`;
  if (/\bsebab|penyebab|alasan|karena\b/.test(q))
    return `Penyebabnya adalah "${correct}".`;
  if (/\bakibat|dampak\b/.test(q))
    return `Dampaknya adalah "${correct}".`;
  if (/\bciri|karakteristik|sifat\b/.test(q))
    return `Ciri yang benar adalah "${correct}".`;
  if (/\bcontoh\b/.test(q))
    return `Contoh yang tepat adalah "${correct}".`;
  if (/\bproses|tahap|langkah\b/.test(q))
    return `Langkah yang benar adalah "${correct}".`;
  if (/\bperbedaan|persamaan\b/.test(q))
    return `Yang tepat adalah "${correct}".`;
  if (/\bteori|konsep|prinsip|hukum|aturan\b/.test(q))
    return `Konsep yang benar adalah "${correct}".`;
  if (/\bwhat|which|who|where|when|how\b/.test(q))
    return `The correct answer is "${correct}".`;

  return `Jawaban yang tepat adalah "${correct}".`;
}

async function main() {
  const students = await prisma.student.findMany({
    where: { status: "ACTIVE", isTemplate: false },
    select: { id: true, name: true, studentId: true },
  });

  let totalFixed = 0;
  let totalMissing = 0;
  let totalSkipped = 0;

  for (const s of students) {
    const quizzes = await prisma.quiz.findMany({
      where: { studentId: s.id },
      orderBy: { createdAt: "desc" },
    });

    let fixed = 0, missing = 0, skipped = 0;

    for (const quiz of quizzes) {
      const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
      if (questions.length === 0) { skipped++; continue; }

      let needUpdate = false;
      for (const q of questions) {
        if (!q.explanation) {
          missing++;
          if (q.options && typeof q.correctIndex === "number") {
            q.explanation = generateExplanation(q.question, q.options, q.correctIndex);
            needUpdate = true;
          }
        }
      }

      if (needUpdate) {
        await prisma.quiz.update({
          where: { id: quiz.id },
          data: { questions },
        });
        fixed++;
      } else {
        skipped++;
      }
    }

    console.log(`${s.name} (${s.studentId}): fixed ${fixed}, ${missing} missing explanations, ${skipped} skipped`);
    totalFixed += fixed;
    totalMissing += missing;
    totalSkipped += skipped;
  }

  console.log(`\n✅ Total: ${totalFixed} quizzes fixed, ${totalMissing} explanations generated, ${totalSkipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
