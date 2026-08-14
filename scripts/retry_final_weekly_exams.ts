import { prisma } from "../src/lib/prisma";
import { generateWeeklyExam } from "../src/services/weekly-exam-generator";

/**
 * Final retry for subjects that failed twice:
 * - thin-content subjects → 10 questions instead of 20 (LLM can't sustain 20 from ~1K chars)
 * - empty-content subjects → skip (needs content pipeline, not retry)
 */
const THIN_Q = 10;

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
      if (existingSubjects.has(g.subject)) continue;

      // Skip placeholder-only
      const realWeeks = await prisma.material.count({
        where: { curriculumId: cur.id, subject: g.subject, weekOrder: { lt: 999 } },
      });
      if (realWeeks === 0) {
        console.log(`[${s.studentId}] SKIP ${g.subject} — placeholder-only`);
        existingSubjects.add(g.subject);
        continue;
      }

      // Check content thickness
      const mats = await prisma.material.findMany({
        where: { curriculumId: cur.id, subject: g.subject, weekOrder: { lt: 999 } },
        select: { rawContent: true },
      });
      const totalChars = mats.reduce((a, m) => a + (m.rawContent ?? "").length, 0);
      const withContent = mats.filter((m) => (m.rawContent ?? "").trim().length > 50).length;

      if (withContent === 0) {
        console.log(`[${s.studentId}] SKIP ${g.subject} — NO CONTENT (${mats.length} mat kosong). Perlu pipeline konten dulu.`);
        existingSubjects.add(g.subject);
        continue;
      }

      const q = totalChars < 5000 ? THIN_Q : 20;
      console.log(`[${s.studentId}] RETRY ${g.subject} (${q} soal, ${withContent}/${mats.length} mat, ${totalChars} chars)...`);
      try {
        const res = await generateWeeklyExam({ studentId: s.id, subject: g.subject, questionCount: q });
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
