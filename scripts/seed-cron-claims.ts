/**
 * Seed / inspect idempotency claims for the weekly notification jobs.
 *
 * WHY THIS EXISTS
 * The 2026-09-12 incident (ledger C-13) sent the weekly digest to every family
 * twice, because the endpoint had no memory of having run. After the fix, a
 * period that was already delivered cannot be delivered again — which is the
 * desired behaviour, but it leaves one legitimate operator need: *backfilling*
 * the claims for a period that was already sent before the fix existed.
 *
 * That is exactly the situation in ISO week 2026-W37: the digest went out on
 * Saturday 2026-09-12, but no claims were recorded (the mechanism did not exist
 * yet), so the scheduled Sunday 2026-09-13 18:00 run would deliver a third copy
 * of nearly identical content. Seeding the W37 claims tells the scheduler the
 * truth: this work has already been done.
 *
 * USAGE
 *   npx tsx scripts/seed-cron-claims.ts                     # dry run, current week
 *   npx tsx scripts/seed-cron-claims.ts --week 2026-W37     # dry run, explicit week
 *   npx tsx scripts/seed-cron-claims.ts --week 2026-W37 --apply
 *   npx tsx scripts/seed-cron-claims.ts --week 2026-W37 --verify
 *
 *   --apply   write the claims (idempotent; existing keys are left alone)
 *   --verify  call the real services with a recording transport and a `now`
 *             inside the given week, and assert nothing would be sent. This is
 *             the proof that the hold works — and it sends no Telegram message,
 *             because the transport is injected.
 *
 * Keys are derived by calling the production functions, never by string
 * formatting here, so a change to the key scheme cannot silently desynchronise
 * the seeds from what the services actually look up.
 */

import { prisma } from "../src/lib/prisma";
import {
  guardianReportKey,
  studentWeeklyReportKey,
  isoWeekKey,
} from "../src/lib/cron/idempotency";
import { sendWeeklyGuardianReports } from "../src/services/guardian-report";
import { sendWeeklyStudentReports } from "../src/services/student-weekly-report";

const NS = "seed-c13-";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const has = (name: string) => process.argv.includes(`--${name}`);

/**
 * A `Date` that falls inside the requested ISO week.
 *
 * The week is a property of the calendar, not of a single instant, so we only
 * need one representative instant. Thursday 12:00 is used because the ISO
 * week-year is *defined* by the Thursday, which makes the representative
 * unambiguous even for a week that straddles a year boundary. The weekly jobs
 * fire on Sunday — also inside the week — so this instant yields the same key
 * the scheduler will compute.
 */
function representativeInstant(isoYear: number, isoWeek: number): Date {
  const jan4 = new Date(isoYear, 0, 4);
  const jan4DayNum = (jan4.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  const week1Monday = new Date(isoYear, 0, 4 - jan4DayNum);
  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (isoWeek - 1) * 7);
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  thursday.setHours(12, 0, 0, 0);
  return thursday;
}

