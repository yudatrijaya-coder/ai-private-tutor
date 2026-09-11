/**
 * B-02 remediation (part 2) — leaked LLM reasoning in `metadata.mindmap_sibi`.
 *
 * Same root cause as the slide variant (`scripts/fix-b02-slide-cot.ts`): the
 * SIBI scripts persist the model's output without validating it. For mindmaps
 * the deliberation lands in the node labels, which is worse than a slide dump
 * because the tree is rendered node by node:
 *
 *   [{"id":"0","label":"Struktur Bumi","children":[
 *      {"id":"1","label":"Thinking. 1.  **Analyze the Request:**"},
 *      {"id":"2","label":"Target: Mindmap outline."},
 *      {"id":"3","label":"Format: Hierarchical, indented dashes, 2 spaces per level."}]}]
 *
 * 289 of 1426 rows (20%) were contaminated. The resolver bug that let it through
 * is fixed in `src/lib/content/slide-content.ts` — `resolveMindmap` used to
 * return any non-empty array unvalidated, so the JSON tree bypassed the detector
 * entirely. That fix alone stops the leak; this script cleans the stored data.
 *
 * Strategy — never destroy the original:
 *   1. the contaminated tree is MOVED to `metadata.mindmap_sibi_raw`
 *   2. `metadata.mindmap_sibi` is set to the first usable clean candidate
 *      (`metadata.mindmap`)
 *   3. when no clean candidate exists the key is REMOVED so the UI renders no
 *      mindmap rather than deliberation
 *
 * Safety:
 *   - dry-run by default; `--apply` writes
 *   - rollback snapshot written before any update
 *   - one transaction, idempotent (rows already carrying mindmap_sibi_raw skipped)
 *
 * Usage:
 *   npx tsx scripts/fix-b02-mindmap-cot.ts [--apply]
 */

import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { isUsableMindmap, resolveMindmap, candidateText, isLlmReasoningDump } from "../src/lib/content/slide-content";

const APPLY = process.argv.includes("--apply");

type Row = { id: string; subject: string; metadata: Record<string, unknown> | null };

async function main() {
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT id, subject, metadata
       FROM "Material"
      WHERE metadata ? 'mindmap_sibi'
        AND NOT (metadata ? 'mindmap_sibi_raw')`,
  );

  const plan: {
    id: string;
    subject: string;
    action: "replace" | "clear";
    replacementLength: number;
    contaminatedLength: number;
  }[] = [];

  for (const r of rows) {
    const sibi = r.metadata?.["mindmap_sibi"];
    if (!isLlmReasoningDump(candidateText(sibi))) continue;
    const replacement = resolveMindmap(r.metadata, "sibi");
    plan.push({
      id: r.id,
      subject: r.subject,
      action: replacement ? "replace" : "clear",
      replacementLength: replacement ? replacement.length : 0,
      contaminatedLength: candidateText(sibi).length,
    });
  }

  const toReplace = plan.filter((p) => p.action === "replace");
  const toClear = plan.filter((p) => p.action === "clear");

  console.log(`kandidat diperiksa   : ${rows.length}`);
  console.log(`terkontaminasi       : ${plan.length}`);
  console.log(`  diganti isi bersih : ${toReplace.length}`);
  console.log(`  dibersihkan        : ${toClear.length}`);

  const bySubject = new Map<string, number>();
  for (const p of plan) bySubject.set(p.subject, (bySubject.get(p.subject) ?? 0) + 1);
  console.log("\nper mapel:");
  for (const [s, n] of Array.from(bySubject.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s.padEnd(24)} ${n}`);
  }
  if (toClear.length) {
    console.log("\ntanpa pengganti (mindmap_sibi dihapus):");
    for (const p of toClear) console.log(`  ${p.id}  ${p.subject}`);
  }

  if (plan.length === 0) {
    console.log("\ntidak ada yang perlu dikerjakan");
    return;
  }

  const snapshotPath = "docs/designs/2026-09-11-b02-mindmap-rollback.json";
  const snapshot = {
    finding: "B-02 (mindmap)",
    generatedAt: new Date().toISOString(),
    note: "mindmap_sibi_raw menahan pohon asli; snapshot ini menahan seluruh metadata pra-perubahan",
    rowCount: plan.length,
    rows: plan.map((p) => ({
      id: p.id,
      action: p.action,
      metadataBefore: rows.find((r) => r.id === p.id)?.metadata ?? null,
    })),
  };

  if (!APPLY) {
    console.log(`\n[dry-run] ${toReplace.length} baris diganti, ${toClear.length} baris dibersihkan`);
    console.log(`[dry-run] snapshot yang AKAN ditulis: ${snapshotPath}`);
    console.log("[dry-run] jalankan ulang dengan --apply");
    return;
  }

  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`\nsnapshot ditulis: ${snapshotPath}`);

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const current = rows.find((r) => r.id === p.id)!.metadata ?? {};
      const next: Record<string, unknown> = { ...current };
      // 1. preserve the original tree
      next.mindmap_sibi_raw = current.mindmap_sibi;
      // 2. serve a clean tree, or remove the key entirely
      const replacement = resolveMindmap(current, "sibi");
      if (replacement) {
        next.mindmap_sibi = JSON.parse(replacement);
      } else {
        delete next.mindmap_sibi;
      }

      await tx.$executeRawUnsafe(
        `UPDATE "Material" SET metadata = $1::jsonb, "updatedAt" = NOW() WHERE id = $2`,
        JSON.stringify(next),
        p.id,
      );
    }
  });
  console.log(`diperbarui ${plan.length} baris`);

  // Verify: nothing contaminated left in mindmap_sibi, originals preserved.
  const after = await prisma.$queryRawUnsafe<{ id: string; metadata: Record<string, unknown> | null }[]>(
    `SELECT id, metadata FROM "Material" WHERE metadata ? 'mindmap_sibi'`,
  );
  let remaining = 0;
  for (const r of after) {
    const v = r.metadata?.["mindmap_sibi"];
    if (isLlmReasoningDump(candidateText(v))) remaining++;
    else if (!isUsableMindmap(v)) remaining++; // unusable is as bad as contaminated
  }
  const preserved = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*) AS n FROM "Material" WHERE metadata->'mindmap_sibi_raw' IS NOT NULL`,
  );
  console.log(`verifikasi: mindmap_sibi tak layak/dump = ${remaining}`);
  console.log(`verifikasi: mindmap_sibi_raw tersimpan  = ${preserved[0].n}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
