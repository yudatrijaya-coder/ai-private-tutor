/**
 * Backfill: remove the duplicate Attempt rows created by the double-write bug.
 *
 * THE BUG
 * Every web quiz submission was recorded twice: `/api/students/quizzes/[id]/grade`
 * committed the real Attempt (with `masteryAfter`, ProgressSnap and topic
 * mastery), then the activity tracker posted `quiz_complete` and
 * `/api/students/activity` inserted a *second* Attempt for the same submission.
 * Fixed in 661dc1a — the route now reuses a recent attempt instead of inserting.
 *
 * THE SIGNATURE
 * The duplicate is always the later row and always has `masteryAfter = NULL`,
 * because the activity route never computed it. Verified across production:
 * 135 pairs, 135 of them "first has mastery, second does not" — zero exceptions.
 * That makes the discriminator deterministic rather than heuristic, but this
 * script still verifies it per pair and refuses to act on anything ambiguous.
 *
 * WHY DELETE RATHER THAN FLAG
 * `Attempt` has no inbound foreign keys (checked against information_schema),
 * and 0 of 15 `ImprovementPlan.attemptId` values point at a duplicate. Twenty
 * readers count or window these rows, so deleting fixes all of them at once
 * with no code change. A flag column would require every reader to learn about
 * it — more surface for the same outcome.
 *
 * WHAT THIS DOES NOT FIX
 * `masteryAfter` stored on the *surviving* attempts was computed while the
 * duplicates were present, and `calculateMastery` windows the last 4 attempts
 * per material — so duplicates pushed genuine attempts out of that window. This
 * script reports the affected mastery values but does not rewrite them; that is
 * a separate decision (see the summary it prints).
 *
 * USAGE
 *   npx tsx scripts/backfill-duplicate-attempts.ts            # dry run (default)
 *   npx tsx scripts/backfill-duplicate-attempts.ts --apply    # delete
 *
 * On --apply the deleted rows are written to
 * `backups/duplicate-attempts-<timestamp>.json` before the transaction commits,
 * so the operation is reversible.
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

/** Same window the runtime dedupe uses; the observed gap is ~45 ms. */
const WINDOW_SECONDS = 10;

interface DupPair {
  dupId: string;
  origId: string;
  studentId: string;
  quizId: string;
  type: string;
  score: number;
  maxScore: number;
  createdAt: Date;
  gapMs: number;
}

async function findDuplicatePairs(): Promise<DupPair[]> {
  return prisma.$queryRaw<DupPair[]>`
    SELECT
      a2.id          AS "dupId",
      a1.id          AS "origId",
      a2."studentId" AS "studentId",
      a2."quizId"    AS "quizId",
      a2.type        AS "type",
      a2.score       AS "score",
      a2."maxScore"  AS "maxScore",
      a2."createdAt" AS "createdAt",
      EXTRACT(EPOCH FROM (a2."createdAt" - a1."createdAt")) * 1000 AS "gapMs"
    FROM "Attempt" a1
    JOIN "Attempt" a2
      ON a1."quizId" = a2."quizId"
     AND a1."studentId" = a2."studentId"
     AND a2."createdAt" > a1."createdAt"
     AND EXTRACT(EPOCH FROM (a2."createdAt" - a1."createdAt")) < ${WINDOW_SECONDS}
    ORDER BY a2."createdAt"
  `;
}

