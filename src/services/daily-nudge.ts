/**
 * Daily inactivity nudge (ledger C-13b).
 *
 * WHAT WAS WRONG
 * The route sent a reminder to every student who had not studied for two days,
 * but it decided that from the student's **last activity**, never from when a
 * nudge was last sent. A student inactive for a week therefore received a
 * nudge on *every* daily run — seven messages for one lapse — and each run also
 * re-derived and re-sent the same "you haven't studied" reminder. The route
 * comment claimed "Max 1 nudge per day per student"; nothing enforced it.
 *
 * THE FIX
 * One `CronClaim` per student per local day, taken before the send. A second
 * run on the same day loses the claim race and skips. A *failed* send releases
 * its claim, so the next run retries exactly the students who did not get the
 * message instead of spamming the ones who did.
 */

import { prisma } from "@/lib/prisma";
import { claimOnce, releaseClaim, dailyNudgeKey } from "@/lib/cron/idempotency";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/** Days of inactivity before a nudge is warranted. */
const MIN_DAYS_INACTIVE = 2;

export interface DailyNudgeResult {
  /** Nudges the transport accepted. */
  sent: number;
  /** Nudges the transport rejected or that threw. */
  failed: number;
  /** Students considered but not nudged (already nudged today, or not due). */
  skipped: number;
  /** Human-readable per-student outcome, capped by the caller for logging. */
  results: string[];
}

/**
 * Injectable collaborators. Production passes nothing and gets the real
 * Telegram transport; the regression test injects a recording transport, a
 * fixed `now`, and a `claimPrefix` so its claims cannot collide with a real
 * run's.
 */
export interface DailyNudgeDeps {
  sendMessage?: (
    chatId: string,
    text: string,
    replyMarkup?: unknown,
  ) => Promise<boolean>;
  now?: Date;
  claimPrefix?: string;
}

export async function runDailyNudge(deps: DailyNudgeDeps = {}): Promise<DailyNudgeResult> {
  const now = deps.now ?? new Date();
  const claimPrefix = deps.claimPrefix ?? "";
  const send =
    deps.sendMessage ??
    (async (chatId: string, text: string, replyMarkup?: unknown) => {
      if (!BOT_TOKEN) return false;
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup: replyMarkup }),
      });
      return res.ok;
    });

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

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const results: string[] = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const student of students) {
    const lastActivity = student.lastActivityDate ? new Date(student.lastActivityDate) : null;

    // Skip if already active today
    if (lastActivity) {
      const activityDay = new Date(lastActivity);
      activityDay.setHours(0, 0, 0, 0);
      if (activityDay.getTime() === today.getTime()) {
        skipped++;
        continue;
      }
    }

    // Never studied → don't spam new users. Nothing to nudge about yet.
    if (!lastActivity) {
      skipped++;
      continue;
    }

    const daysSince = Math.round((today.getTime() - lastActivity.getTime()) / 86400000);
    if (daysSince < MIN_DAYS_INACTIVE) {
      skipped++;
      continue;
    }

    if (!student.telegramId) {
      skipped++;
      continue;
    }

    // Ledger C-13b: claim this student for today before sending. A second run
    // today loses the race and skips — the student gets one nudge per lapse.
    const claimKey = `${claimPrefix}${dailyNudgeKey(student.id, now)}`;
    if (!(await claimOnce(claimKey, { studentId: student.id, daysSince }))) {
      skipped++;
      continue;
    }

    // Saran topik lemah biar nudge lebih terarah
    const weakTopic = await prisma.topicMastery.findFirst({
      where: {
        studentId: student.id,
        weaknessLevel: { in: ["severe", "moderate"] },
      },
      orderBy: { mastery: "asc" },
    });

    const streakAtRisk = student.currentStreak >= 3;
    const streakMsg =
      student.currentStreak > 0
        ? `Streak kamu sedang di <b>${student.currentStreak} hari</b> — ${streakAtRisk ? "awas putus! 🔥" : "jangan putus!"}`
        : "Yuk mulai streak pertamamu!";

    // ── Daily recap: aktivitas 24 jam terakhir ──
    const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
    const [quizToday, minutesToday] = await Promise.all([
      prisma.attempt.count({ where: { studentId: student.id, createdAt: { gte: dayAgo } } }),
      prisma.studySession.aggregate({
        where: { studentId: student.id, startTime: { gte: dayAgo } },
        _sum: { durationMinutes: true },
      }),
    ]);
    const recapParts: string[] = [];
    if (quizToday > 0) recapParts.push(`${quizToday} quiz`);
    if ((minutesToday._sum.durationMinutes ?? 0) > 0)
      recapParts.push(`${Math.round(minutesToday._sum.durationMinutes ?? 0)} menit belajar`);
    const recapLine =
      recapParts.length > 0 ? `📊 24 jam terakhir: <b>${recapParts.join(", ")}</b>\n\n` : "";
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

    const replyMarkup = {
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
    };

    try {
      const ok = await send(student.telegramId, message, replyMarkup);
      if (ok) {
        sent++;
        results.push(`nudged ${student.name}`);
      } else {
        failed++;
        results.push(`failed ${student.name}: Telegram rejected the message`);
        // Ledger C-13b: don't let a failed send consume the day's claim.
        await releaseClaim(claimKey);
      }
    } catch (err) {
      failed++;
      results.push(`failed ${student.name}: ${err instanceof Error ? err.message : String(err)}`);
      await releaseClaim(claimKey);
    }
  }

  return { sent, failed, skipped, results };
}
