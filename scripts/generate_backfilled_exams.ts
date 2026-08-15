import { prisma } from "../src/lib/prisma";
import { generateWeeklyExam } from "../src/services/weekly-exam-generator";

/**
 * Generate weekly exams for subjects whose content was just backfilled:
 * - Kimia SMA_2 (TIAMO + SHOFI share gradeLevel → 1 exam)
 * - Matematika SD_5 (SYIFA)
 * Kimia SMA has 71K chars content → use 10 questions to avoid LLM overload.
 */
async function main() {
  const students = await prisma.student.findMany({
    select: { id: true, studentId: true, gradeLevel: true },
  });

  const targets: Array<{ gradeLevel: string; subject: string; questionCount: number }> = [
    { gradeLevel: "SMA_2", subject: "Kimia", questionCount: 10 },
    { gradeLevel: "SD_5", subject: "Matematika", questionCount: 20 },
  ];

  for (const t of targets) {
    // Cek sudah ada exam untuk grade+subject ini?
    const existing = await prisma.exam.findFirst({
      where: { type: "WEEKLY", gradeLevel: t.gradeLevel, subject: t.subject },
    });
    if (existing) {
      console.log(`SKIP ${t.gradeLevel} ${t.subject} — exam sudah ada (${existing.id})`);
      continue;
    }

    // Ambil student pertama untuk grade ini
    const student = students.find((s) => s.gradeLevel === t.gradeLevel);
    if (!student) {
      console.log(`SKIP ${t.gradeLevel} — no student`);
      continue;
    }

    console.log(`GENERATING ${t.subject} (${t.gradeLevel}) — ${t.questionCount} soal...`);
    try {
      const res = await generateWeeklyExam({
        studentId: student.id,
        subject: t.subject,
        questionCount: t.questionCount,
      });
      console.log(`✅ ${t.subject} → ${res.examId} (${res.questionCount} soal)`);
    } catch (err) {
      console.error(`❌ ${t.subject}: ${(err as Error).message}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
