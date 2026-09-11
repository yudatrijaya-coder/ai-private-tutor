/**
 * Verify the C-11 fix path end to end, minus Telegram.
 *
 * `/laporan` now generates the report on demand instead of reading AgentLog.
 * This calls the exact two functions the handler calls and prints the message
 * the parent would receive, so a formatting regression is visible here rather
 * than in production.
 *
 * Run: npx tsx scripts/verify-laporan-format.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { generateWeeklyReport } from "../src/agents/guardian/report";
import { formatWeeklyReport } from "../src/agents/guardian/notifier";

async function main() {
  const student = await prisma.student.findFirst({
    where: { parentTelegramId: { not: null } },
    select: { id: true, name: true, studentId: true },
    orderBy: { createdAt: "asc" },
  });
  if (!student) {
    console.log("SKIP: tidak ada siswa dengan parentTelegramId");
    return;
  }

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  const report = await generateWeeklyReport(student.id, periodStart, periodEnd);
  const text = formatWeeklyReport(report, student.name);

  console.log(`siswa   : ${student.studentId} / ${student.name}`);
  console.log(`periode : ${report.periodStart.slice(0, 10)} – ${report.periodEnd.slice(0, 10)}`);
  console.log(`subjects: ${report.subjects.length}, weakAreas: ${report.weakAreas.length}`);
  console.log("--- pesan yang diterima orang tua ---");
  console.log(text);
  console.log("--- cek ---");

  const failures: string[] = [];
  if (!text.includes("Laporan Mingguan")) failures.push("judul hilang");
  if (!text.includes("🗓")) failures.push("baris periode hilang");
  if (text.trim().length < 60) failures.push("teks terlalu pendek");
  if (text.includes("undefined")) failures.push("ada 'undefined'");
  if (text.includes("\\n")) failures.push("masih ada backslash-n literal");
  if (text.split("\n").length < 3) failures.push("tidak ada baris baru");

  if (failures.length) {
    console.log(`FAIL: ${failures.join("; ")}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${text.split("\n").length} baris, tidak ada 'undefined'/'\\n' literal`);
  }
}

main()
  .catch((e) => {
    console.error("ERROR:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
