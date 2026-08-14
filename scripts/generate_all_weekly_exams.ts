import { prisma } from "../src/lib/prisma";
import { generateWeeklyExam } from "../src/services/weekly-exam-generator";

/**
 * Generate WEEKLY exams for ALL subjects per active student,
 * skipping subjects that already have a WEEKLY exam for that grade.
 * Skips subjects whose materials are only in week 999 (placeholder).
 */
async function main() {
  const students = await prisma.student.findMany({
    select: { id: true, studentId: true, name: true, gradeLevel: true },
  });

  for (const s of students) {
    const cur = await prisma.curriculum.findFirst({
      where: { studentId: s.id },
      orderBy: { version: "desc" },
    });
    if (!cur) {
      console.log(`[${s.studentId}] SKIP — no curriculum`);
      continue;
    }

    // Subjects already having a WEEKLY exam for this grade
    const existing = await prisma.exam.findMany({
      where: { type: "WEEKLY", gradeLevel: s.gradeLevel },
      select: { subject: true },
    });
    const existingSubjects = new Set(existing.map((e) => e.subject));

    // All subjects with materials for this curriculum
    const groups = await prisma.material.groupBy({
      by: ["subject"],
      where: { curriculumId: cur.id },
      _count: { _all: true },
    });

    for (const g of groups) {
      const subject = g.subject;
      if (existingSubjects.has(subject)) {
        console.log(`[${s.studentId}] SKIP ${subject} — already has WEEKLY exam`);
        continue;
      }

      // Check week range — skip placeholder-only (week 999)
      const weeks = await prisma.material.findMany({
        where: { curriculumId: cur.id, subject },
        select: { weekOrder: true },
        orderBy: { weekOrder: "asc" },
      });
      const weekNums = [...new Set(weeks.map((w) => w.weekOrder))];
      const realWeeks = weekNums.filter((w) => w !== 999);
      if (realWeeks.length === 0) {
        console.log(`[${s.studentId}] SKIP ${subject} — placeholder-only (week 999)`);
        continue;
      }

      console.log(`[${s.studentId}] GENERATING ${subject} (${realWeeks.length} real weeks)...`);
      try {
        const res = await generateWeeklyExam({
          studentId: s.id,
          subject,
        });
        console.log(`[${s.studentId}] ✅ ${subject} → exam ${res.examId} (${res.questionCount} soal)`);
        existingSubjects.add(subject); // avoid duplicate within this run
      } catch (err) {
        console.error(`[${s.studentId}] ❌ ${subject}: ${(err as Error).message}`);
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
