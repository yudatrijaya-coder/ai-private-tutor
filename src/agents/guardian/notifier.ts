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
 * Build the weekly report message body.
 *
 * Extracted from `sendWeeklyReportToParent` (ledger C-11) so the bot's
 * `/laporan` handler can render the same text on demand. Previously `/laporan`
 * read `AgentLog` looking for `action: "report"` — a value **nothing ever
 * wrote** (the writers use `"guardian-report"`), so the command always answered
 * "Belum ada laporan mingguan" no matter how many reports had been sent. The
 * stored `output` is a summary object (`{subjects, weakAreas, safety}`), not
 * the report text, so it could not have rendered a readable report anyway.
 *
 * @param report      Generated report.
 * @param studentName Name to show in the heading.
 */
export function formatWeeklyReport(
  report: WeeklyReport,
  studentName: string,
): string {
  const lines: string[] = [
    `📋 *Laporan Mingguan — ${esc(studentName)}*`,
    `🗓 ${report.periodStart.slice(0, 10)} – ${report.periodEnd.slice(0, 10)}`,
    "",
  ];

  // Subject summaries
  for (const s of report.subjects) {
    const pct = Math.round(s.mastery * 100);
    lines.push(`${esc(s.subject)}: ${masteryBar(pct)} ${pct}%`);
  }

  if (report.subjects.length === 0) {
    lines.push("_Belum ada aktivitas belajar pada periode ini._");
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

  return lines.join("\n");
}

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

  const text = formatWeeklyReport(report, student.name);

  try {
    await bot.telegram.sendMessage(student.parentTelegramId, text, {
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
    `🚨 *DARURAT — ${esc(student.name)}*\n\n` +
    `*Jenis:* ${esc(issueType)}\n` +
    `${esc(description)}\n\n` +
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
