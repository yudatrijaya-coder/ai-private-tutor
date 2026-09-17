/**
 * Is a student's `scheduleConfig` usable enough to auto-assign study sessions?
 *
 * WHY THIS LIVES IN ITS OWN MODULE: the original predicate was inlined in
 * `api/cron/schedule-sweep/route.ts` and only recognised the flat shape
 * (`sessionsPerDay` / `excludeDays` / `customTimes` / `preferredTime`). But the
 * onboarding bot writes a *different* shape — `{ days: { monday: {...}, ... } }`
 * — and so does `computeWeeklySlots()`. The predicate therefore returned false
 * for every real student, `assignSessionsIfNeeded()` silently `continue`d past
 * all of them, and no curriculum (DAILY) session was ever assigned again.
 *
 * The damage was invisible because the exam system creates INTENSIVE sessions
 * through a different code path that never calls this predicate, so sessions
 * kept appearing — just never from the weekly curriculum assignment. Result:
 * every student's DAILY schedule stopped dead in late July 2026 and newly added
 * weeks were never scheduled.
 *
 * Keeping the predicate in `src/lib/` with a runnable check is the point: the
 * bug survived because nothing exercised this function outside a cron that
 * reported `sessionsAssigned: 0` as a normal, successful run.
 */

export type ScheduleConfigShape = {
  sessionsPerDay?: unknown;
  excludeDays?: unknown;
  customTimes?: unknown;
  preferredTime?: unknown;
  days?: unknown;
};

/** Flat keys, written by the admin API and the seed script. */
const FLAT_KEYS = [
  "sessionsPerDay",
  "excludeDays",
  "customTimes",
  "preferredTime",
] as const;

export function hasScheduleConfig(
  config: unknown,
): config is ScheduleConfigShape {
  if (!config || typeof config !== "object") return false;
  const c = config as Record<string, unknown>;

  for (const key of FLAT_KEYS) {
    if (c[key] !== undefined) return true;
  }

  // The per-weekday shape the onboarding bot writes. Added after the gap above
  // went unnoticed for ~7 weeks.
  if (c.days && typeof c.days === "object") {
    return Object.keys(c.days as object).length > 0;
  }

  return false;
}
