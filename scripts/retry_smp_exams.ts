import { prisma } from "../src/lib/prisma";
import { generateWeeklyExam } from "../src/services/weekly-exam-generator";

const JOBS = [
  { studentId: "RAIHAN001", subject: "Biologi" },
  { studentId: "RAIHAN001", subject: "Geografi" },
  { studentId: "RAIHAN001", subject: "Sejarah" },
];

async function main() {
  for (const job of JOBS) {
    const s = await prisma.student.findUnique({ where: { studentId: job.studentId } });
    if (!s) { console.log(`❌ Student not found: ${job.studentId}`); continue; }
    const existing = await prisma.exam.findFirst({
      where: { type: "WEEKLY", gradeLevel: s.gradeLevel, subject: job.subject },
    });
    if (existing) { console.log(`⏭️  ${job.subject} sudah ada`); continue; }
    console.log(`\n▶️  ${job.studentId} ${job.subject}...`);
    const t0 = Date.now();
    try {
      const res = await generateWeeklyExam({ studentId: s.id, subject: job.subject });
      console.log(`✅ ${job.subject} → ${res.examId} (${res.questionCount} soal, ${((Date.now()-t0)/1000).toFixed(0)}s)`);
    } catch (e) {
      console.error(`❌ ${job.subject}: ${(e as Error).message}`);
    }
  }
}
main().finally(() => process.exit(0));
