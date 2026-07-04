/**
 * Reschedule Handler — handle reschedule requests with business rules.
 *
 * - Check daily limit (max 2 sessions/day)
 * - Check veto rules: can't skip intensive if mastery < 30%
 * - Update session in DB
 *
 * @module @/agents/scheduler/reschedule
 */

import { prisma } from "@/lib/prisma";
import { addDays, startOfDay } from "date-fns";

/* ------------------------------------------------------------------ */
/*  Constants & Types                                                  */
/* ------------------------------------------------------------------ */

/** Max sessions allowed per day after reschedule */
const MAX_SESSIONS_PER_DAY = 2;

/** Mastery threshold below which intensive sessions are vetoed */
const MASTERY_VETO_THRESHOLD = 0.3;

export interface RescheduleRequest {
  sessionId: string;
  studentId: string;
  /** ISO date string for the new date (optional — can be auto-advanced) */
  newDate?: string;
}

export interface RescheduleResult {
  ok: boolean;
  reason?: string;
  sessionId: string;
  newDate?: string;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Handle a reschedule request.
 *
 * 1. Load the session & latest progress snaps
 * 2. Veto check: if session is INTENSIVE and mastery < 30%, reject
 * 3. Compute the next available slot respecting daily limit
 * 4. Update the session in DB
 */
export async function handleReschedule(
  request: RescheduleRequest,
): Promise<RescheduleResult> {
  const { sessionId, studentId } = request;

  // 1. Load session
  const session = await prisma.scheduleSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return { ok: false, reason: "Session not found", sessionId };
  }

  if (session.studentId !== studentId) {
    return { ok: false, reason: "Session does not belong to this student", sessionId };
  }

  // 2. Veto check — intensive sessions on weak mastery
  if (session.type === "INTENSIVE") {
    const latestSnaps = await prisma.progressSnap.findMany({
      where: { studentId },
      orderBy: { snapDate: "desc" },
      distinct: ["subject"],
    });

    const lowestMastery = Math.min(...latestSnaps.map((s) => s.mastery), 1);
    if (lowestMastery < MASTERY_VETO_THRESHOLD) {
      return {
        ok: false,
        reason:
          `Tidak bisa me-reschedule sesi intensif. ` +
          `Mastery untuk beberapa mata pelajaran masih di bawah ${MASTERY_VETO_THRESHOLD * 100}%. ` +
          `Selesaikan sesi intensif terlebih dahulu.`,
        sessionId,
      };
    }
  }

  // 3. Compute next available slot
  let targetDate: Date;

  if (request.newDate) {
    targetDate = new Date(request.newDate);
  } else {
    // Auto-advance to tomorrow
    targetDate = addDays(startOfDay(new Date()), 1);
  }

  // Check daily limit
  const dayStart = startOfDay(targetDate);
  const dayEnd = addDays(dayStart, 1);

  const existingCount = await prisma.scheduleSession.count({
    where: {
      studentId,
      scheduledAt: { gte: dayStart, lt: dayEnd },
      status: { not: "MISSED" },
    },
  });

  if (existingCount >= MAX_SESSIONS_PER_DAY) {
    // Try next day
    targetDate = addDays(targetDate, 1);

    // Verify next day doesn't exceed limit
    const nextDayStart = startOfDay(targetDate);
    const nextDayEnd = addDays(nextDayStart, 1);
    const nextCount = await prisma.scheduleSession.count({
      where: {
        studentId,
        scheduledAt: { gte: nextDayStart, lt: nextDayEnd },
        status: { not: "MISSED" },
      },
    });

    if (nextCount >= MAX_SESSIONS_PER_DAY) {
      return {
        ok: false,
        reason: "Kuota harian (max 2 sesi/hari) sudah penuh untuk hari ini dan besok. Coba pilih tanggal lain.",
        sessionId,
      };
    }
  }

  // Preserve original time-of-day when rescheduling
  const origHours = session.scheduledAt.getHours();
  const origMinutes = session.scheduledAt.getMinutes();
  targetDate.setHours(origHours, origMinutes, 0, 0);

  // 4. Update session
  await prisma.scheduleSession.update({
    where: { id: sessionId },
    data: {
      status: "RESCHEDULED",
      scheduledAt: targetDate,
      metadata: {
        ...((session.metadata ?? {}) as Record<string, unknown>),
        rescheduledFrom: session.scheduledAt.toISOString(),
        rescheduledAt: new Date().toISOString(),
      },
    },
  });

  return {
    ok: true,
    sessionId,
    newDate: targetDate.toISOString(),
  };
}

/**
 * Reschedule a batch of sessions — used for bulk operations.
 * Each item is independently validated.
 */
export async function bulkReschedule(
  requests: RescheduleRequest[],
): Promise<RescheduleResult[]> {
  return Promise.all(requests.map(handleReschedule));
}
