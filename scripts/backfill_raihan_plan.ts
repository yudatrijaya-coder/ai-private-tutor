import { prisma } from "../src/lib/prisma";
import { enforceImprovementPlan } from "../src/services/exam-scheduler";
import fs from "fs";

// Load .env manually (tsx doesn't auto-load dotenv)
const envRaw = fs.readFileSync(".env", "utf8");
const tokenMatch = envRaw.match(/^TELEGRAM_BOT_TOKEN=(.+)$/m);
const token = tokenMatch ? tokenMatch[1].trim().replace(/\\\$/g, "$") : null;
process.env.TELEGRAM_BOT_TOKEN = token ?? "";

/**
 * Backfill: enforce the improvement plan for Raihan's existing (already-ANALYZED)
 * weekly exam attempt, and notify via Telegram with weakness + plan summary.
 */
async function main() {
  const attempt = await prisma.examAttempt.findFirst({
    where: { student: { studentId: "RAIHAN001" }, exam: { type: "WEEKLY" } },
    include: { student: true, improvementPlan: true, exam: true },
    orderBy: { createdAt: "desc" },
  });
  if (!attempt) { console.log("no attempt"); return; }

  // 1. Enforce improvement plan → INTENSIVE sessions
  const created = await enforceImprovementPlan(attempt.id);
  console.log("INTENSIVE sessions created:", created);

  // 2. Send weakness + plan message to student
  const plan = attempt.improvementPlan;
  if (!plan) { console.log("no improvement plan"); return; }

  const recs = (plan.recommendedSch as any[]) || [];
  const high = recs.filter((r) => r.priority === "high");
  const med = recs.filter((r) => r.priority === "medium");

  const lines: string[] = [];
  lines.push(`📚 *Hasil Weekly Exam — ${attempt.exam.title}*`);
  lines.push(`📊 Nilai: *${attempt.score}%*`);
  lines.push("");
  lines.push("🔴 *Prioritas utama (harus dikuasai):*");
  high.forEach((r, i) => lines.push(`${i + 1}. *${r.topic}* — ${r.reason}`));
  if (med.length) {
    lines.push("");
    lines.push("🟡 *Lanjutan:*");
    med.forEach((r, i) => lines.push(`${high.length + i + 1}. ${r.topic}`));
  }
  lines.push("");
  lines.push(`💡 ${plan.aiNarrative.slice(0, 400)}`);
  lines.push("");
  lines.push("🗓️ *Jadwal intensif sudah dibuat* — topik di atas akan dibahas bertahap.");

  const text = lines.join("\n");

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.log("NO TOKEN"); return; }
  const tgId = attempt.student.telegramId;
  if (!tgId) { console.log("NO telegramId"); return; }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: tgId, text, parse_mode: "Markdown" }),
  });
  const body = await res.json();
  console.log("telegram send:", res.status, body.ok ? "OK" : JSON.stringify(body).slice(0, 200));
}

main().finally(() => process.exit(0));
