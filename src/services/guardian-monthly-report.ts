/**
 * Guardian Monthly Report Service
 * Sends a monthly progress digest to parents via Telegram: mastery trend per
 * subject (first-vs-last ProgressSnap delta), quizzes taken that month, and
 * the topics still weakest.
 *
 * Distinct from weekly guardian-report.ts: covers a full calendar month
 * (always the month BEFORE `now` — run on the 1st), and focuses on trend
 * instead of week activity.
 *
 * Anti-hallucination: every number is computed from `ProgressSnap`
 * (quizCount is cumulative, so month activity = end.quizCount − start.quizCount)
 * and `TopicMastery`. Nothing is generated; format only.
 */

import { prisma } from "@/lib/prisma";
import { claimOnce, releaseClaim } from "@/lib/cron/idempotency";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

interface SubjectTrend {
  subject: string;
  masteryStart: number; // 0–100, baseline snapshot at/just-before month start
  masteryEnd: number; // 0–100, latest snapshot at/just-before month end
  quizzesInMonth: number;
  hasBaseline: boolean; // false when this month has the subject's first snapshot
}

interface MonthlyReport {
  studentName: string;
  parentTelegramId: string;
  monthLabel: string; // e.g. "Agustus 2026"
  totalQuizzes: number;
  subjects: SubjectTrend[]; // sorted by quizzes desc
  topWeaknesses: Array<{ subject: string; topic: string; mastery: number }>;
}

export interface GuardianMonthlyResult {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export interface GuardianMonthlyDeps {
  sendMessage?: (chatId: string, text: string) => Promise<boolean>;
  now?: Date;
  claimPrefix?: string;
}

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured — guardian monthly reports cannot be sent.");
  }
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  if (!response.ok) {
    const err = await response.text();
    console.error(`[GuardianMonthly] Telegram rejected ${chatId}:`, err);
    return false;
  }
  return true;
}

function trendArrow(s: SubjectTrend): string {
  if (s.quizzesInMonth === 0) return "•"; // no activity — no claim either way
  if (!s.hasBaseline) return "🆕"; // first snapshot ever — no delta to claim
  const delta = s.masteryEnd - s.masteryStart;
  if (delta >= 5) return "📈";
  if (delta <= -5) return "📉";
  return "➖";
}

function formatMonthlyMessage(report: MonthlyReport): string {
  const { studentName, monthLabel, totalQuizzes, subjects, topWeaknesses } = report;

  let message = `🗓 <b>Laporan Bulanan — ${studentName}</b>\n`;
  message += `Periode: <b>${monthLabel}</b>\n`;
  message += `━━━━━━━━━━━━━━━━━\n\n`;

  if (subjects.length === 0) {
    message += `Belum ada data progress untuk periode ini.\n\n`;
  } else {
    message += `📝 Total quiz bulan ini: <b>${totalQuizzes}</b>\n\n`;
    const active = subjects.filter((s) => s.quizzesInMonth > 0);
    const idle = subjects.filter((s) => s.quizzesInMonth === 0);
    if (active.length > 0) {
      message += `📈 <b>Tren Penguasaan per Mapel</b>\n`;
      for (const s of active) {
        const arrow = trendArrow(s);
        const deltaTxt = !s.hasBaseline
          ? `pertama kali tercatat: ${s.masteryEnd.toFixed(1)}%`
          : `${s.masteryEnd - s.masteryStart >= 0 ? "+" : ""}${(s.masteryEnd - s.masteryStart).toFixed(1)} poin → ${s.masteryEnd.toFixed(1)}%`;
        message += `${arrow} <b>${s.subject}</b>: ${deltaTxt} — ${s.quizzesInMonth} quiz\n`;
      }
      message += "\n";
    }
    if (idle.length > 0) {
      message += `💤 ${idle.length} mapel tanpa quiz bulan ini (penguasaan terakhir tidak berubah)\n\n`;
    }
  }

  if (topWeaknesses.length > 0) {
    message += `⚠️ <b>Masih Perlu Perhatian</b>\n`;
    for (const w of topWeaknesses) {
      message += `• <b>${w.subject}</b> — ${w.topic} (penguasaan ${w.mastery.toFixed(0)}%)\n`;
    }
    message += `\n💡 <i>Topik di atas diambil dari penguasaan terkini, bukan hanya bulan ini.</i>\n\n`;
  }

  message += `━━━━━━━━━━━━━━━━━\n`;
  message += `📚 AI Private Tutor — ${studentName}`;
  return message;
}

