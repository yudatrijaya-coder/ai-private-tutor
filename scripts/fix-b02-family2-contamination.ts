/**
 * Remediate the SECOND family of leaked LLM deliberation (ledger B-02).
 *
 * Why this exists
 * ---------------
 * The first B-02 pass (`scripts/fix-b02-slide-cot.ts`,
 * `scripts/fix-b02-mindmap-cot.ts`) keyed on the model *narrating* its plan:
 * "Analyze the Request", "Deconstruct the", "Let me think", …
 *
 * A follow-up sweep found a second family it never matched. Here the model
 * *restated the brief* as a bulleted spec and then appended the real outline:
 *
 *   [{"label": "Goal: Create a mind map outline."},
 *    {"label": "Format: Dash (-) and indentation."},
 *    {"label": "Levels: Maximum 3 levels."},
 *    {"label": "Style: Terse, direct, no filler. ..."},
 *    {"label": "Kekalahan Jepang"}, ...]        ← the real mindmap follows
 *
 * 67 `mindmap_sibi` rows and 2 `slide_sibi` rows were contaminated this way.
 * The detector in `src/lib/content/slide-content.ts` now covers both families,
 * so students never saw these (the resolver skips an unusable candidate and
 * falls back), but the garbage was still sitting in the database — a landmine
 * for any code path that reads `metadata->>'mindmap_sibi'` directly.
 *
 * What it does
 * ------------
 * For each contaminated row: move the value to `<field>_raw` and drop the
 * contaminated key. Every one of the 69 rows has a clean `metadata.mindmap` /
 * `metadata.slide` fallback, so the resolver keeps serving real content and
 * **nothing is regenerated** — no LLM cost, no chance of new contamination.
 * The original value is preserved in `_raw`, so this is reversible.
 *
 * Usage
 * -----
 *   npx tsx scripts/fix-b02-family2-contamination.ts            # dry run
 *   npx tsx scripts/fix-b02-family2-contamination.ts --apply    # write
 *
 * A rollback snapshot is written to
 * `docs/designs/2026-09-11-b02-family2-rollback.json` before any write.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import {
  candidateText,
  isLlmReasoningDump,
  isMindmapContaminated,
  isUsableMindmap,
  isUsableSlideText,
} from "../src/lib/content/slide-content";

const APPLY = process.argv.includes("--apply");
const SNAPSHOT = "docs/designs/2026-09-11-b02-family2-rollback.json";

type Field = "mindmap_sibi" | "slide_sibi";

interface Target {
  id: string;
  label: string;
  field: Field;
  fallbackKey: string;
  previous: unknown;
}

// Delegates to the shared predicates so this script and the render path can
// never disagree about what counts as contaminated.
function isContaminated(value: unknown, field: Field): boolean {
  return field === "mindmap_sibi"
    ? isMindmapContaminated(value)
    : isLlmReasoningDump(candidateText(value));
}

function hasCleanFallback(meta: Record<string, unknown>, field: Field): boolean {
  return field === "mindmap_sibi"
    ? isUsableMindmap(meta.mindmap)
    : isUsableSlideText(meta.slide);
}

async function main() {
  const rows = await prisma.material.findMany({
    select: { id: true, subject: true, topic: true, subTopic: true, metadata: true },
  });

  const targets: Target[] = [];
  const orphans: string[] = [];

  for (const row of rows) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const label = `${row.subject} / ${row.topic} / ${row.subTopic}`;

    for (const field of ["mindmap_sibi", "slide_sibi"] as Field[]) {
      const value = meta[field];
      if (value == null) continue;
      if (!isContaminated(value, field)) continue;

      if (!hasCleanFallback(meta, field)) {
        // Blanking the field would leave the student with nothing to render.
        // Report instead of guessing — a clean replacement has to be sourced
        // deliberately, not invented here.
        orphans.push(`${row.id} ${field} ${label}`);
        continue;
      }

      targets.push({
        id: row.id,
        label,
        field,
        fallbackKey: field === "mindmap_sibi" ? "mindmap" : "slide",
        previous: value,
      });
    }
  }

  const byField = targets.reduce<Record<string, number>>((acc, t) => {
    acc[t.field] = (acc[t.field] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`diperiksa          : ${rows.length} material`);
  console.log(`terkontaminasi     : ${targets.length} field`);
  for (const [f, n] of Object.entries(byField)) console.log(`  ${f.padEnd(14)}: ${n}`);
  console.log(`tanpa pengganti    : ${orphans.length}`);
  for (const o of orphans.slice(0, 10)) console.log(`  ! ${o}`);

  if (targets.length === 0) {
    console.log("\nTidak ada yang perlu diperbaiki.");
    return;
  }

  console.log("\nContoh rencana:");
  for (const t of targets.slice(0, 3)) {
    const len = candidateText(t.previous).length;
    console.log(`  ${t.id.slice(0, 8)}  ${t.field} (${len} char) -> ${t.field}_raw, fallback ${t.fallbackKey}`);
    console.log(`     ${t.label}`);
  }

  if (!APPLY) {
    console.log(`\n[dry-run] tidak menulis. Jalankan dengan --apply untuk menyimpan.`);
    return;
  }

  writeFileSync(
    SNAPSHOT,
    JSON.stringify(
      targets.map((t) => ({ id: t.id, field: t.field, previous: t.previous })),
      null,
      2,
    ),
  );
  console.log(`\nSnapshot rollback: ${SNAPSHOT}`);

  let moved = 0;
  for (const t of targets) {
    const row = await prisma.material.findUnique({
      where: { id: t.id },
      select: { metadata: true },
    });
    const meta = { ...((row?.metadata ?? {}) as Record<string, unknown>) };
    // Only overwrite `_raw` if it is empty: a populated `_raw` means an earlier
    // pass already archived a cleaner value, and clobbering it would lose data.
    if (meta[`${t.field}_raw`] == null) {
      meta[`${t.field}_raw`] = t.previous;
    }
    delete meta[t.field];

    await prisma.material.update({
      where: { id: t.id },
      data: { metadata: meta as never },
    });
    moved++;
  }

  console.log(`\n=== Rekap ===`);
  console.log(`dipindahkan ke _raw : ${moved}`);
  console.log(`tanpa pengganti     : ${orphans.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
