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
const H1_WINDOW = 60 * 60 * 1000;               // 1 hour window for H-1
const T30_WINDOW = 30 * 60 * 1000;              // 30 min window
const MISSED_GRACE = 5 * 60 * 1000;             // 5 min grace after session start

/** Labels used in reminder metadata to prevent double-sends */
const REMINDER_META_KEY = "reminderSentAt";
const REMINDER_META_30 = "reminder30SentAt";

/* ------------------------------------------------------------------ */
/*  Public API — single sweep                                          */
/* ------------------------------------------------------------------ */

export interface ReminderResult {
  h1Sent: number;
  t30Sent: number;
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
  const result: ReminderResult = { h1Sent: 0, t30Sent: 0, missedMarked: 0, errors: [] };
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

  // ── 3. MISSED detection ─────────────────────────────────────────
  const missedThreshold = new Date(now - MISSED_GRACE);

  const missedSessions = await prisma.scheduleSession.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: missedThreshold },
    },
  });

  for (const session of missedSessions) {
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
  });

  let text: string;

  if (type === "h-1") {
    text =
      `📚 *Pengingat Belajar!*\\n\\n` +
      `Halo ${session.student.name}! Jangan lupa, besok ada sesi belajar ya! 🔥\\n\\n` +
      `📖 Topik: ${session.topic ?? "Belajar Mandiri"}\\n` +
      `⏰ Waktu: ${timeStr}\\n\\n` +
      `Siapkan buku catatan dan semangat belajarnya! 💪`;
  } else {
    text =
      `⏰ *Ayo belajar!*\\n\\n` +
      `${session.student.name}, sesi kamu mulai *30 menit lagi*!\\n\\n` +
      `📖 Topik: ${session.topic ?? "Belajar Mandiri"}\\n` +
      `⏰ Waktu: ${timeStr}\\n\\n` +
      `Jangan sampai ketinggalan ya! 🚀`;
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
