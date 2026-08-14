import { prisma } from "../src/lib/prisma";
import { generateWeeklyExam } from "../src/services/weekly-exam-generator";

/**
 * Retry failed weekly exam generations (transient LLM errors).
 * Usage: npx tsx scripts/retry_failed_weekly_exams.ts
 */
async function main() {
  const students = await prisma.student.findMany({
    select: { id: true, studentId: true, gradeLevel: true },
  });

  for (const s of students) {
    const cur = await prisma.curriculum.findFirst({
      where: { studentId: s.id },
      orderBy: { version: "desc" },
    });
    if (!cur) continue;

    const existing = await prisma.exam.findMany({
      where: { type: "WEEKLY", gradeLevel: s.gradeLevel },
      select: { subject: true },
    });
    const existingSubjects = new Set(existing.map((e) => e.subject));

    const groups = await prisma.material.groupBy({
      by: ["subject"],
      where: { curriculumId: cur.id },
    });

    for (const g of groups) {
      if (existingSubjects.has(g.subject)) continue; // already done or failed → skip
      console.log(`[${s.studentId}] RETRY ${g.subject}...`);
      try {
        const res = await generateWeeklyExam({ studentId: s.id, subject: g.subject });
        console.log(`[${s.studentId}] ✅ ${g.subject} → ${res.examId} (${res.questionCount} soal)`);
        existingSubjects.add(g.subject);
      } catch (err) {
        console.error(`[${s.studentId}] ❌ ${g.subject}: ${(err as Error).message}`);
      }
    }
  }
}

main()
  .catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
