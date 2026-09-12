/**
 * Idempotency for the notification cron jobs (ledger C-13 / C-13b).
 *
 * BUG THIS LOCKS DOWN
 *   `POST /api/cron/guardian-report` and `GET /api/cron/daily-nudge` had no
 *   memory of having run. Every invocation re-sent to every eligible recipient,
 *   so a retry after a timeout — or two schedulers, or a manual run — delivered
 *   the digest twice. Observed in production: two `AgentLog` rows 2.5 s apart,
 *   each reporting `sent: 6` (3 parents + 3 students).
 *
 *   `daily-nudge` was the same shape one step milder: it gated on
 *   `daysSince >= 2` measured from the student's **last activity**, not from
 *   when a nudge was last sent, so a student inactive for three days was nudged
 *   on every daily run rather than once.
 *
 * WHAT IS ASSERTED
 *   A. Key derivation — the same student in the same ISO week / local day
 *      yields the same key; the next week / day yields a different one.
 *   B. `claimOnce` is atomic and single-use; `releaseClaim` makes it claimable
 *      again; distinct keys do not interfere.
 *   C. Running either weekly service twice sends on the first run and sends
 *      NOTHING on the second.
 *   D. A send that fails releases its claim, so the retry still sends — failed
 *      recipients are retried without re-sending to those who already got it.
 *   E. `runDailyNudge` nudges at most once per student per day, and a new day
 *      is a fresh opportunity.
 *
 * SAFETY — no Telegram traffic, no interference with production claims
 *   Every service takes an injected `sendMessage` (so nothing is sent), an
 *   injected `now`, and a `claimPrefix` of `test-c13-`. The prefix namespaces
 *   every claim this test writes away from the keys a real run uses, so running
 *   the test cannot consume the production weekly or daily claim, and a single
 *   prefix-scoped `DELETE` cleans up all of it. The test re-queries afterwards
 *   and fails if one row survives.
 *
 * USAGE
 *   npx tsx scripts/test-cron-idempotency.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  isoWeekKey,
  dayKey,
  guardianReportKey,
  studentWeeklyReportKey,
  dailyNudgeKey,
  claimOnce,
  releaseClaim,
  pruneClaims,
} from "../src/lib/cron/idempotency";
import { sendWeeklyGuardianReports } from "../src/services/guardian-report";
import { sendWeeklyStudentReports } from "../src/services/student-weekly-report";
import { runDailyNudge } from "../src/services/daily-nudge";

const NS = "test-c13-";

// Fixtures are built with local-time constructors, not fixed UTC offsets, so
// the test means the same thing on any server timezone. This matters: the
// production host runs at +08 while the app's audience is at +07, and an
// instant written as `T23:30+07:00` is the *next* local day on a +08 host.
//
// ISO week 1 of 2030 runs Mon 2029-12-31 → Sun 2030-01-06, so Thursday
// 2030-01-03 and Sunday 2030-01-06 share a week while Sunday 2030-01-13 is W02.
// The weekly jobs fire on Sundays — always the last day of an ISO week — so
// consecutive Sundays land in consecutive weeks.
const WEEK_A = new Date(2030, 0, 6, 11, 0, 0); // Sun 2030-01-06, 11:00 local
const WEEK_A_SAME = new Date(2030, 0, 3, 20, 0, 0); // Thu 2030-01-03, 20:00 local
const WEEK_B = new Date(2030, 0, 13, 11, 0, 0); // Sun 2030-01-13, 11:00 local
const DAY_A = new Date(2030, 0, 6, 6, 0, 0); // 06:00 local
const DAY_A_LATE = new Date(2030, 0, 6, 23, 30, 0); // 23:30 the same local day
const DAY_B = new Date(2030, 0, 7, 6, 0, 0); // 06:00 the next local day

let failures = 0;
let checks = 0;

function check(label: string, got: unknown, want: unknown) {
  checks++;
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${label}` +
      (ok ? "" : `  (got ${JSON.stringify(got)} want ${JSON.stringify(want)})`),
  );
}

/** A stand-in for the Telegram transport that records what it was asked to send. */
function fakeTransport(behaviour: "ok" | "fail" = "ok") {
  const calls: Array<{ chatId: string; text: string }> = [];
  return {
    calls,
    sendMessage: async (chatId: string, text: string) => {
      calls.push({ chatId, text });
      return behaviour === "ok";
    },
  };
}

