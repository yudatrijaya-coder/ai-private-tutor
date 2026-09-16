/**
 * Reminder Engine — cron-friendly function that checks 3 reminder windows.
 *
 * - H-1 (24h before)  → send reminder via Telegram
 * - 30min before      → "Ayo belajar! Sesinya mulai 30 menit lagi"
 * - 5min missed       → detect no-show, mark as MISSED
 *
 * @module @/agents/scheduler/reminder
 */

import { prisma } from "@/lib/prisma";
import { bot } from "@/bot/bot";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

/** Window sizes (milliseconds) */
const H1_WINDOW = 2 * 60 * 60 * 1000;            // 2 hour window for H-1 (catches 22h-26h range)
const T30_WINDOW = 30 * 60 * 1000;              // 30 min window
const MISSED_GRACE = 5 * 60 * 1000;             // 5 min grace after session start
/** Attendance window padding — activity inside it marks a session COMPLETED */
const ATTENDANCE_PRE_WINDOW = 30 * 60 * 1000;   // 30 min before scheduled start
const ATTENDANCE_POST_WINDOW = 30 * 60 * 1000;  // 30 min after scheduled end

/**
 * Fallback attendance window, in Jakarta wall-clock days.
 *
 * Why this exists: the tight window above (start −30min → end +30min) is
 * correct in spirit but wrong in practice for this product. Students study on
 * their own clock — they open the bot at 20:15 for a 19:30 session, or at 21:00
 * the same evening. Measured over the live DB on 2026-09-16: of 153 sessions
 * marked MISSED, only 10 had activity inside the tight window and 55 more had
 * activity elsewhere on the very same calendar day. Those 55 were attendance,
 * mislabelled as absence.
 *
 * So: try the tight window first (it is the precise signal). If nothing lands,
 * and the student was active at all on that Jakarta day, count the session as
 * COMPLETED anyway rather than accusing the student of not showing up.
 *
 * The remaining gap — active that week but not that day (69 sessions in the
 * measurement) — is deliberately NOT counted. "Studied 2 days later" is not
 * attendance.
 */
const ATTENDANCE_SAME_DAY_FALLBACK = true;

/** Jakarta is UTC+7 with no DST — a fixed offset is exact, not an approximation. */
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * UTC instant of Jakarta-local midnight for the day containing `d`.
 * Sessions are scheduled against Jakarta wall-clock slots, so day boundaries
 * must be drawn in Jakarta too — a 06:00 WIB session belongs to that same
 * Jakarta day even though it is 23:00 UTC on the date before.
 */
function jakartaDayStart(d: Date): Date {
  const shifted = new Date(d.getTime() + JAKARTA_OFFSET_MS);
  const midnightUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  return new Date(midnightUtc - JAKARTA_OFFSET_MS);
}

/** Labels used in reminder metadata to prevent double-sends */
const REMINDER_META_KEY = "reminderSentAt";
const REMINDER_META_30 = "reminder30SentAt";

/* ------------------------------------------------------------------ */
/*  Public API — single sweep                                          */
/* ------------------------------------------------------------------ */

export interface ReminderResult {
  h1Sent: number;
  t30Sent: number;
  completedMarked: number;
  missedMarked: number;
  errors: string[];
}

/**
 * Run a single reminder sweep.
 *
 * Designed to be called by a cron job every 1-5 minutes.
 * Checks three windows in one pass:
 *   1. H-1: sessions starting in ≈24 hours where no H-1 reminder was sent
 *   2. T-30: sessions starting in ≈30 minutes where no 30-min reminder was sent
 *   3. MISSED: sessions that started >5 min ago and are still SCHEDULED
 */
