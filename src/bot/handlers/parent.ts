import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

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
    `✅ Halo! Sekarang kamu terhubung sebagai orang tua / wali dari *${student.name}*.\n\n` +
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
      `📊 *Progress ${student.name}*\n\n` +
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
  // Get recent agent logs for guardian reports
  const report = await prisma.agentLog.findFirst({
    where: {
      studentId: student.id,
      agentType: "GUARDIAN",
      action: "report",
      status: "COMPLETED",
    },
    orderBy: { createdAt: "desc" },
  });

  if (report?.output) {
    const output =
      typeof report.output === "string"
        ? report.output
        : JSON.stringify(report.output);
    await ctx.reply(
      `📋 *Laporan ${student.name}*\n\n${output}`,
      { parse_mode: "Markdown" },
    );
  } else {
    await ctx.reply(
      `📋 *Laporan ${student.name}*\n\n` +
        `Belum ada laporan mingguan. Laporan akan dibuat otomatis setiap minggu. 🗓️`,
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
