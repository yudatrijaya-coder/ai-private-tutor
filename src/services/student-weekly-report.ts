/**
 * Student Weekly Report Service
 *
 * Sends a compact quantitative weekly summary to each student's Telegram,
 * complementing the guardian report (parents get the long version, students
 * get a motivating short version).
 */

import { prisma } from "@/lib/prisma";
import { escapeHtml } from "@/lib/telegram-format";
import { claimOnce, releaseClaim, studentWeeklyReportKey } from "@/lib/cron/idempotency";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

interface StudentWeeklyData {
  student: { id: string; name: string; telegramId: string | null; currentStreak: number; xp: number };
  subjectAverages: { subject: string; avg: number }[];
  weakTopics: { topic: string; subject: string; mastery: number }[];
  quizzes7d: number;
  exams7d: number;
  bestExam7d: { score: number; maxScore: number } | null;
}

async function collect(studentId: string): Promise<StudentWeeklyData | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      telegramId: true,
      currentStreak: true,
      xp: true,
    },
  });
  if (!student || !student.telegramId) return null;

  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const [topics, quizzes7d, exams7d, bestExam7d] = await Promise.all([
    prisma.topicMastery.findMany({
      where: { studentId },
      orderBy: { mastery: "asc" },
    }),
    prisma.attempt.count({ where: { studentId, createdAt: { gte: weekAgo } } }),
    prisma.examAttempt.count({ where: { studentId, createdAt: { gte: weekAgo }, status: { in: ["COMPLETED", "ANALYZED"] } } }),
    prisma.examAttempt.findFirst({
      where: { studentId, createdAt: { gte: weekAgo }, status: { in: ["COMPLETED", "ANALYZED"] } },
      orderBy: { score: "desc" },
      select: { score: true, maxScore: true },
    }),
  ]);

  const bySubject = new Map<string, { sum: number; count: number }>();
  for (const t of topics) {
    const cur = bySubject.get(t.subject) ?? { sum: 0, count: 0 };
    cur.sum += t.mastery;
    cur.count += 1;
    bySubject.set(t.subject, cur);
  }
  const subjectAverages = Array.from(bySubject.entries()).map(([subject, d]) => ({
    subject,
    avg: d.sum / d.count,
  }));

  const weakTopics = topics
    .filter((t) => t.weaknessLevel !== "none")
    .slice(0, 3)
    .map((t) => ({ topic: t.topic, subject: t.subject, mastery: t.mastery }));

  return {
    student,
    subjectAverages,
    weakTopics,
    quizzes7d,
    exams7d,
    bestExam7d,
  };
}

function formatSummary(data: StudentWeeklyData): string {
  const { student } = data;
  const avgAll =
    data.subjectAverages.length > 0
      ? Math.round(
          data.subjectAverages.reduce((acc, s) => acc + s.avg, 0) /
            data.subjectAverages.length,
        )
      : null;

  const weakLines =
    data.weakTopics.length > 0
      ? data.weakTopics
          .map(
            (w) =>
              `• ${escapeHtml(w.topic)} (${escapeHtml(w.subject)}): ${Math.round(w.mastery)}%`,
          )
          .join("\n")
      : "Tidak ada — keren! 👏";

  const bestLine = data.bestExam7d
    ? `🏆 Exam terbaik: ${data.bestExam7d.score}/${data.bestExam7d.maxScore}`
    : "🏆 Belum ada exam minggu ini";

  return (
    `📊 <b>Ringkasan Mingguanmu, ${escapeHtml(student.name)}!</b>\n\n` +
    `🔥 Streak: <b>${student.currentStreak} hari</b> | ✨ XP: ${student.xp}\n` +
    (avgAll !== null ? `📚 Rata-rata penguasaan: <b>${avgAll}%</b>\n` : "") +
    (data.quizzes7d > 0 || data.exams7d > 0
      ? `📝 Minggu ini: ${data.quizzes7d} quiz & ${data.exams7d} exam\n`
      : "📝 Minggu ini belum ada quiz/exam — yuk mulai! 💪\n") +
    `${bestLine}\n\n` +
    `🎯 Topik yang masih perlu diperkuat:\n${weakLines}\n\n` +
    `Lanjutkan! Kamu bisa lihat perkembangan lengkap di:\n` +
    `<a href="https://senangbelajar.web.id/student/progress">📈 Halaman Progress</a>`
  );
}

export interface StudentWeeklyReportDeps {
  sendMessage?: (chatId: string, text: string) => Promise<boolean>;
  now?: Date;
  claimPrefix?: string;
}

export async function sendWeeklyStudentReports(
  deps: StudentWeeklyReportDeps = {},
): Promise<{
  sent: number;
  skipped: number;
  failed: number;
}> {
  if (!BOT_TOKEN && !deps.sendMessage) {
    // Ledger C-05: this used to `console.warn` and return an all-zero result,
    // which the cron route reported as `success: true`. A missing bot token is
    // a deployment fault, not a quiet no-op.
    throw new Error("TELEGRAM_BOT_TOKEN is not configured — student weekly reports cannot be sent.");
  }

  const now = deps.now ?? new Date();
  const send =
    deps.sendMessage ??
    (async (chatId: string, text: string) => {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: {
            debug_buttons: "inline",
            inline_keyboard: [
              [
                { text: "🧠 Quiz", url: "https://senangbelajar.web.id/student/quiz" },
                { text: "📈 Progress", url: "https://senangbelajar.web.id/student/progress" },
              ],
              [
                { text: "🔁 Review", url: "https://senangbelajar.web.id/student/review" },
                { text: "🏆 Peringkat", url: "https://senangbelajar.web.id/student/leaderboard" },
              ],
            ],
          },
        }),
      });
      return res.ok;
    });
  const claimPrefix = deps.claimPrefix ?? "";

  const students = await prisma.student.findMany({
    where: { status: "ACTIVE", telegramId: { not: null } },
    select: { id: true },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const s of students) {
    // Ledger C-13: the student digest has the same duplicate problem as the
    // parent digest — claim once per student per week.
    const claimKey = `${claimPrefix}${studentWeeklyReportKey(s.id, now)}`;
    if (!(await claimOnce(claimKey, { studentId: s.id }))) {
      skipped++;
      continue;
    }

    try {
      const data = await collect(s.id);
      if (!data || !data.student.telegramId) {
        skipped++;
        // Nothing to send, so do not hold the claim: the student may link a
        // Telegram account later in the same week and should receive the digest.
        await releaseClaim(claimKey);
        continue;
      }
      const text = formatSummary(data);
      const ok = await send(data.student.telegramId, text);
      if (ok) sent++;
      else {
        failed++;
        await releaseClaim(claimKey);
      }
    } catch (err) {
      console.error(`[StudentWeekly] Failed for ${s.id}:`, err);
      failed++;
      await releaseClaim(claimKey);
    }
  }

  console.log(
    `[StudentWeekly] done: sent=${sent} skipped=${skipped} failed=${failed}`,
  );
  return { sent, skipped, failed };
}
