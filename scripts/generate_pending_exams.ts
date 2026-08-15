import { prisma } from "../src/lib/prisma";
import { generateWeeklyExam } from "../src/services/weekly-exam-generator";

/**
 * Generate 6 pending weekly exams:
 * - SMA_2: Matematika (big content, per-batch snippet fix)
 * - SD_5: Bahasa Inggris, Pendidikan Pancasila (transient retry)
 * - SMP_1: Biologi, Geografi, Sejarah (never generated)
 */
const JOBS = [
  { studentId: "TIAMO001", subject: "Matematika" },
  { studentId: "SYIFA001", subject: "Bahasa Inggris" },
  { studentId: "SYIFA001", subject: "Pendidikan Pancasila" },
  { studentId: "RAIHAN001", subject: "Biologi" },
  { studentId: "RAIHAN001", subject: "Geografi" },
  { studentId: "RAIHAN001", subject: "Sejarah" },
];

async function main() {
  const students = await prisma.student.findMany({
    where: { studentId: { in: JOBS.map((j) => j.studentId) } },
    select: { studentId: true, id: true, gradeLevel: true },
  });
  const idOf = new Map(students.map((s) => [s.studentId, s.id]));
  const gradeOf = new Map(students.map((s) => [s.studentId, s.gradeLevel]));

  for (const job of JOBS) {
    const sid = idOf.get(job.studentId)!;
    const grade = gradeOf.get(job.studentId)!;    // Exam per grade (bukan per student) — cek existing via gradeLevel+subject
    const existing = await prisma.exam.findFirst({
      where: { type: "WEEKLY", gradeLevel: grade, subject: job.subject },
    });
    if (existing) {
      console.log(`⏭️  SKIP ${job.studentId} ${job.subject} — sudah ada (${existing.id})`);
      continue;
    }
    console.log(`\n▶️  ${job.studentId} ${job.subject}...`);
    const t0 = Date.now();
    try {
      const res = await generateWeeklyExam({ studentId: sid, subject: job.subject });
      console.log(`✅ ${job.studentId} ${job.subject} → ${res.examId} (${res.questionCount} soal, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    } catch (e) {
      console.error(`❌ ${job.studentId} ${job.subject}: ${(e as Error).message}`);
    }
  }
  console.log("\n=== SELESAI ===");
}

main().finally(() => process.exit(0));
