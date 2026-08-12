/**
 * Guardian Telegram Report Service
 * Sends weekly progress summaries to parents via Telegram.
 */

import { prisma } from "@/lib/prisma";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

interface GuardianReport {
  studentName: string;
  parentTelegramId: string;
  weekSummary: {
    topicsStudied: number;
    quizzesTaken: number;
    examsTaken: number;
    overallMastery: number;
    topWeaknesses: Array<{
      subject: string;
      topic: string;
      mastery: number;
      weaknessLevel: string;
    }>;
    streakDays: number;
    improvements: string[]; // positive changes
  };
}

/**
 * Send a formatted Telegram message to a parent.
 */
async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  if (!BOT_TOKEN) {
    console.warn("[Guardian] TELEGRAM_BOT_TOKEN not configured, skipping send.");
    return;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[Guardian] Failed to send Telegram message to ${chatId}:`, err);
  }
}

/**
 * Format a GuardianReport into a nice Telegram HTML message.
 */
function formatGuardianMessage(report: GuardianReport): string {
  const { studentName, weekSummary } = report;
  const {
    topicsStudied,
    quizzesTaken,
    examsTaken,
    overallMastery,
    topWeaknesses,
    streakDays,
    improvements,
  } = weekSummary;

  const masteryEmoji = overallMastery >= 80 ? "🟢" : overallMastery >= 60 ? "🟡" : "🔴";
  const weaknessEmoji = (level: string) =>
    level === "severe" ? "🔴" : level === "moderate" ? "🟡" : level === "mild" ? "🟠" : "🟢";

  let message = `📊 <b>Laporan Mingguan — ${studentName}</b>\n`;
  message += `━━━━━━━━━━━━━━━━━\n\n`;

  message += `📈 <b>Ringkasan Minggu Ini</b>\n`;
  message += `• Topik dipelajari: ${topicsStudied}\n`;
  message += `• Quiz diselesaikan: ${quizzesTaken}\n`;
  message += `• Ujian diselesaikan: ${examsTaken}\n`;
  message += `• Hari beruntun: ${streakDays} 🔥\n`;
  message += `• Penguasaan keseluruhan: ${masteryEmoji} ${overallMastery.toFixed(1)}%\n\n`;

  if (improvements.length > 0) {
    message += `✨ <b>Peningkatan</b>\n`;
    for (const imp of improvements) {
      message += `• ${imp}\n`;
    }
    message += "\n";
  }

  if (topWeaknesses.length > 0) {
    message += `⚠️ <b>Topik yang Perlu Diperbaiki</b>\n`;
    for (const w of topWeaknesses) {
      message += `${weaknessEmoji(w.weaknessLevel)} <b>${w.subject}</b> — ${w.topic}\n`;
      message += `   Penguasaan: ${w.mastery.toFixed(1)}% | Level: ${w.weaknessLevel}\n\n`;
    }
    message += `💡 <i>Orang tua dapat membantu dengan menjelaskan konsep di atas.</i>\n\n`;
  }

  message += `━━━━━━━━━━━━━━━━━\n`;
  message += `📚 AI Private Tutor — ${studentName}`;

  return message;
}

/**
 * Generate and send weekly guardian reports for all students with parent Telegram IDs.
 * Call this from a cron job (e.g., every Sunday at 18:00 WIB).
 */
export async function sendWeeklyGuardianReports(): Promise<void> {
  // Get all students with parent telegram IDs
  const students = await prisma.student.findMany({
    where: {
      parentTelegramId: { not: null },
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      parentTelegramId: true,
    },
  });

  console.log(`[Guardian] Processing ${students.length} students for weekly reports...`);

  for (const student of students) {
    if (!student.parentTelegramId) continue;

    // Get this week's data
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Quiz attempts this week
    const quizAttempts = await prisma.attempt.count({
      where: {
        studentId: student.id,
        createdAt: { gte: oneWeekAgo },
      },
    });

    // Exam attempts this week
    const examAttempts = await prisma.examAttempt.count({
      where: {
        studentId: student.id,
        createdAt: { gte: oneWeekAgo },
      },
    });

    // Topic mastery data
    const masteries = await prisma.topicMastery.findMany({
      where: { studentId: student.id },
    });

    const topicsStudied = masteries.filter(
      m => m.lastAttemptAt && m.lastAttemptAt >= oneWeekAgo
    ).length;

    const overallMastery = masteries.length > 0
      ? masteries.reduce((sum, m) => sum + m.mastery, 0) / masteries.length
      : 0;

    // Top weaknesses
    const topWeaknesses = [...masteries]
      .filter(m => m.weaknessLevel !== "none")
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 3)
      .map(m => ({
        subject: m.subject,
        topic: m.topic,
        mastery: m.mastery,
        weaknessLevel: m.weaknessLevel,
      }));

    // Best streak
    const maxStreak = Math.max(0, ...masteries.map(m => m.streakDays));

    // Improvements (topics that improved significantly this week)
    const improvements: string[] = [];
    for (const m of masteries) {
      if (m.lastAttemptAt && m.lastAttemptAt >= oneWeekAgo && m.quizAttempts > 0) {
        if (m.mastery >= 80) {
          improvements.push(`${m.subject} — ${m.topic}: now ${m.mastery.toFixed(0)}% mastery!`);
        }
      }
    }

    const report: GuardianReport = {
      studentName: student.name,
      parentTelegramId: student.parentTelegramId,
      weekSummary: {
        topicsStudied,
        quizzesTaken: quizAttempts,
        examsTaken: examAttempts,
        overallMastery,
        topWeaknesses,
        streakDays: maxStreak,
        improvements: improvements.slice(0, 3),
      },
    };

    const message = formatGuardianMessage(report);
    await sendTelegramMessage(student.parentTelegramId, message);
  }

  console.log(`[Guardian] Finished sending ${students.length} weekly reports.`);
}
