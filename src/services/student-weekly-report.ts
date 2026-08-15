/**
 * Student Weekly Report Service
 *
 * Sends a compact quantitative weekly summary to each student's Telegram,
 * complementing the guardian report (parents get the long version, students
 * get a motivating short version).
 */

import { prisma } from "@/lib/prisma";

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
              `• ${w.topic} (${w.subject}): ${Math.round(w.mastery)}%`,
          )
          .join("\n")
      : "Tidak ada — keren! 👏";

  const bestLine = data.bestExam7d
    ? `🏆 Exam terbaik: ${data.bestExam7d.score}/${data.bestExam7d.maxScore}`
    : "🏆 Belum ada exam minggu ini";

  return (
    `📊 <b>Ringkasan Mingguanmu, ${student.name}!</b>\n\n` +
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

export async function sendWeeklyStudentReports(): Promise<{
  sent: number;
  skipped: number;
  failed: number;
}> {
  if (!BOT_TOKEN) {
    console.warn("[StudentWeekly] TELEGRAM_BOT_TOKEN not configured, skipping.");
    return { sent: 0, skipped: 0, failed: 0 };
  }

  const students = await prisma.student.findMany({
    where: { status: "ACTIVE", telegramId: { not: null } },
    select: { id: true },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const s of students) {
    try {
      const data = await collect(s.id);
      if (!data) {
        skipped++;
        continue;
      }
      const text = formatSummary(data);
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: data.student.telegramId,
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
      if (res.ok) sent++;
      else failed++;
    } catch (err) {
      console.error(`[StudentWeekly] Failed for ${s.id}:`, err);
      failed++;
    }
  }

  console.log(
    `[StudentWeekly] done: sent=${sent} skipped=${skipped} failed=${failed}`,
  );
  return { sent, skipped, failed };
}
