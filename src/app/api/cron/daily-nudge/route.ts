/**
 * Daily nudge cron — sends a reminder if student hasn't studied today.
 * Max 1 nudge per day per student.
 * Triggered once per day (configurable).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const students = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
      telegramId: { not: null },
    },
    select: {
      id: true,
      name: true,
      telegramId: true,
      lastActivityDate: true,
      currentStreak: true,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nudgeBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const results: string[] = [];

  for (const student of students) {
    const lastActivity = student.lastActivityDate
      ? new Date(student.lastActivityDate)
      : null;

    // Skip if already active today
    if (lastActivity) {
      lastActivity.setHours(0, 0, 0, 0);
      if (lastActivity.getTime() === today.getTime()) continue;
    }

    // Check if we already nudged today (simple approach: if streak is 0, nudge)
    // A proper approach would use a NudgeLog table — for MVP, skip if streak === 0 (never studied)
    // or if last activity was > 2 days ago
    if (!lastActivity) continue; // never studied, don't spam new users
    const daysSince = Math.round((today.getTime() - lastActivity.getTime()) / 86400000);
    if (daysSince < 2) continue; // only nudge if gap >= 2 days

    if (!nudgeBotToken || !student.telegramId) continue;

    // Saran topik lemah biar nudge lebih terarah
    const weakTopic = await prisma.topicMastery.findFirst({
      where: {
        studentId: student.id,
        weaknessLevel: { in: ["severe", "moderate"] },
      },
      orderBy: { mastery: "asc" },
    });

    const streakAtRisk = student.currentStreak >= 3;
    const streakMsg = student.currentStreak > 0
      ? `Streak kamu sedang di <b>${student.currentStreak} hari</b> — ${streakAtRisk ? "awas putus! 🔥" : "jangan putus!"}`
      : "Yuk mulai streak pertamamu!";

    // ── Daily recap: aktivitas 24 jam terakhir ──
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const [quizToday, minutesToday] = await Promise.all([
      prisma.attempt.count({ where: { studentId: student.id, createdAt: { gte: dayAgo } } }),
      prisma.studySession.aggregate({
        where: { studentId: student.id, startTime: { gte: dayAgo } },
        _sum: { durationMinutes: true },
      }),
    ]);
    const recapParts: string[] = [];
    if (quizToday > 0) recapParts.push(`${quizToday} quiz`);
    if ((minutesToday._sum.durationMinutes ?? 0) > 0) recapParts.push(`${Math.round(minutesToday._sum.durationMinutes ?? 0)} menit belajar`);
    const recapLine = recapParts.length > 0
      ? `📊 24 jam terakhir: <b>${recapParts.join(", ")}</b>\n\n`
      : "";
    const weakLine = weakTopic
      ? `🎯 Saran: perkuat <b>${weakTopic.topic}</b> (${weakTopic.subject})`
      : "";

    const message =
      `🌅 <b>Selamat pagi, ${student.name}!</b>\n\n` +
      `${streakMsg}\n\n` +
      (recapLine ? recapLine : "") +
      `Hari ini belum belajar? Yuk mulai 10 menit aja! 📚\n\n` +
      (weakLine ? weakLine + "\n" : "") +
      `🧠 <a href="https://senangbelajar.web.id/student/quiz">Mulai Quiz</a>\n` +
      `📖 <a href="https://senangbelajar.web.id/student/slides">Baca Materi</a>`;

    try {
      await fetch(`https://api.telegram.org/bot${nudgeBotToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: student.telegramId,
          text: message,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🧠 Mulai Quiz", url: "https://senangbelajar.web.id/student/quiz" },
                { text: "📖 Baca Materi", url: "https://senangbelajar.web.id/student/slides" },
              ],
              ...(weakTopic
                ? [
                    [
                      {
                        text: "🎯 Perkuat " + weakTopic.topic,
                        url:
                          "https://senangbelajar.web.id/student/subject/" +
                          encodeURIComponent(weakTopic.subject),
                      },
                    ],
                  ]
                : []),
            ],
          },
        }),
      });
      results.push(`nudged ${student.name}`);
    } catch (err) {
      results.push(`failed ${student.name}: ${err}`);
    }
  }

  return NextResponse.json({ ok: true, results });
}
