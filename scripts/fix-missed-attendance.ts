/**
 * One-off reconciliation for session attendance.
 *
 * Two corrections, applied in order:
 *
 * 1. DEDUPE — collapse repeated (studentId, scheduledAt) slots into one row.
 *    Re-running the scheduler assign job used to insert a second session at the
 *    exact same instant; the live DB had 30 such slots, one repeated 7×. Each
 *    duplicate had aged into its own MISSED row, so the dashboard counted the
 *    same missed session several times. `assigner.ts` now guards the slot, but
 *    the rows already written still need collapsing.
 *
 * 2. RECOVER — re-evaluate sessions marked MISSED under the corrected
 *    attendance rule (tight window → same Jakarta day). `runReminderSweep` only
 *    looks at rows still in `SCHEDULED`, so the fix has no effect on the 153
 *    rows already flipped. Measurement showed many were attendance mislabelled
 *    as absence.
 *
 * Safety
 * ------
 * - Dry-run by default. Pass `--apply` to write.
 * - Dedupe keeps the row carrying the most information (a COMPLETED row wins,
 *   then one with a topic, then the oldest) and deletes only the redundant
 *   copies of the same student+instant. It never deletes a distinct slot.
 * - Recovery only moves MISSED → COMPLETED, never the reverse.
 * - The same-day fallback is bounded by the Jakarta day of the session, so
 *   activity on a later day can never retroactively count as attendance.
 *
 * Usage:
 *   npx tsx scripts/fix-missed-attendance.ts            # report only
 *   npx tsx scripts/fix-missed-attendance.ts --apply    # write changes
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const PRE_WINDOW = 30 * 60 * 1000;
const POST_WINDOW = 30 * 60 * 1000;

function jakartaDayStart(d: Date): Date {
  const shifted = new Date(d.getTime() + JAKARTA_OFFSET_MS);
  const midnightUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  return new Date(midnightUtc - JAKARTA_OFFSET_MS);
}

/* ------------------------------------------------------------------ */
/*  Step 1 — dedupe repeated slots                                     */
/* ------------------------------------------------------------------ */

async function dedupeSlots(): Promise<number> {
  const all = await prisma.scheduleSession.findMany({
    select: {
      id: true,
      studentId: true,
      scheduledAt: true,
      status: true,
      topic: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof all>();
  for (const s of all) {
    const key = `${s.studentId}|${s.scheduledAt.getTime()}`;
    const arr = groups.get(key);
    if (arr) arr.push(s);
    else groups.set(key, [s]);
  }

  const toDelete: string[] = [];

  for (const [, rows] of groups) {
    if (rows.length < 2) continue;

    // Keep the most informative row; drop the rest.
    const ranked = [...rows].sort((a, b) => {
      // A session that already has a real outcome is the canonical one.
      const score = (r: (typeof rows)[number]) =>
        (r.status === "COMPLETED" ? 2 : 0) + (r.topic ? 1 : 0);
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      // Otherwise keep the oldest — it is the original assignment.
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    for (const drop of ranked.slice(1)) toDelete.push(drop.id);
  }

  if (toDelete.length === 0) return 0;

  if (APPLY) {
    // Chunked: a single `in` with hundreds of ids is fine for Postgres, but
    // keeping it modest makes failures readable.
    for (let i = 0; i < toDelete.length; i += 200) {
      await prisma.scheduleSession.deleteMany({
        where: { id: { in: toDelete.slice(i, i + 200) } },
      });
    }
  }

  return toDelete.length;
}

/* ------------------------------------------------------------------ */
/*  Step 2 — recover mislabelled MISSED sessions                       */
/* ------------------------------------------------------------------ */

async function recoverMissed(): Promise<{
  recovered: number;
  remaining: number;
  perStudent: Record<string, number>;
}> {
  const missed = await prisma.scheduleSession.findMany({
    where: { status: "MISSED" },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      studentId: true,
      scheduledAt: true,
      durationMin: true,
      student: { select: { name: true } },
    },
  });

  const perStudent: Record<string, number> = {};
  let recovered = 0;

  for (const s of missed) {
    const tightStart = new Date(s.scheduledAt.getTime() - PRE_WINDOW);
    const tightEnd = new Date(
      s.scheduledAt.getTime() + s.durationMin * 60_000 + POST_WINDOW,
    );

    const tight = await prisma.studentActivity.findFirst({
      where: {
        studentId: s.studentId,
        createdAt: { gte: tightStart, lte: tightEnd },
      },
      select: { createdAt: true },
    });

    let attendedAt: Date | null = tight?.createdAt ?? null;

    if (!attendedAt) {
      // Bounded to the session's own Jakarta day: 00:00 WIB through 23:59 WIB.
      const dayStart = jakartaDayStart(s.scheduledAt);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const sameDay = await prisma.studentActivity.findFirst({
        where: {
          studentId: s.studentId,
          createdAt: { gte: dayStart, lt: dayEnd },
        },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });

      if (sameDay) attendedAt = sameDay.createdAt;
    }

    if (!attendedAt) continue;

    recovered++;
    perStudent[s.student.name] = (perStudent[s.student.name] ?? 0) + 1;

    if (APPLY) {
      await prisma.scheduleSession.update({
        where: { id: s.id },
        data: { status: "COMPLETED", completedAt: attendedAt },
      });
    }
  }

  return { recovered, remaining: missed.length - recovered, perStudent };
}

/* ------------------------------------------------------------------ */

async function main() {
  const before = await prisma.scheduleSession.groupBy({
    by: ["status"],
    _count: true,
  });
  console.log(`Mode: ${APPLY ? "APPLY (writing)" : "DRY RUN (no writes)"}`);
  console.log(`Before: ${JSON.stringify(before.map((b) => [b.status, b._count]))}\n`);

  console.log("── Step 1: dedupe repeated slots ──");
  const removed = await dedupeSlots();
  console.log(`Duplicate sessions removed: ${removed}\n`);

  console.log("── Step 2: recover mislabelled MISSED ──");
  const res = await recoverMissed();
  console.log(`Recovered (MISSED → COMPLETED): ${res.recovered}`);
  console.log(`Remaining MISSED: ${res.remaining}`);
  console.log(`Per student: ${JSON.stringify(res.perStudent)}\n`);

  const after = await prisma.scheduleSession.groupBy({
    by: ["status"],
    _count: true,
  });
  console.log(`After: ${JSON.stringify(after.map((a) => [a.status, a._count]))}`);

  if (!APPLY) console.log("\nRe-run with --apply to persist these changes.");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
