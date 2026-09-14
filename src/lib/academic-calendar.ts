/**
 * School-week calculation with academic calendar support.
 *
 * Replaces the Jul 1 + 7-day approximation. A school can configure term
 * start dates and holiday breaks; `getCurrentSchoolWeek` computes the
 * effective instructional week (holidays don't advance the counter).
 *
 * Configure in `src/data/academic-calendar.ts` (see getAcademicCalendar).
 */

export interface TermBreak {
  /** ISO date, inclusive, e.g. "2026-12-21" */
  start: string;
  end: string;
  label?: string;
}

export interface AcademicCalendar {
  /** First instructional day of semester ganjil, e.g. "2026-07-14" */
  ganjilStart: string;
  /** First instructional day of semester genap, e.g. "2027-01-04" */
  genapStart?: string;
  /** Holiday breaks — weeks inside these do not count. */
  breaks?: TermBreak[];
}

// Default: school year starts mid-July, no breaks configured yet.
// Update this when the school provides exact dates.
const DEFAULT_CALENDAR: AcademicCalendar = {
  ganjilStart: "2026-07-14",
  genapStart: "2027-01-04",
  breaks: [],
};

const DAY_MS = 24 * 3600 * 1000;

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function weekOf(from: Date, at: Date): number {
  return Math.max(1, Math.floor((at.getTime() - from.getTime()) / (7 * DAY_MS)) + 1);
}

/**
 * Which semester are we in? Returns the term whose start date is the latest
 * one at or before `at`.
 */
export function getActiveSemester(
  cal: AcademicCalendar,
  at: Date = new Date()
): "ganjil" | "genap" | null {
  const ganjil = parseDate(cal.ganjilStart);
  const genap = cal.genapStart ? parseDate(cal.genapStart) : null;
  if (genap && at >= genap) return "genap";
  if (at >= ganjil) return "ganjil";
  return null;
}

/**
 * Effective instructional week (1-based), skipping holiday breaks.
 * Falls back to ganjil start when no term is active.
 */
export function getCurrentSchoolWeek(
  at: Date = new Date(),
  cal: AcademicCalendar = DEFAULT_CALENDAR
): number {
  const semester = getActiveSemester(cal, at);
  const termStart = parseDate(
    semester === "genap" && cal.genapStart ? cal.genapStart : cal.ganjilStart
  );
  if (at < termStart) return 1;

  // Count only days outside breaks.
  let elapsedDays = 0;
  const cursor = new Date(termStart);
  while (cursor < at) {
    const inBreak = (cal.breaks ?? []).some(
      (b) => cursor >= parseDate(b.start) && cursor <= parseDate(b.end)
    );
    if (!inBreak) elapsedDays++;
    cursor.setTime(cursor.getTime() + DAY_MS);
  }
  return Math.max(1, Math.floor(elapsedDays / 7) + 1);
}
