/**
 * Guardian Notifier — pushes reports, early warnings, and emergency
 * alerts to the parent's Telegram chat.
 *
 * @module @/agents/guardian/notifier
 */

import { prisma } from "@/lib/prisma";
import { bot } from "@/bot/bot";
import type { WeeklyReport } from "./report";
import type { EarlyWarningResult } from "./early-warning";

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

/** Escape Telegram Markdown special characters. */
function esc(text: string): string {
  return text
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/\[/g, "\\[")
    .replace(/`/g, "\\`");
}

function masteryBar(pct: number): string {
  const filled = Math.round(pct / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

/* ------------------------------------------------------------------ */
/*  Send functions                                                     */
/* ------------------------------------------------------------------ */

/**
 * Send a weekly report to the student's parent via Telegram.
 * Silently skips if no parentTelegramId or bot unavailable.
 */
export async function sendWeeklyReportToParent(
  report: WeeklyReport,
): Promise<boolean> {
  if (!bot) return false;

  const student = await prisma.student.findUnique({
    where: { id: report.studentId },
    select: { parentTelegramId: true, name: true },
  });
  if (!student?.parentTelegramId) return false;

  const lines: string[] = [
    `📋 *Laporan Mingguan — ${esc(student.name)}*`,
    `🗓 ${report.periodStart.slice(0, 10)} – ${report.periodEnd.slice(0, 10)}`,
    "",
  ];

  // Subject summaries
  for (const s of report.subjects) {
    const pct = Math.round(s.mastery * 100);
    lines.push(`${esc(s.subject)}: ${masteryBar(pct)} ${pct}%`);
  }

  if (report.weakAreas.length > 0) {
    lines.push(
      "",
      "⚠️ *Area yang perlu perhatian:*",
      ...report.weakAreas.map(
        (w) => `• ${esc(w.subject)} (${Math.round(w.mastery * 100)}%)`,
      ),
    );
  }

  if (report.missedSessions > 0) {
    lines.push("", `📌 ${report.missedSessions} sesi terlewat minggu ini`);
  }

  if (report.recommendations.length > 0) {
    lines.push(
      "",
      "💡 *Rekomendasi:*",
      ...report.recommendations.slice(0, 3).map((r) => `• ${esc(r)}`),
    );
  }

  lines.push(
    "",
    `_Laporan dibuat ${report.llmGenerated ? "dengan AI" : "otomatis"}_`,
  );

  try {
    await bot.telegram.sendMessage(student.parentTelegramId, lines.join("\n"), {
      parse_mode: "Markdown",
    });
    console.log(
      `[guardian/notifier] Weekly report sent to parent of ${report.studentId}`,
    );
    return true;
  } catch (err) {
    console.error(
      "[guardian/notifier] Failed to send weekly report:",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

/**
 * Send early warning alert to the student's parent.
 */
export async function sendEarlyWarningToParent(
  studentId: string,
  warnings: EarlyWarningResult,
): Promise<boolean> {
  if (!bot || warnings.issues.length === 0) return false;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { parentTelegramId: true, name: true },
  });
  if (!student?.parentTelegramId) return false;

  const lines: string[] = [
    `⚠️ *Peringatan — ${esc(student.name)}*`,
    "",
  ];

  for (const issue of warnings.issues) {
    const icon =
      issue.severity === "EMERGENCY"
        ? "🔴"
        : issue.severity === "HIGH"
          ? "🟠"
          : "🟡";
    lines.push(`${icon} *${issue.issueType}*`);
    lines.push(`  ${esc(issue.description)}`);
    lines.push("");
  }

  lines.push("Ketik /peringatan untuk detail lebih lanjut.");

  try {
    await bot.telegram.sendMessage(student.parentTelegramId, lines.join("\n"), {
      parse_mode: "Markdown",
    });
    console.log(
      `[guardian/notifier] Early warning sent to parent of ${studentId}`,
    );
    return true;
  } catch (err) {
    console.error(
      "[guardian/notifier] Failed to send early warning:",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

/**
 * Send emergency escalation alert to the student's parent.
 */
export async function sendEmergencyAlertToParent(
  studentId: string,
  issueType: string,
  description: string,
): Promise<boolean> {
  if (!bot) return false;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { parentTelegramId: true, name: true },
  });
  if (!student?.parentTelegramId) return false;

  const text =
    `🚨 *DARURAT — ${esc(student.name)}*\\n\\n` +
    `*Jenis:* ${esc(issueType)}\\n` +
    `${esc(description)}\\n\\n` +
    `_Segera hubungi pihak terkait._`;

  try {
    await bot.telegram.sendMessage(student.parentTelegramId, text, {
      parse_mode: "Markdown",
    });
    console.log(
      `[guardian/notifier] Emergency alert sent to parent of ${studentId}`,
    );
    return true;
  } catch (err) {
    console.error(
      "[guardian/notifier] Failed to send emergency alert:",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}
