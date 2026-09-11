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
    speedIndex: number | null; // latest exam speed index (opt2)
    confidenceIndex: number | null; // latest exam confidence composite
    avgSecondsPerQuestion: number | null;
  };
}

export interface GuardianReportResult {
  /** Students considered (have a parentTelegramId and are ACTIVE). */
  total: number;
  /** Messages the Telegram API accepted. */
  sent: number;
  /** Messages the Telegram API rejected. */
  failed: number;
  /** Students skipped for a missing/invalid parent chat id. */
  skipped: number;
  errors: string[];
}

/**
 * Send a formatted Telegram message to a parent.
 *
 * Returns whether the API accepted it. Ledger C-05: this used to swallow every
 * failure (log-only), so a broken digest still reported success upstream.
 */
async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    // Ledger C-05: this used to `console.warn` and return, so a cron run with
    // no bot token looked identical to a successful one. Fail loudly instead.
    throw new Error("TELEGRAM_BOT_TOKEN is not configured — guardian reports cannot be sent.");
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
    return false;
  }

  return true;
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
    speedIndex,
    confidenceIndex,
    avgSecondsPerQuestion,
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

  if (speedIndex !== null) {
    message += `⚡ <b>Kecepatan & Keyakinan</b>\n`;
    message += `• Speed Index: ${speedIndex}${speedIndex >= 80 ? " 🚀" : speedIndex >= 60 ? " 👍" : " 🐢"}\n`;
    message += `• Confidence Index: ${confidenceIndex ?? "—"}\n`;
    message += `• Rata-rata waktu/soal: ${avgSecondsPerQuestion ?? "—"}s\n\n`;
  }

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
export async function sendWeeklyGuardianReports(): Promise<GuardianReportResult> {
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

  // Ledger C-05: the function used to return `void`, so the cron route could not
  // report what happened and the weekly trigger printed `Guardian: sent=0`
  // unconditionally. Count the real outcome.
  const result: GuardianReportResult = {
    total: students.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  for (const student of students) {
    if (!student.parentTelegramId) {
      result.skipped++;
      continue;
    }

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
        status: { in: ["COMPLETED", "ANALYZED"] },
      },
    });

    // Latest exam attempt (any time) — speed/confidence metrics (opt2)
    const latestExam = await prisma.examAttempt.findFirst({
      where: { studentId: student.id, status: { in: ["COMPLETED", "ANALYZED"] } },
      orderBy: { createdAt: "desc" },
    });
    const latestDetails = latestExam?.details as any | null;
    const speedIndex = latestDetails?.speedIndex ?? null;
    const confidenceIndex = latestDetails?.confidenceIndex ?? null;
    const avgSecondsPerQuestion =
      Array.isArray(latestDetails?.timeSpentMs) &&
      latestDetails.timeSpentMs.some((ms: unknown) => typeof ms === "number" && (ms as number) > 0)
        ? Math.round(
            (latestDetails.timeSpentMs
              .filter((ms: unknown) => typeof ms === "number" && (ms as number) > 0)
              .reduce((a: number, b: unknown) => a + (b as number), 0) /
              latestDetails.timeSpentMs.filter(
                (ms: unknown) => typeof ms === "number" && (ms as number) > 0,
              ).length /
              1000) *
              10,
          ) / 10
        : null;

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
        speedIndex,
        confidenceIndex,
        avgSecondsPerQuestion,
      },
    };

    const message = formatGuardianMessage(report);
    try {
      const ok = await sendTelegramMessage(student.parentTelegramId, message);
      if (ok) result.sent++;
      else {
        result.failed++;
        result.errors.push(`${student.name}: Telegram rejected the message`);
      }
    } catch (err) {
      result.failed++;
      result.errors.push(`${student.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(
    `[Guardian] Finished — sent=${result.sent} failed=${result.failed} skipped=${result.skipped} of ${result.total}`,
  );
  return result;
}
