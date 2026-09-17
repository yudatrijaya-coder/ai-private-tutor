/**
 * Sync Material.weekOrder with prosem (program semester) week targets.
 *
 * Match strategy: fuzzy-normalized match prosem subtopic -> Material.subTopic
 * (fallback: topic). One prosem entry may match several materials (e.g. two
 * prosem rows covering one material) — material takes the MIN week.
 *
 * Usage:
 *   npx tsx scripts/sync-weekorder-prosem.ts           # dry-run (no writes)
 *   npx tsx scripts/sync-weekorder-prosem.ts --apply   # write updates
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { PROSEM_PLANS } from "../src/data/prosem-index";
import type { ProsemEntry } from "../src/lib/prosem";
import {
  GRADE_MAP,
  SKIP_SUBTOPIC,
  SIM_THRESHOLD as THRESHOLD,
  entryMaterialScore,
} from "../src/lib/prosem-match";

const APPLY = process.argv.includes("--apply");


async function main() {
  const students = await prisma.student.findMany({
    select: { id: true, name: true, gradeLevel: true },
  });

  let totalUpdated = 0;
  let totalScanned = 0;

  for (const student of students) {
    const gradeKey = GRADE_MAP[student.gradeLevel ?? ""];
    if (!gradeKey) continue; // SD_5 has no prosem plans
    const plans = PROSEM_PLANS.filter((p) => p.grade.toLowerCase() === gradeKey);
    if (plans.length === 0) continue;

    // latest curriculum = active
    const curriculum = await prisma.curriculum.findFirst({
      where: { studentId: student.id },
      orderBy: { version: "desc" },
    });
    if (!curriculum) continue;

    const materials = await prisma.material.findMany({
      where: { curriculumId: curriculum.id },
      select: { id: true, subject: true, topic: true, subTopic: true, weekOrder: true },
    });

    console.log(`\n=== ${student.name} (${student.gradeLevel}) curriculum=${curriculum.id} materials=${materials.length}`);

    for (const plan of plans) {
      const subject = plan.subject;
      const mats = materials.filter((m) => m.subject === subject);
      if (mats.length === 0) continue;

      // build prosem entries with weeks
      const entries: { e: ProsemEntry; week: number }[] = [];
      for (const e of plan.entries) {
        if (SKIP_SUBTOPIC.test(e.subtopic) || SKIP_SUBTOPIC.test(e.topic)) continue;
        const weeks = e.weeks.map((w) => w.week);
        if (weeks.length === 0) continue;
        entries.push({ e, week: Math.min(...weeks) });
      }

      // greedy best match: for each material, find best prosem entry
      const updates: { id: string; from: number; to: number; label: string; score: number }[] = [];
      const usedEntries = new Set<number>();

      // sort materials so already-placed match first (preserve their entry)
      for (const m of mats) {
        let best = -1;
        let bestScore = 0;
        entries.forEach(({ e }, i) => {
          const s = entryMaterialScore(e, m);
          if (s > bestScore) {
            bestScore = s;
            best = i;
          }
        });
        if (best >= 0 && bestScore >= THRESHOLD) {
          usedEntries.add(best);
          const target = entries[best].week;
          if (m.weekOrder !== target) {
            updates.push({
              id: m.id,
              from: m.weekOrder,
              to: target,
              label: `${m.topic} / ${m.subTopic} -> ${entries[best].e.subtopic}`,
              score: bestScore,
            });
          }
        }
      }

      const unmatchedEntries = entries.filter((_, i) => !usedEntries.has(i));
      console.log(
        `  ${subject}: materials=${mats.length} prosem-sesi=${entries.length} matched-entries=${usedEntries.size} updates=${updates.length} unmatched-sesi=${unmatchedEntries.length}`
      );
      for (const u of updates) {
        console.log(`    w${u.from}->w${u.to} (${u.score.toFixed(2)}) ${u.label.slice(0, 90)}`);
      }
      if (unmatchedEntries.length <= 6) {
        for (const { e } of unmatchedEntries) {
          console.log(`    ? unplaced sesi: ${e.topic} / ${e.subtopic} (w${e.weeks.map((w) => w.week).join(",")})`);
        }
      }

      totalScanned += mats.length;
      if (APPLY) {
        for (const u of updates) {
          await prisma.material.update({ where: { id: u.id }, data: { weekOrder: u.to } });
        }
      }
      totalUpdated += updates.length;
    }
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY-RUN"}: ${totalUpdated} updates across ${totalScanned} materials`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
