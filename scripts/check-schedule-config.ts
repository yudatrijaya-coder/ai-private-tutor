/**
 * Regression check for `hasScheduleConfig()`.
 *
 * WHY THIS EXISTS: the flat-only predicate silently skipped every student for
 * ~7 weeks. The cron reported `sessionsAssigned: 0` as a SUCCESS, so nothing
 * surfaced the failure — it had to be found by comparing the last DAILY session
 * date per student against the config shape in the DB. A cheap assertion here
 * would have caught it the day `{ days: {...} }` was written.
 *
 * Run: npx tsx scripts/check-schedule-config.ts
 */
import { hasScheduleConfig } from "../src/lib/schedule/schedule-config";

const cases: [label: string, config: unknown, expected: boolean][] = [
  // The shape the onboarding bot writes — the one that broke.
  [
    "onboarding shape (regression guard)",
    {
      days: {
        monday: { type: "INTENSIVE", start: "19:00", duration: 120 },
        saturday: { exclude: true },
      },
    },
    true,
  ],
  ["flat shape written by seed/admin", { preferredTime: "06:30", sessionDuration: 15 }, true],
  ["sessionsPerDay", { sessionsPerDay: 2 }, true],
  ["excludeDays", { excludeDays: ["saturday"] }, true],
  ["null", null, false],
  ["undefined", undefined, false],
  ["empty object", {}, false],
  ["empty days map", { days: {} }, false],
  ["scalar", "19:00", false],
  ["unrelated keys only", { timezone: "Asia/Jakarta" }, false],
  // The real config pulled from Student."scheduleConfig" for SYIFA001/RAIHAN001.
  [
    "live SYIFA001 config",
    {
      days: {
        friday: { type: "INTENSIVE", start: "19:00", duration: 120 },
        monday: { type: "INTENSIVE", start: "19:00", duration: 120 },
        sunday: { type: "DAILY", start: "19:30", duration: 30 },
        tuesday: { type: "DAILY", start: "19:30", duration: 30 },
        saturday: { exclude: true },
        thursday: { type: "DAILY", start: "19:30", duration: 30 },
        wednesday: { type: "INTENSIVE", start: "19:00", duration: 120 },
      },
    },
    true,
  ],
];

let failed = 0;
for (const [label, config, expected] of cases) {
  const got = hasScheduleConfig(config);
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} -> ${got} (expected ${expected})`);
}

console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