export async function runReminderSweep(): Promise<ReminderResult> {
  const result: ReminderResult = { h1Sent: 0, t30Sent: 0, completedMarked: 0, missedMarked: 0, errors: [] };
  const now = Date.now();

  // ── 1. H-1 Reminders ────────────────────────────────────────────
  const h1Start = new Date(now + 24 * 60 * 60 * 1000 - H1_WINDOW);
  const h1End = new Date(now + 24 * 60 * 60 * 1000 + H1_WINDOW);

  const h1Sessions = await prisma.scheduleSession.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { gte: h1Start, lte: h1End },
    },
    include: { student: { select: { telegramId: true, name: true } } },
  });

  for (const session of h1Sessions) {
    try {
      const meta = (session.metadata ?? {}) as Record<string, unknown>;
      if (meta[REMINDER_META_KEY]) continue; // already sent

      await sendTelegramReminder(session, "h-1");
      await prisma.scheduleSession.update({
        where: { id: session.id },
        data: {
          metadata: { ...meta, [REMINDER_META_KEY]: new Date().toISOString() },
        },
      });
      result.h1Sent++;
    } catch (err) {
      result.errors.push(`H-1 session=${session.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 2. T-30 Reminders ────────────────────────────────────────────
  const t30Start = new Date(now + 30 * 60 * 1000 - T30_WINDOW);
  const t30End = new Date(now + 30 * 60 * 1000 + T30_WINDOW);

  const t30Sessions = await prisma.scheduleSession.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { gte: t30Start, lte: t30End },
    },
    include: { student: { select: { telegramId: true, name: true } } },
  });

  for (const session of t30Sessions) {
    try {
      const meta = (session.metadata ?? {}) as Record<string, unknown>;
      if (meta[REMINDER_META_30]) continue;

      await sendTelegramReminder(session, "t-30");
      await prisma.scheduleSession.update({
        where: { id: session.id },
        data: {
          metadata: { ...meta, [REMINDER_META_30]: new Date().toISOString() },
        },
      });
      result.t30Sent++;
    } catch (err) {
      result.errors.push(`T-30 session=${session.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 3. COMPLETED detection ──────────────────────────────────────
  // A session counts as attended when the student logged any activity
  // inside its window (30 min before start → 30 min after end). Without
  // this pass nothing ever left SCHEDULED, so every past session fell
  // through to MISSED below and the dashboard showed 100% missed.
  const completedThreshold = new Date(now - MISSED_GRACE);

  const dueSessions = await prisma.scheduleSession.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: completedThreshold },
    },
  });

  const attendedIds = new Set<string>();

  for (const session of dueSessions) {
    try {
      const windowStart = new Date(
        session.scheduledAt.getTime() - ATTENDANCE_PRE_WINDOW,
      );
      const windowEnd = new Date(
        session.scheduledAt.getTime() +
          session.durationMin * 60 * 1000 +
          ATTENDANCE_POST_WINDOW,
      );

      const activity = await prisma.studentActivity.findFirst({
        where: {
          studentId: session.studentId,
          createdAt: { gte: windowStart, lte: windowEnd },
        },
        select: { id: true, createdAt: true },
      });

      let attendedAt: Date | null = activity?.createdAt ?? null;

      // Fallback: no activity inside the tight window. Before declaring a
      // no-show, check whether the student was on the platform at all that
      // Jakarta day — studying off-schedule still counts as attending.
      if (!attendedAt && ATTENDANCE_SAME_DAY_FALLBACK) {
        const dayStart = jakartaDayStart(session.scheduledAt);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const sameDayActivity = await prisma.studentActivity.findFirst({
          where: {
            studentId: session.studentId,
            createdAt: { gte: dayStart, lt: dayEnd },
          },
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        });

        if (sameDayActivity) attendedAt = sameDayActivity.createdAt;
      }

      if (!attendedAt) continue;

      await prisma.scheduleSession.update({
        where: { id: session.id },
        data: { status: "COMPLETED", completedAt: attendedAt },
      });
      attendedIds.add(session.id);
      result.completedMarked++;
    } catch (err) {
      result.errors.push(
        `COMPLETED session=${session.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ── 4. MISSED detection ─────────────────────────────────────────
  const missedThreshold = new Date(now - MISSED_GRACE);

  const missedSessions = await prisma.scheduleSession.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: missedThreshold },
    },
  });

  for (const session of missedSessions) {
    if (attendedIds.has(session.id)) continue;
    try {
      await prisma.scheduleSession.update({
        where: { id: session.id },
        data: { status: "MISSED" },
      });
      result.missedMarked++;
    } catch (err) {
      result.errors.push(`MISSED session=${session.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Send a Telegram reminder to the student.
 * Safely skips if bot or telegramId is unavailable.
 */
async function sendTelegramReminder(
  session: {
    id: string;
    topic: string | null;
    scheduledAt: Date;
    student: { telegramId: string | null; name: string };
  },
  type: "h-1" | "t-30",
): Promise<void> {
  if (!bot || !session.student.telegramId) {
    console.warn(
      `[scheduler/reminder] Cannot send ${type} reminder for session=${session.id}: ` +
      `bot=${!!bot}, telegramId=${session.student.telegramId}`,
    );
    return;
  }

  const timeStr = session.scheduledAt.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  let text: string;

  if (type === "h-1") {
    text =
      `📚 *Pengingat Belajar!*

Halo ${session.student.name}! Jangan lupa, besok ada sesi belajar ya! 🔥

📖 Topik: ${session.topic ?? "Belajar Mandiri"}
⏰ Waktu: ${timeStr}

Siapkan buku catatan dan semangat belajarnya! 💪`;
  } else {
    text =
      `⏰ *Ayo belajar!*

${session.student.name}, sesi kamu mulai *30 menit lagi*!

📖 Topik: ${session.topic ?? "Belajar Mandiri"}
⏰ Waktu: ${timeStr}

Jangan sampai ketinggalan ya! 🚀`;
  }

  try {
    await bot.telegram.sendMessage(session.student.telegramId, text, {
      parse_mode: "Markdown",
    });
  } catch (err) {
    // Rethrow so the caller logs it
    throw err;
  }
}
