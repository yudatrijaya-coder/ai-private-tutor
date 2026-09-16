/**
 * Re-validate open interventions against current data.
 *
 * Thin CLI wrapper around `@/lib/intervention-health` so the rules live in one
 * place — the same function runs automatically from the schedule-sweep cron.
 *
 * Context: interventions are raised when a condition holds (3 missed sessions in
 * a row, a score drop) but nothing closed them when the condition stopped
 * holding. On 2026-09-16 all four OPEN rows were raised 2026-07-28, and two no
 * longer described reality — the dashboard was showing false alarms.
 *
 * Usage:
 *   npx tsx scripts/revalidate-interventions.ts           # report only
 *   npx tsx scripts/revalidate-interventions.ts --apply   # write
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { revalidateOpenInterventions } from "../src/lib/intervention-health";

const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY (writing)" : "DRY RUN (no writes)"}\n`);

  const verdicts = await revalidateOpenInterventions({ apply: APPLY });

  for (const v of verdicts) {
    console.log(
      `${v.stillValid ? "KEEP   " : "RESOLVE"} ${v.studentName} ${v.issueType} (${v.severity}) — ${v.reason}`,
    );
  }

  const resolved = verdicts.filter((v) => !v.stillValid).length;
  console.log(`\nOpen interventions checked: ${verdicts.length}`);
  console.log(`Resolved: ${resolved} · Kept open: ${verdicts.length - resolved}`);
  if (!APPLY) console.log("Re-run with --apply to persist.");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