async function main() {
  const weekArg = arg("week");
  const now = new Date();
  const week = weekArg ?? isoWeekKey(now);
  const m = /^(\d{4})-W(\d{2})$/.exec(week);
  if (!m) {
    console.error(`ERROR: --week must look like 2026-W37 (got "${week}")`);
    process.exit(2);
  }
  const isoYear = Number(m[1]);
  const isoWeekNum = Number(m[2]);
  const instant = representativeInstant(isoYear, isoWeekNum);

  // Guard against a typo silently producing a key for the wrong week: the
  // representative instant must derive back to the week we asked for.
  const derived = isoWeekKey(instant);
  if (derived !== week) {
    console.error(
      `ERROR: internal inconsistency — ${instant.toISOString()} derives to ${derived}, not ${week}`,
    );
    process.exit(2);
  }

  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, parentTelegramId: true, telegramId: true },
    orderBy: { name: "asc" },
  });

  const targets: { key: string; who: string; action: string }[] = [];
  for (const s of students) {
    if (s.parentTelegramId) {
      targets.push({
        key: guardianReportKey(s.id, instant),
        who: s.name,
        action: "guardian-report",
      });
    }
    if (s.telegramId) {
      targets.push({
        key: studentWeeklyReportKey(s.id, instant),
        who: s.name,
        action: "student-weekly-report",
      });
    }
  }

  console.log(`Week        : ${week}  (representative instant ${instant.toString()})`);
  console.log(`Students    : ${students.length} ACTIVE`);
  console.log(`Claims      : ${targets.length} to consider\n`);

  const existing = await prisma.cronClaim.findMany({
    where: { key: { in: targets.map((t) => t.key) } },
    select: { key: true },
  });
  const already = new Set(existing.map((r) => r.key));

  for (const t of targets) {
    const mark = already.has(t.key) ? "already claimed" : "would create ";
    console.log(`  ${mark}  ${t.action.padEnd(21)} ${t.who.padEnd(8)} ${t.key}`);
  }

  if (has("verify")) {
    // `--verify` must not touch the production keys. Calling the service
    // *claims* the key before sending, so a naive verify on an unseeded week
    // would silently seed it — turning a read-only check into an `--apply` in
    // disguise. (That is exactly what happened the first time this script ran:
    // the six W37 rows carry the service's `{studentId}` metadata, not this
    // script's `{seededBy}`, because the service created them.)
    //
    // So: assert the production keys are present by reading the database, then
    // exercise the real code paths under a namespaced prefix that cannot
    // collide with production, and clean those keys up afterwards.
    const missing = targets.filter((t) => !already.has(t.key));
    console.log(`\n--verify: ${targets.length - missing.length}/${targets.length} production claim(s) present`);
    if (missing.length > 0) {
      for (const t of missing) console.log(`  MISSING  ${t.key}`);
      console.log("\n  NOT HELD — the scheduled run would still send. Seed with --apply.");
      process.exit(1);
    }

    const prefix = `${NS}verify:`;
    console.log(`--verify: exercising the services under prefix "${prefix}" (recording transport)`);
    const calls = (bag: string[]) => async (chatId: string) => {
      bag.push(chatId);
      return true;
    };
    try {
      // Run twice under the namespaced prefix. The first run finds fresh keys
      // and claims them; the second must be suppressed. That pair is what
      // proves the claim→skip wiring is actually connected — a single run
      // cannot distinguish "suppressed" from "nothing to send".
      const g1: string[] = [];
      const s1: string[] = [];
      await sendWeeklyGuardianReports({ now: instant, claimPrefix: prefix, sendMessage: calls(g1) });
      await sendWeeklyStudentReports({ now: instant, claimPrefix: prefix, sendMessage: calls(s1) });

      const g2: string[] = [];
      const s2: string[] = [];
      const g = await sendWeeklyGuardianReports({ now: instant, claimPrefix: prefix, sendMessage: calls(g2) });
      const s = await sendWeeklyStudentReports({ now: instant, claimPrefix: prefix, sendMessage: calls(s2) });

      console.log(`  run 1 (fresh keys)  guardian=${g1.length} student=${s1.length} transport call(s)`);
      console.log(`  run 2 (claimed)     guardian=${g2.length} student=${s2.length} transport call(s)`);
      console.log(`  run 2 result        guardian sent=${g.sent} skipped=${g.skipped} | student sent=${s.sent} skipped=${s.skipped}`);

      const firstRan = g1.length > 0 && s1.length > 0;
      const secondHeld = g2.length === 0 && s2.length === 0;
      const ok = firstRan && secondHeld;
      console.log(
        ok
          ? `\n  HELD — ${targets.length}/${targets.length} production claims present; the scheduled run for ${week} would send nothing.`
          : "\n  NOT HELD — the mechanism did not suppress the repeat send.",
      );
      if (!ok) process.exit(1);
    } finally {
      // Always remove the namespaced keys, even on failure, so verify stays
      // side-effect free and re-runnable.
      const { count } = await prisma.cronClaim.deleteMany({
        where: { key: { startsWith: prefix } },
      });
      console.log(`  cleaned up ${count} namespaced verify claim(s)`);
    }
    return;
  }

  if (!has("apply")) {
    console.log("\nDry run. Re-run with --apply to write these claims.");
    return;
  }

  let created = 0;
  for (const t of targets) {
    if (already.has(t.key)) continue;
    // `create` rather than an upsert: a duplicate means someone else claimed
    // it, which is fine, and ignoring it keeps this script re-runnable.
    try {
      await prisma.cronClaim.create({
        data: { key: t.key, metadata: { seededBy: `${NS}manual`, week } as never },
      });
      created++;
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") continue;
      throw err;
    }
  }
  console.log(`\nCreated ${created} claim(s); ${targets.length - created} already present.`);
  console.log("Re-run with --verify to confirm the hold.");
}

main()
  .catch((err) => {
    console.error("FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
