/**
 * Idempotency claims for the notification cron jobs (ledger C-13 / C-13b).
 *
 * THE PROBLEM
 * `POST /api/cron/guardian-report` and `GET /api/cron/daily-nudge` are
 * work-performing endpoints, not auth checks, and neither had any memory of
 * having run. Every invocation re-sent to every eligible recipient, so a retry
 * after a timeout, a second scheduler, or a manual run delivered the same
 * digest twice. Observed in production: two `AgentLog` rows 2.5 s apart, each
 * reporting `sent: 6`.
 *
 * THE MECHANISM
 * A claim is a row in `CronClaim` whose `key` is unique. Claiming is a single
 * INSERT: the database's unique index decides the winner, so two concurrent
 * runs cannot both conclude they should send. Losing means "already done".
 *
 * Keys are per-recipient and per-period (`guardian-report:<studentId>:2026-W37`),
 * which is what makes partial failure recoverable: if 2 of 3 sends fail, only
 * those 2 claims are released, so the retry re-sends to the 2 and leaves the
 * one who already received it alone. A single job-level "ran this week?" flag
 * would force an all-or-nothing choice between duplicating and dropping.
 */

import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  Key derivation                                                     */
/* ------------------------------------------------------------------ */

/**
 * ISO-8601 week key, e.g. `"2026-W37"`.
 *
 * The ISO year is the year of the week's Thursday, which matters because the
 * weekly jobs fire on Sunday — the last day of an ISO week — so consecutive
 * Sundays must land in consecutive weeks even across a year boundary.
 *
 * Computed from **local** calendar parts: the schedule is expressed in local
 * time (WIB), and deriving the week from UTC parts would shift the key for the
 * first and last hours of each day.
 */
export function isoWeekKey(date: Date): string {
  // Rebuild at local midnight so time-of-day cannot shift the day.
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // Mon = 0 … Sun = 6
  const dayNum = (d.getDay() + 6) % 7;
  // Move to the Thursday of this week; its year is the ISO week-year.
  d.setDate(d.getDate() - dayNum + 3);
  const isoYear = d.getFullYear();
  // The Monday of ISO week 1 is the Monday of the week containing Jan 4.
  const jan4 = new Date(isoYear, 0, 4);
  const jan4DayNum = (jan4.getDay() + 6) % 7;
  const week1Monday = new Date(isoYear, 0, 4 - jan4DayNum);
  const week = 1 + Math.round((d.getTime() - week1Monday.getTime()) / (7 * 86400000));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Local calendar day key, e.g. `"2026-09-12"`. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** One claim per student per week — the parent digest. */
export function guardianReportKey(studentId: string, date: Date): string {
  return `guardian-report:${studentId}:${isoWeekKey(date)}`;
}

/** One claim per student per week — the student's own short summary. */
export function studentWeeklyReportKey(studentId: string, date: Date): string {
  return `student-weekly-report:${studentId}:${isoWeekKey(date)}`;
}

/** One claim per student per day — the inactivity nudge. */
export function dailyNudgeKey(studentId: string, date: Date): string {
  return `daily-nudge:${studentId}:${dayKey(date)}`;
}

/* ------------------------------------------------------------------ */
/*  Claim primitives                                                   */
/* ------------------------------------------------------------------ */

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "P2002"
  );
}

function isRecordNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "P2025"
  );
}

/**
 * Try to take the claim for `key`.
 *
 * @returns `true` when this caller won and should do the work, `false` when the
 *   work was already claimed for this period and must be skipped.
 */
export async function claimOnce(key: string, metadata?: unknown): Promise<boolean> {
  try {
    await prisma.cronClaim.create({
      data: {
        key,
        metadata: (metadata ?? undefined) as never,
      },
    });
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
}

/**
 * Hand the claim back so the work can be attempted again.
 *
 * Called when a send failed: a failure must not consume the claim, or that
 * recipient silently never receives the message. Never throws — it runs while
 * unwinding an already-failing send, and turning that into a second exception
 * would abandon the remaining recipients.
 */
export async function releaseClaim(key: string): Promise<void> {
  try {
    await prisma.cronClaim.delete({ where: { key } });
  } catch (err) {
    if (isRecordNotFound(err)) return; // already gone — the desired end state
    console.error(`[idempotency] failed to release claim ${key}:`, err);
  }
}

/**
 * Delete claims created before `createdAtBefore`. Best-effort housekeeping so
 * `CronClaim` does not grow without bound.
 */
export async function pruneClaims(createdAtBefore: Date): Promise<number> {
  try {
    const { count } = await prisma.cronClaim.deleteMany({
      where: { createdAt: { lt: createdAtBefore } },
    });
    return count;
  } catch (err) {
    console.error("[idempotency] failed to prune claims:", err);
    return 0;
  }
}
