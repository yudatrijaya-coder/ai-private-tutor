/**
 * Bot command router + Telegram command menu setup.
 *
 * IMPORTANT: In webhook mode (`src/app/api/bot/webhook/route.ts`) the app builds a
 * Telegraf `Context` by hand and calls `onMessage` directly — Telegraf's own
 * `bot.command()` middleware is NEVER executed. So commands MUST be routed
 * explicitly from `handlers/message.ts` via `routeCommand()` below.
 */
import type { Context, Telegraf } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const DASHBOARD = "https://senangbelajar.web.id/student";

/** Commands registered in the Telegram "/" menu. */
export const COMMAND_MENU = [
  { command: "start", description: "Mulai / daftar ulang" },
  { command: "quiz", description: "Kerjakan kuis" },
  { command: "review", description: "Ulangi soal yang pernah salah" },
  { command: "materi", description: "Lihat materi pelajaran" },
  { command: "jadwal", description: "Cek jadwal belajar" },
  { command: "jadwal_sekolah", description: "Cek jadwal sekolah" },
  { command: "pr", description: "Catat / lihat PR" },
  { command: "badge", description: "XP, streak & badge kamu" },
  { command: "nilai", description: "Lihat nilai & progres" },
  { command: "web", description: "Buka dashboard" },
  { command: "help", description: "Tampilkan bantuan" },
];

/** Push the command list to Telegram so it shows in the "/" menu. */
export async function registerCommandMenu(bot: Telegraf): Promise<void> {
  try {
    await bot.telegram.setMyCommands(COMMAND_MENU);
    console.log(`[bot] Command menu registered (${COMMAND_MENU.length} commands)`);
  } catch (err) {
    console.error("[bot] Failed to register command menu:", err);
  }
}

export async function sendHelp(ctx: Context, student: Student): Promise<void> {
  const { getPersona } = await import("./personas");
  const persona = getPersona(student.persona);
  await ctx.reply(
    `${persona.emoji} *Bantuan Perintah*\n\n` +
      `/quiz — Kerjakan kuis 🧠\n` +
      `/review — Ulangi soal yang pernah salah 🔁\n` +
      `/materi — Lihat materi pelajaran 📗\n` +
      `/jadwal — Cek jadwal belajar 📅\n` +
      `/jadwal_sekolah — Jadwal sekolah asli 🏫\n` +
      `/pr — Catat / lihat PR 📖\n` +
      `/badge — XP, streak & badge 🏆\n` +
      `/nilai — Nilai dan progres 📊\n` +
      `/web — Buka dashboard 🌐\n` +
      `/help — Bantuan ini\n\n` +
      `Atau cukup tanya aja langsung! 😊`,
    { parse_mode: "Markdown" },
  );
}

