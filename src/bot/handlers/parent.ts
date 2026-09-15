import type { Context } from "telegraf";
import { escapeMd } from "@/lib/telegram-format";
import type { Student } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { generateWeeklyReport } from "@/agents/guardian/report";
import { formatWeeklyReport } from "@/agents/guardian/notifier";

/**
 * /parent_daftar <studentId> — Link parent Telegram ID to a student.
 */
export async function handleParentRegister(
  ctx: Context,
  studentIdInput: string,
): Promise<void> {
  const studentId = studentIdInput.trim().toUpperCase();
  if (!ctx.from) return;

  const student = await prisma.student.findUnique({
    where: { studentId },
  });

  if (!student) {
    await ctx.reply(
      `Maaf, ID siswa *${studentId}* tidak ditemukan. 🤔\n\n` +
        `Coba periksa lagi ID-nya ya.`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // Link parent's Telegram ID to this student
  await prisma.student.update({
    where: { studentId },
    data: { parentTelegramId: String(ctx.from.id) },
  });

  await ctx.reply(
    `✅ Halo! Sekarang kamu terhubung sebagai orang tua / wali dari *${escapeMd(student.name)}*.\n\n` +
      `Berikut yang bisa kamu lakukan:\n\n` +
      `📊 /progres — Lihat progress belajar anak\n` +
      `📋 /laporan — Laporan mingguan\n` +
      `⚠️ /peringatan — Early warning (jika ada)\n` +
      `❓ /help — Bantuan`,
    { parse_mode: "Markdown" },
  );
}

/**
 * /progres — View child's learning progress.
 */
export async function handleProgress(
  ctx: Context,
  student: Student,
): Promise<void> {
  // Get latest progress snapshots
  const snaps = await prisma.progressSnap.findMany({
    where: { studentId: student.id },
    orderBy: { snapDate: "desc" },
    take: 10,
  });

  if (snaps.length === 0) {
    await ctx.reply(
      `📊 *Progress ${escapeMd(student.name)}*\n\n` +
        `Belum ada data progress. Anak kamu mungkin belum mulai belajar.`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // Group by subject
  const bySubject = new Map<string, typeof snaps>();
  for (const s of snaps) {
    if (!bySubject.has(s.subject)) bySubject.set(s.subject, []);
    bySubject.get(s.subject)!.push(s);
  }

  let text = `📊 *Progress ${student.name}*\n\n`;

  for (const [subject, subjectSnaps] of bySubject) {
    const latest = subjectSnaps[0];
    const pct = Math.round(latest.mastery * 100);
    const barLen = Math.round(pct / 10);
    const bar = "█".repeat(barLen) + "░".repeat(10 - barLen);
    text += `*${subject}:* ${bar} ${pct}%\n`;
  }

  text +=
    `\n🏆 Total kuis: ${snaps.reduce((a, s) => a + s.quizCount, 0)}` +
    `\n⏱ Total belajar: ${snaps.reduce((a, s) => a + s.studyMinutes, 0)} menit`;

  await ctx.reply(text, { parse_mode: "Markdown" });
}

/**
 * /laporan — View weekly guardian report.
 */
export async function handleReport(
  ctx: Context,
  student: Student,
): Promise<void> {
  // Ledger C-11: this used to look up `AgentLog` with `action: "report"` — a
  // value **no code ever writes** (every writer uses `"guardian-report"`), so
  // the command always answered "Belum ada laporan mingguan" no matter how many
  // reports had actually been sent. The stored `output` is a summary object
  // (`{subjects, weakAreas, safety}`), not report text, so even a matching
  // action would have dumped JSON at the parent. Generate the report on demand
  // and render it with the same formatter the weekly push uses.
  try {
    const periodEnd = new Date();
    const periodStart = new Date(
      periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000,
    );
    const report = await generateWeeklyReport(
      student.id,
      periodStart,
      periodEnd,
    );
    await ctx.reply(formatWeeklyReport(report, student.name), {
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error(
      "[parent/laporan] gagal membuat laporan:",
      err instanceof Error ? err.message : String(err),
    );
    await ctx.reply(
      `📋 *Laporan ${escapeMd(student.name)}*\n\n` +
        `Laporan sedang tidak bisa dibuat. Coba lagi nanti ya. 🙏`,
      { parse_mode: "Markdown" },
    );
  }
}

/**
 * /peringatan — View early warnings for the child.
 */
export async function handleWarning(
  ctx: Context,
  student: Student,
): Promise<void> {
  const warnings = await prisma.intervention.findMany({
    where: {
      studentId: student.id,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (warnings.length === 0) {
    await ctx.reply(
      `✅ Tidak ada peringatan untuk ${student.name}. Semua baik-baik saja! 🎉`,
    );
    return;
  }

  let text = `⚠️ *Peringatan untuk ${student.name}*\n\n`;
  for (const w of warnings) {
    const severityEmoji =
      w.severity === "HIGH" || w.severity === "EMERGENCY" ? "🔴" : "🟡";
    text += `${severityEmoji} *${w.issueType}:* ${w.description}\n`;
  }

  await ctx.reply(text, { parse_mode: "Markdown" });
}