async function main() {
  console.log(APPLY ? "=== APPLY MODE — rows will be deleted ===\n" : "=== DRY RUN — nothing will be changed ===\n");

  const pairs = await findDuplicatePairs();
  const totalAttempts = await prisma.attempt.count();

  if (pairs.length === 0) {
    console.log("No duplicate pairs found. Nothing to do.");
    return;
  }

  // ── Safety: every duplicate must be the mastery-less later row ──────────
  const dupIds = pairs.map((p) => p.dupId);
  const dupRows = await prisma.attempt.findMany({
    where: { id: { in: dupIds } },
    select: { id: true, masteryAfter: true },
  });
  const masteryByDup = new Map(dupRows.map((r) => [r.id, r.masteryAfter]));

  const withMastery = pairs.filter((p) => masteryByDup.get(p.dupId) !== null);
  if (withMastery.length > 0) {
    console.error(
      `ABORT: ${withMastery.length} candidate row(s) carry masteryAfter, so they do not ` +
        `match the duplicate signature. Refusing to delete anything.`,
    );
    for (const p of withMastery.slice(0, 5)) {
      console.error(`  ${p.dupId}  masteryAfter=${masteryByDup.get(p.dupId)}`);
    }
    process.exit(1);
  }
  console.log(`Signature verified: all ${pairs.length} candidates have masteryAfter = NULL.`);

  // ── Nothing must point at a candidate ───────────────────────────────────
  const plansAtDups = await prisma.improvementPlan.count({ where: { attemptId: { in: dupIds } } });
  if (plansAtDups > 0) {
    console.error(`ABORT: ${plansAtDups} ImprovementPlan row(s) reference a candidate. Review manually.`);
    process.exit(1);
  }
  console.log("No ImprovementPlan references a candidate row.");

  // ── Report ──────────────────────────────────────────────────────────────
  const byType = pairs.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1;
    return acc;
  }, {});
  const byStudent = pairs.reduce<Record<string, number>>((acc, p) => {
    acc[p.studentId] = (acc[p.studentId] ?? 0) + 1;
    return acc;
  }, {});

  const students = await prisma.student.findMany({
    where: { id: { in: Object.keys(byStudent) } },
    select: { id: true, studentId: true, name: true },
  });
  const nameById = new Map(students.map((s) => [s.id, `${s.name} (${s.studentId})`]));

  const gaps = pairs.map((p) => Number(p.gapMs));
  gaps.sort((a, b) => a - b);

  console.log("");
  console.log(`Total Attempt rows            : ${totalAttempts}`);
  console.log(`Duplicate rows to remove      : ${pairs.length}`);
  console.log(`Resulting total               : ${totalAttempts - pairs.length}`);
  console.log(`Pollution rate                : ${((pairs.length / totalAttempts) * 100).toFixed(1)}%`);
  console.log(`Gap between writes (ms)       : min ${gaps[0].toFixed(0)}, median ${gaps[Math.floor(gaps.length / 2)].toFixed(0)}, max ${gaps[gaps.length - 1].toFixed(0)}`);
  console.log(`By type                       : ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log("");
  console.log("By student:");
  for (const [sid, n] of Object.entries(byStudent).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${nameById.get(sid) ?? sid}`);
  }

  // ── Mastery impact (informational — this script does not rewrite it) ────
  const affectedMaterials = await prisma.$queryRaw<{ materialId: string; n: bigint }[]>`
    SELECT q."materialId" AS "materialId", COUNT(*) AS n
    FROM "Attempt" a
    JOIN "Quiz" q ON q.id = a."quizId"
    WHERE a.id = ANY(${dupIds}::text[])
    GROUP BY 1
    ORDER BY 2 DESC
  `;
  console.log("");
  console.log(`Materials whose mastery window was polluted: ${affectedMaterials.length}`);
  console.log(
    "Stored masteryAfter values on surviving attempts were computed with the\n" +
      "duplicates present. calculateMastery() windows the last 4 attempts per\n" +
      "material, so duplicates displaced genuine attempts. This script does NOT\n" +
      "rewrite them — run scripts/recompute-mastery.ts separately if you want the\n" +
      "stored history corrected.",
  );

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with --apply to delete.");
    return;
  }

  // ── Apply ───────────────────────────────────────────────────────────────
  const backupDir = path.join(__dirname, "..", "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `duplicate-attempts-${stamp}.json`);

  const fullRows = await prisma.attempt.findMany({ where: { id: { in: dupIds } } });
  fs.writeFileSync(backupPath, JSON.stringify(fullRows, null, 2));
  console.log(`\nBackup written: ${backupPath} (${fullRows.length} rows)`);

  const result = await prisma.attempt.deleteMany({ where: { id: { in: dupIds } } });
  console.log(`Deleted ${result.count} duplicate rows.`);

  const after = await prisma.attempt.count();
  console.log(`Attempt count: ${totalAttempts} -> ${after} (expected ${totalAttempts - pairs.length})`);

  const remaining = await findDuplicatePairs();
  console.log(`Duplicate pairs remaining: ${remaining.length}`);
  if (remaining.length > 0) {
    console.error("WARNING: duplicates remain — re-run to inspect.");
    process.exit(1);
  }
  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error("BACKFILL FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