/** /badge — XP, streak, badges from real DB data. */
export async function sendBadges(ctx: Context, student: Student): Promise<void> {
  const fresh = await prisma.student.findUnique({
    where: { id: student.id },
    include: {
      badges: { include: { badge: true }, orderBy: { unlockedAt: "desc" } },
    },
  });
  if (!fresh) return;

  const totalBadges = await prisma.badge.count();

  const lines = [
    `🏆 *Pencapaian ${fresh.name}*`,
    "",
    `⭐ Total XP: *${fresh.xp}*`,
    `🔥 Streak: *${fresh.currentStreak} hari* (terbaik: ${fresh.longestStreak})`,
    `🎖 Badge: *${fresh.badges.length}/${totalBadges}*`,
  ];

  if (fresh.badges.length === 0) {
    lines.push("", "Belum ada badge. Kerjakan /quiz untuk badge pertamamu! 💪");
  } else {
    lines.push("", "*Badge yang sudah didapat:*");
    for (const sb of fresh.badges) {
      lines.push(`${sb.badge.icon} *${sb.badge.name}* — ${sb.badge.description}`);
    }
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
}

/** /review — spaced repetition due list. */
export async function sendReview(ctx: Context, student: Student): Promise<void> {
  const { getDueReviews } = await import("@/lib/spaced-repetition");
  const due = await getDueReviews(student.id, 10);

  if (due.length === 0) {
    const pending = await prisma.reviewQueue.count({
      where: { studentId: student.id, mastered: false },
    });
    const msg =
      pending > 0
        ? `✅ Tidak ada soal yang jatuh tempo hari ini.\n\nMasih ada *${pending}* soal dalam antrean review — nanti muncul sesuai jadwalnya ya! 😊`
        : `🎉 Semua soal sudah kamu kuasai! Belum ada yang perlu diulang.\n\nKerjakan /quiz untuk latihan baru.`;
    await ctx.reply(msg, { parse_mode: "Markdown" });
    return;
  }

  const bySubject = new Map<string, number>();
  for (const item of due) {
    bySubject.set(item.subject || "Umum", (bySubject.get(item.subject || "Umum") ?? 0) + 1);
  }

  const lines = [
    `🔁 *Waktunya Review!*`,
    "",
    `Ada *${due.length}* soal yang perlu kamu ulang hari ini:`,
    "",
    ...[...bySubject.entries()].map(([subject, n]) => `• ${subject} — ${n} soal`),
    "",
    `Soal ini pernah kamu jawab salah. Mengulangnya sekarang bikin lebih nempel! 🧠`,
    "",
    `[Mulai Review](${DASHBOARD}/quiz)`,
  ];

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
}

/** /nilai — progress summary with gamification. */
export async function sendProgress(ctx: Context, student: Student): Promise<void> {
  const fresh = await prisma.student.findUnique({ where: { id: student.id } });
  if (!fresh) return;

  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [attempts, weekAttempts, reviewPending] = await Promise.all([
    prisma.attempt.findMany({
      where: { studentId: student.id },
      select: { score: true, maxScore: true },
    }),
    prisma.attempt.count({ where: { studentId: student.id, createdAt: { gte: weekAgo } } }),
    prisma.reviewQueue.count({ where: { studentId: student.id, mastered: false } }),
  ]);

  const totalScore = attempts.reduce((s, a) => s + a.score, 0);
  const totalMax = attempts.reduce((s, a) => s + a.maxScore, 0);
  const avg = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  const lines = [
    `📊 *Progres ${fresh.name}*`,
    "",
    `📝 Quiz dikerjakan: *${attempts.length}*`,
    `📅 Minggu ini: *${weekAttempts}* quiz`,
    `🎯 Rata-rata skor: *${avg}%*`,
    `🔥 Streak: *${fresh.currentStreak} hari*`,
    `⭐ XP: *${fresh.xp}*`,
  ];

  if (reviewPending > 0) lines.push(`🔁 Perlu review: *${reviewPending}* soal — ketik /review`);
  if (attempts.length === 0) lines.push("", "Belum pernah quiz. Yuk mulai dengan /quiz! 💪");

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
}

/** /pr — homework list shortcut. */
export async function sendHomework(ctx: Context, student: Student): Promise<void> {
  const tasks = await prisma.homeworkTask.findMany({
    where: { studentId: student.id },
    orderBy: { deadlineAt: "asc" },
    take: 10,
  });

  if (tasks.length === 0) {
    await ctx.reply(
      `📖 Belum ada PR yang tercatat.\n\nCatat PR dengan ngomong biasa aja, contoh:\n_"PR matematika halaman 42, dikumpul Jumat"_`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  const lines = ["📖 *PR & Tugas Kamu*", ""];
  for (const t of tasks) {
    const deadline = t.deadlineAt
      ? new Date(t.deadlineAt).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })
      : "tanpa deadline";
    const done = (t as { status?: string }).status === "DONE";
    lines.push(`${done ? "✅" : "⬜"} *${t.subject}* — ${t.description ?? ""} (${deadline})`);
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
}

/**
 * Route a slash command for a registered student.
 * Returns true when the command was handled (caller should stop).
 */
export async function routeCommand(
  ctx: Context,
  student: Student,
  text: string,
): Promise<boolean> {
  const cmd = text.trim().toLowerCase().split(/\s+/)[0].replace(/@[\w_]+$/, "");

  switch (cmd) {
    case "/help":
      await sendHelp(ctx, student);
      return true;
    case "/badge":
    case "/badges":
    case "/xp":
      await sendBadges(ctx, student);
      return true;
    case "/review":
    case "/ulang":
      await sendReview(ctx, student);
      return true;
    case "/nilai":
      await sendProgress(ctx, student);
      return true;
    case "/pr":
    case "/tugas":
      await sendHomework(ctx, student);
      return true;
    default:
      return false;
  }
}
