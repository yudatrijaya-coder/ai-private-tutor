/**
 * B-02 remediation — move leaked LLM reasoning out of `metadata.slide_sibi`.
 *
 * Finding: 268 of 1426 materials (19%) had `metadata.slide_sibi` filled with the
 * model's chain-of-thought instead of slides. The SIBI scripts strip ``` fences
 * but never validate the output, so when the model deliberated instead of
 * answering, the deliberation was persisted verbatim and then rendered to
 * students (the display path used `metadata?.slide_sibi ?? metadata?.slide`, so
 * a non-null garbage value short-circuited the fallback).
 *
 * Strategy — never destroy the original:
 *   1. the contaminated text is MOVED to `metadata.slide_sibi_raw`
 *   2. `metadata.slide_sibi` is set to the first usable clean candidate
 *      (`metadata.slide`, `metadata.slides`, `metadata.slide_moodle`)
 *   3. when no clean candidate exists (2 placeholder rows, weekOrder=999, no
 *      content anywhere) the key is REMOVED so the UI falls back gracefully
 *      instead of showing deliberation
 *
 * Safety:
 *   - dry-run by default; `--apply` writes
 *   - rollback snapshot written before any update
 *   - one transaction, idempotent (rows already carrying slide_sibi_raw skipped)
 *
 * Usage:
 *   npx tsx scripts/fix-b02-slide-cot.ts [--apply]
 */

import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { isLlmReasoningDump, resolveSlideMarkdown } from "../src/lib/content/slide-content";

const APPLY = process.argv.includes("--apply");

type Row = { id: string; subject: string; metadata: Record<string, unknown> | null };

async function main() {
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT id, subject, metadata
       FROM "Material"
      WHERE metadata->>'slide_sibi' IS NOT NULL
        AND metadata->'slide_sibi_raw' IS NULL`,
  );

  const plan: {
    id: string;
    subject: string;
    action: "replace" | "clear";
    replacementLength: number;
    contaminatedLength: number;
  }[] = [];

  for (const r of rows) {
    const sibi = r.metadata?.["slide_sibi"];
    if (!isLlmReasoningDump(sibi)) continue;
    const replacement = resolveSlideMarkdown(r.metadata, "sibi");
    plan.push({
      id: r.id,
      subject: r.subject,
      action: replacement ? "replace" : "clear",
      replacementLength: replacement ? replacement.length : 0,
      contaminatedLength: typeof sibi === "string" ? sibi.length : 0,
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
    console.log("\ntanpa pengganti (slide_sibi dihapus):");
    for (const p of toClear) console.log(`  ${p.id}  ${p.subject}`);
  }

  if (plan.length === 0) {
    console.log("\ntidak ada yang perlu dikerjakan");
    return;
  }

  const snapshotPath = "docs/designs/2026-09-11-b02-rollback.json";
  const snapshot = {
    finding: "B-02",
    generatedAt: new Date().toISOString(),
    note: "slide_sibi_raw menahan teks asli; snapshot ini menahan seluruh metadata pra-perubahan",
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
      // 1. preserve the original deliberation
      next.slide_sibi_raw = current.slide_sibi;
      // 2. serve clean content, or remove the key entirely
      const replacement = resolveSlideMarkdown(current, "sibi");
      if (replacement) next.slide_sibi = replacement;
      else delete next.slide_sibi;

      await tx.$executeRawUnsafe(
        `UPDATE "Material" SET metadata = $1::jsonb, "updatedAt" = NOW() WHERE id = $2`,
        JSON.stringify(next),
        p.id,
      );
    }
  });
  console.log(`diperbarui ${plan.length} baris`);

  // Verify: no dump left in slide_sibi, originals preserved.
  const remaining = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*) AS n FROM "Material"
      WHERE metadata->>'slide_sibi' IS NOT NULL
        AND (metadata->>'slide_sibi' ~* '\\bthe user wants\\b'
             OR metadata->>'slide_sibi' ~* 'analy[sz]e the request'
             OR metadata->>'slide_sibi' ~* 'deconstruct the'
             OR metadata->>'slide_sibi' ~* 'identify the goal'
             OR metadata->>'slide_sibi' ~* '^\\s*<think>'
             OR metadata->>'slide_sibi' ~* '^\\s*thinking\\.')`,
  );
  const preserved = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*) AS n FROM "Material" WHERE metadata->'slide_sibi_raw' IS NOT NULL`,
  );
  console.log(`verifikasi: dump tersisa di slide_sibi = ${remaining[0].n}`);
  console.log(`verifikasi: slide_sibi_raw tersimpan   = ${preserved[0].n}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
