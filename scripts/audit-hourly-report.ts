#!/usr/bin/env tsx
/**
 * Hourly audit progress reporter + incremental apply.
 * Runs as cron every hour. Checks if audit is running and sends status to Telegram.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { prisma } from "../src/lib/prisma";

const PROGRESS_FILE = join(process.cwd(), "audit-reports", "sd5-progress.json");
const REPORT_FILE = join(process.cwd(), "audit-reports", "sd5-apply-report.json");
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID = process.env.HERMES_TELEGRAM_CHAT_ID ?? "";

interface Progress {
  startedAt: string;
  total: number;
  done: number;
  applied: number;
  errors: number;
  highSev: number;
  running: boolean;
  lastError?: string;
}

function loadProgress(): Progress {
  if (existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
    } catch {
      // ignore
    }
  }
  return { startedAt: "", total: 0, done: 0, applied: 0, errors: 0, highSev: 0, running: false };
}

function saveProgress(p: Progress) {
  mkdirSync("audit-reports", { recursive: true });
  writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

async function sendTelegram(text: string) {
  if (!BOT_TOKEN || !CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "Markdown" }),
    });
  } catch (e) {
    console.error("Telegram send failed:", e);
  }
}

async function main() {
  const p = loadProgress();
  const elapsed = p.startedAt
    ? Math.round((Date.now() - new Date(p.startedAt).getTime()) / 60000)
    : 0;
  const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;

  const lines = [
    `📊 *Audit SD_5 Progress*`,
    `━━━━━━━━━━━━━━━━`,
    `⏱ ${elapsed}m elapsed | *${pct}%* done (${p.done}/${p.total})`,
    `✅ Applied: ${p.applied} fixes`,
    `🔴 High-sev flagged: ${p.highSev}`,
    `❌ Errors: ${p.errors}`,
    p.lastError ? `Last error: \`${p.lastError.slice(0, 80)}\`` : "",
    p.running ? "🔄 Still running..." : "✅ Completed",
  ].filter(Boolean);

  const msg = lines.join("\n");
  console.log(msg);
  await sendTelegram(msg);

  // On completion, load final report and summarize top issues
  if (!p.running && existsSync(REPORT_FILE)) {
    try {
      const report = JSON.parse(readFileSync(REPORT_FILE, "utf8"));
      const highSevItems = (report.results as any[])
        .filter(
          (r) =>
            !r.skipped &&
            !r.error &&
            (r.slideIssues?.some((i: any) => i.severity === "high") ||
              r.quizIssues?.some((i: any) => i.severity === "high")),
        );
      if (highSevItems.length > 0) {
        const detail = highSevItems
          .slice(0, 5)
          .map(
            (r: any) =>
              `• *${r.subject}/${r.topic}*: ${r.slideIssues.filter((i: any) => i.severity === "high").length} slide + ${r.quizIssues.filter((i: any) => i.severity === "high").length} quiz high-sev issues`,
          )
          .join("\n");
        await sendTelegram(
          `🔴 *${highSevItems.length} high-severity items need review:*\n${detail}`,
        );
      } else {
        await sendTelegram(
          `✅ *SD_5 audit COMPLETE*\n${report.appliedFixes} fixes applied, 0 high-sev.`,
        );
      }
    } catch {}
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect().catch(() => {}));