async function main() {
  // Sweep the namespace *before* asserting as well as after. A previous run
  // killed mid-flight (Ctrl-C, a SIGPIPE from piping into `head`, a crash) never
  // reaches its `finally`, and its leftover claims would make section B fail
  // spuriously — claiming a key that is already taken legitimately returns
  // false. Cleaning on entry makes the test re-runnable regardless of how the
  // last one ended.
  const stale = await prisma.$executeRawUnsafe(
    `DELETE FROM "CronClaim" WHERE key LIKE $1`,
    `${NS}%`,
  );
  if (stale > 0) {
    console.log(`Note: swept ${stale} claim(s) left by an interrupted run.`);
  }

  console.log("\nA. Key derivation");
  check("same ISO week → same key", isoWeekKey(WEEK_A), isoWeekKey(WEEK_A_SAME));
  check("next week → different key", isoWeekKey(WEEK_A) !== isoWeekKey(WEEK_B), true);
  check("same day → same key", dayKey(DAY_A), dayKey(DAY_A_LATE));
  check("next day → different key", dayKey(DAY_A) !== dayKey(DAY_B), true);
  check(
    "guardian key names the week",
    guardianReportKey("s1", WEEK_A).endsWith(isoWeekKey(WEEK_A)),
    true,
  );
  check(
    "weekly keys differ per student",
    guardianReportKey("s1", WEEK_A) !== guardianReportKey("s2", WEEK_A),
    true,
  );
  check(
    "student key differs from guardian key",
    studentWeeklyReportKey("s1", WEEK_A) !== guardianReportKey("s1", WEEK_A),
    true,
  );
  check("nudge key names the day", dailyNudgeKey("s1", DAY_A).endsWith(dayKey(DAY_A)), true);

  console.log("\nB. Claim primitives");
  const k = `${NS}claim`;
  check("first claim wins", await claimOnce(k), true);
  check("second claim is refused", await claimOnce(k), false);
  await releaseClaim(k);
  check("released claim is claimable again", await claimOnce(k), true);
  check("independent key is unaffected", await claimOnce(`${k}-other`), true);

  console.log("\nC. Weekly services run once per week");
  const eligibleGuardians = await prisma.student.count({
    where: { parentTelegramId: { not: null }, status: "ACTIVE" },
  });
  const eligibleStudents = await prisma.student.count({
    where: { telegramId: { not: null }, status: "ACTIVE" },
  });
  check("fixture: at least one guardian recipient exists", eligibleGuardians > 0, true);

  const g1 = fakeTransport();
  const runG1 = await sendWeeklyGuardianReports({
    sendMessage: g1.sendMessage,
    now: WEEK_A,
    claimPrefix: NS,
  });
  const g2 = fakeTransport();
  const runG2 = await sendWeeklyGuardianReports({
    sendMessage: g2.sendMessage,
    now: WEEK_A,
    claimPrefix: NS,
  });

  check("guardian run 1 sends to every eligible parent", g1.calls.length, eligibleGuardians);
  check("guardian run 1 reports them sent", runG1.sent, eligibleGuardians);
  check("guardian run 2 sends nothing", g2.calls.length, 0);
  check("guardian run 2 reports zero sent", runG2.sent, 0);
  check("guardian run 2 reports the skips", runG2.skipped, eligibleGuardians);

  const s1 = fakeTransport();
  const runS1 = await sendWeeklyStudentReports({
    sendMessage: s1.sendMessage,
    now: WEEK_A,
    claimPrefix: NS,
  });
  const s2 = fakeTransport();
  const runS2 = await sendWeeklyStudentReports({
    sendMessage: s2.sendMessage,
    now: WEEK_A,
    claimPrefix: NS,
  });

  check("student run 1 sends to every eligible student", s1.calls.length, eligibleStudents);
  check("student run 1 reports them sent", runS1.sent, eligibleStudents);
  check("student run 2 sends nothing", s2.calls.length, 0);
  check("student run 2 reports zero sent", runS2.sent, 0);

  console.log("\nD. A failed send is retried, a successful one is not");
  const failTransport = fakeTransport("fail");
  const runF1 = await sendWeeklyGuardianReports({
    sendMessage: failTransport.sendMessage,
    now: WEEK_B,
    claimPrefix: NS,
  });
  check("failed run attempts every recipient", failTransport.calls.length, eligibleGuardians);
  check("failed run reports zero sent", runF1.sent, 0);
  check("failed run reports the failures", runF1.failed, eligibleGuardians);

  const retry = fakeTransport();
  const runF2 = await sendWeeklyGuardianReports({
    sendMessage: retry.sendMessage,
    now: WEEK_B,
    claimPrefix: NS,
  });
  check("retry after failure re-sends", retry.calls.length, eligibleGuardians);
  check("retry reports them sent", runF2.sent, eligibleGuardians);

  console.log("\nE. daily-nudge runs once per student per day");
  // The service's own eligibility rule: ACTIVE, has a telegramId, has studied
  // at least once. `now` is in 2030, so every one of them is long overdue.
  const nudgeEligible = await prisma.student.count({
    where: {
      status: "ACTIVE",
      telegramId: { not: null },
      lastActivityDate: { not: null },
    },
  });
  check("fixture: at least one student is nudgeable", nudgeEligible > 0, true);

  const n1 = fakeTransport();
  const runN1 = await runDailyNudge({
    sendMessage: n1.sendMessage,
    now: DAY_A,
    claimPrefix: NS,
  });
  const n2 = fakeTransport();
  const runN2 = await runDailyNudge({
    sendMessage: n2.sendMessage,
    now: DAY_A,
    claimPrefix: NS,
  });
  const n3 = fakeTransport();
  const runN3 = await runDailyNudge({
    sendMessage: n3.sendMessage,
    now: DAY_B,
    claimPrefix: NS,
  });

  check("day A first run nudges everyone due", n1.calls.length, nudgeEligible);
  check("day A first run reports the nudges", runN1.sent, nudgeEligible);
  check("day A second run nudges nobody", n2.calls.length, 0);
  check("day A second run reports zero sent", runN2.sent, 0);
  check("day B is a fresh day, so it nudges again", n3.calls.length, nudgeEligible);

  console.log("\nF. Pruning drops old claims and keeps recent ones");
  // `pruneClaims` is deliberately global — that is what the daily cron calls.
  // Its blast radius here is limited by the fact that a claim key embeds its
  // period, so a >60-day-old row can never be matched again; deleting one is
  // the same housekeeping production performs. The table is empty in practice.
  const oldKey = `${NS}prune-old`;
  const newKey = `${NS}prune-new`;
  await prisma.cronClaim.create({ data: { key: oldKey } });
  // Backdate it past the retention window.
  await prisma.$executeRawUnsafe(
    `UPDATE "CronClaim" SET "createdAt" = $1 WHERE key = $2`,
    new Date(Date.now() - 90 * 86400000),
    oldKey,
  );
  await prisma.cronClaim.create({ data: { key: newKey } });
  const prunedCount = await pruneClaims(new Date(Date.now() - 60 * 86400000));
  check("prune reports at least the backdated claim", prunedCount >= 1, true);
  const survivors = await prisma.cronClaim.findMany({
    where: { key: { in: [oldKey, newKey] } },
    select: { key: true },
  });
  check("the old claim is gone", survivors.some((r) => r.key === oldKey), false);
  check("the recent claim survives", survivors.some((r) => r.key === newKey), true);

  console.log(
    `\n${failures === 0 ? "ALL PASS" : "FAILURES"}: ${checks - failures}/${checks} checks passed`,
  );
}

main()
  .catch((err) => {
    console.error("Test error:", err);
    failures++;
  })
  .finally(async () => {
    await prisma.$executeRawUnsafe(`DELETE FROM "CronClaim" WHERE key LIKE $1`, `${NS}%`);
    const leftovers = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT count(*) AS n FROM "CronClaim" WHERE key LIKE $1`,
      `${NS}%`,
    );
    const remaining = Number(leftovers[0]?.n ?? 0);
    console.log(
      remaining === 0
        ? "Cleanup: no test claims left behind"
        : `Cleanup FAILED: ${remaining} test claim(s) still present`,
    );
    await prisma.$disconnect();
    process.exit(failures === 0 && remaining === 0 ? 0 : 1);
  });