export async function sendMonthlyGuardianReports(
  deps: GuardianMonthlyDeps = {},
): Promise<GuardianMonthlyResult> {
  const now = deps.now ?? new Date();
  const send = deps.sendMessage ?? sendTelegramMessage;
  const claimPrefix = deps.claimPrefix ?? "";

  // Reporting window: the full month before `now`.
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = monthStart.toLocaleString("id-ID", { month: "long", year: "numeric" });
  const claimMonth = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;

  const students = await prisma.student.findMany({
    where: { parentTelegramId: { not: null }, status: "ACTIVE" },
    select: { id: true, name: true, parentTelegramId: true },
  });

  console.log(`[GuardianMonthly] ${students.length} student(s), window ${monthStart.toISOString()} .. ${monthEnd.toISOString()}`);

  const result: GuardianMonthlyResult = { total: students.length, sent: 0, failed: 0, skipped: 0, errors: [] };

  for (const student of students) {
    if (!student.parentTelegramId) {
      result.skipped++;
      continue;
    }

    const claimKey = `${claimPrefix}guardian-monthly-report:${student.id}:${claimMonth}`;
    if (!(await claimOnce(claimKey, { studentId: student.id }))) {
      result.skipped++;
      continue;
    }

    try {
      // All snapshots up to month end. Baseline for the month start is the
      // latest snapshot at/just-before monthStart — this stays correct even
      // when snapshots are sparse (some weeks missing).
      const snaps = await prisma.progressSnap.findMany({
        where: { studentId: student.id, snapDate: { lt: monthEnd } },
        orderBy: { snapDate: "asc" },
      });

      const bySubject = new Map<string, { end: (typeof snaps)[number]; start?: (typeof snaps)[number] }>();
      for (const snap of snaps) {
        // snaps is ordered ascending: the last assignment of `end` is the
        // latest snapshot before monthEnd, and the last assignment of
        // `start` is the latest baseline at/before monthStart.
        const cur = bySubject.get(snap.subject) ?? { end: snap };
        if (snap.snapDate <= monthStart) cur.start = snap;
        cur.end = snap;
        bySubject.set(snap.subject, cur);
      }
      // A subject whose only snapshots are before monthStart still got its
      // `end` set above — but for trend we need at least one snapshot inside
      // or after monthStart. Filter below via quizzes/mastery identity check.

      const subjects: SubjectTrend[] = [];
      for (const [subject, { end, start }] of bySubject) {
        // Skip subjects with no snapshot at/after monthStart: their "end"
        // predates the month, nothing happened in the window.
        if (end.snapDate < monthStart) continue;
        const baseline = start ?? null;
        const masteryStart = baseline ? baseline.mastery * 100 : 0;
        const masteryEnd = end.mastery * 100;
        const quizzesInMonth = Math.max(0, end.quizCount - (baseline?.quizCount ?? 0));
        subjects.push({ subject, masteryStart, masteryEnd, quizzesInMonth, hasBaseline: !!baseline });
      }
      subjects.sort((a, b) => b.quizzesInMonth - a.quizzesInMonth);
      const totalQuizzes = subjects.reduce((sum, s) => sum + s.quizzesInMonth, 0);

      const topWeaknesses = (await prisma.topicMastery.findMany({
        where: { studentId: student.id, weaknessLevel: { not: "none" } },
        orderBy: { mastery: "asc" },
        take: 3,
        select: { subject: true, topic: true, mastery: true },
      })) as Array<{ subject: string; topic: string; mastery: number }>;

      const report: MonthlyReport = {
        studentName: student.name,
        parentTelegramId: student.parentTelegramId,
        monthLabel,
        totalQuizzes,
        subjects,
        topWeaknesses,
      };

      const ok = await send(student.parentTelegramId, formatMonthlyMessage(report));
      if (ok) result.sent++;
      else {
        result.failed++;
        result.errors.push(`${student.name}: Telegram rejected the message`);
        await releaseClaim(claimKey);
      }
    } catch (err) {
      result.failed++;
      result.errors.push(`${student.name}: ${err instanceof Error ? err.message : String(err)}`);
      await releaseClaim(claimKey);
    }
  }

  console.log(`[GuardianMonthly] sent=${result.sent} failed=${result.failed} skipped=${result.skipped} of ${result.total}`);
  return result;
}
