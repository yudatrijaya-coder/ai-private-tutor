/**
 * Student-local time helpers.
 *
 * The timezone lives in `Student.scheduleConfig.timezone` (JSON), NOT as a
 * dedicated column — see prisma/schema.prisma. Defaults to Asia/Jakarta (WIB)
 * because that is where every current student is.
 */

export const DEFAULT_TIMEZONE = "Asia/Jakarta";

/** Extract the student's IANA timezone from scheduleConfig, with a WIB fallback. */
export function getStudentTimezone(student: {
  scheduleConfig?: unknown;
}): string {
  const cfg = student.scheduleConfig as { timezone?: unknown } | null | undefined;
  const tz = cfg?.timezone;
  if (typeof tz === "string" && tz.trim().length > 0) {
    // Validate — an invalid IANA name throws in Intl and would break the bot.
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return tz;
    } catch {
      return DEFAULT_TIMEZONE;
    }
  }
  return DEFAULT_TIMEZONE;
}

/** Short timezone label for display, e.g. "WIB" for Asia/Jakarta. */
export function getTimezoneLabel(tz: string): string {
  switch (tz) {
    case "Asia/Jakarta":
      return "WIB";
    case "Asia/Makassar":
      return "WITA";
    case "Asia/Jayapura":
      return "WIT";
    default:
      return tz;
  }
}

/** Hour (0-23) in the given timezone. */
export function hourIn(tz: string, at: Date = new Date()): number {
  return parseInt(
    at.toLocaleString("en-US", { timeZone: tz, hour: "2-digit", hour12: false }),
    10,
  );
}

/** Long Indonesian date+time string in the given timezone. */
export function formatLocal(tz: string, at: Date = new Date()): string {
  return at.toLocaleString("id-ID", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Indonesian part-of-day label for an hour. */
export function partOfDay(hour: number): string {
  if (hour < 6) return "malam (larut)";
  if (hour < 11) return "pagi";
  if (hour < 15) return "siang";
  if (hour < 18) return "sore";
  return "malam";
}

/** Outside normal study hours (06:00–22:00) in the student's timezone. */
export function isOffHours(hour: number): boolean {
  return hour < 6 || hour >= 22;
}
