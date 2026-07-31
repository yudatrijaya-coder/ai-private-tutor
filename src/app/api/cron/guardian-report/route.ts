/**
 * Parent weekly digest — sends a summary to parentTelegramId.
 * Based on the existing guardian-report endpoint but enhanced with gamification data.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const students = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
      parentTelegramId: { not: null },
    },
    include: {
      badges: { include: { badge: true }, orderBy: { unlockedAt: "desc" }, take: 3 },
    },
  });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const results: string[] = [];

  for (const student of students) {
    if (!student.parentTelegramId || !botToken) continue;

    // Gather this week's data
    const [attempts, activities, snaps] = await Promise.all([
      prisma.attempt.findMany({
        where: { studentId: student.id, createdAt: { gte: weekAgo } },
        select: { score: true, maxScore: true, type: true, createdAt: true },
      }),
      prisma.studentActivity.findMany({
        where: { studentId: student.id, createdAt: { gte: weekAgo } },
        select: { type: true, createdAt: true, timeSpent: true },
      }),
      prisma.progressSnap.findMany({
        where: { studentId: student.id, snapDate: { gte: weekAgo } },
        orderBy: { snapDate: "desc" },
        take: 1,
      }),
    ]);

    const quizCount = attempts.filter((a) => a.type === "QUIZ").length;
    const totalScore = attempts.reduce((s, a) => s + a.score, 0);
    const totalMax = attempts.reduce((s, a) => s + a.maxScore, 0);
    const avgScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
    const studyMinutes = Math.round(activities.reduce((s, a) => s + (a.timeSpent ?? 0), 0) / 60);
    const quizMinutes = Math.round(
      activities.filter((a) => a.type === "quiz_complete").reduce((s, _) => s + 10, 0),
    );

    const latestSnap = snaps[0];

    // Determine message tone based on score
    const emoji = avgScore >= 80 ? "🌟" : avgScore >= 50 ? "👍" : "💪";
    const tone =
      avgScore >= 80
        ? `${student.name} belajar dengan sangat baik minggu ini!`
        : avgScore >= 50
        ? `${student.name} sudah berusaha minggu ini, tetap semangat!`
        : `${student.name} butuh dukungan extra minggu ini. Yuk bantu dia belajar!`;

    let text = `<b>📊 Laporan Mingguan — ${student.name}</b>\n`;
    text += `📅 ${new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n\n`;
    text += `${emoji} ${tone}\n\n`;
    text += `<b>📚 Minggu Ini:</b>\n`;
    text += `• Quiz dikerjakan: <b>${quizCount}</b>x\n`;
    text += `• Rata-rata skor: <b>${avgScore}%</b>\n`;
    text += `• Waktu belajar: <b>${studyMinutes + quizMinutes} menit</b>\n`;
    text += `🔥 Streak: <b>${student.currentStreak} hari</b>\n`;
    text += `⭐ Total XP: <b>${student.xp}</b>\n`;

    if (student.badges.length > 0) {
      text += `\n🏆 Badge baru:\n`;
      for (const b of student.badges) {
        text += `  ${b.badge.icon} ${b.badge.name}\n`;
      }
    }

    if (latestSnap) {
      text += `\n📈 Topik yang dikuasai: <b>${Math.round(latestSnap.mastery * 100)}%</b>`;
    }

    text += `\n\n👉 <a href="https://senangbelajar.web.id/student">Buka Dashboard</a>`;

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: student.parentTelegramId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });
      results.push(`sent to ${student.name}'s parent`);
    } catch (err) {
      results.push(`failed ${student.name}: ${err}`);
    }
  }

  return NextResponse.json({ ok: true, results, studentsProcessed: students.length });
}
