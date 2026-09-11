/**
 * B-01 — fix materials whose `gradeLevel` disagrees with their owner's grade.
 *
 * Finding (docs/designs/2026-09-11-bug-hunt-findings.md §B-01): 197 `Material`
 * rows inside RAIHAN001's (SMP_1) curriculum were labelled `SMA_2`.
 *
 * Evidence that the LABEL is wrong, not the rows:
 *   - 44 of the 79 distinct topics on those rows exist verbatim in
 *     `src/data/curriculum-topics-smp7.ts`; 0 exist only in the SMA-11 file.
 *     (e.g. "Teks Deskripsi", "Menulis Cerita Fantasi", "Bilangan", "Aljabar",
 *     "Klasifikasi Makhluk Hidup", "Greetings", "Berpikir Komputasional".)
 *   - The remaining 31 are likewise Kelas-7 topics that simply are not listed
 *     in the generated topic file ("latar sejarah kelahiran Pancasila",
 *     "Besaran dan Pengukuran", "Pengantar Informatika", ...).
 *   - They live in Raihan's SMP_1 curriculum and carry generated content
 *     (slide_sibi 197/197, mindmap_sibi 197/197, videoUrl 185/197) produced for
 *     those SMP topics.
 *
 * So the fix is to correct the label, not to delete content.
 *
 * Safety:
 *   - dry-run by default; `--apply` is required to write
 *   - a rollback snapshot (id -> old gradeLevel) is written before any update
 *   - the UPDATE runs in a single transaction and is scoped to rows whose
 *     owner grade differs, so re-running is a no-op
 *
 * Usage:
 *   npx tsx scripts/fix-b01-grade-mislabel.ts [studentIdentifier] [--apply]
 */

import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const studentIdentifier = args.find((a) => !a.startsWith("--")) ?? "RAIHAN001";

async function main() {
  const student = await prisma.student.findUnique({
    where: { studentId: studentIdentifier },
    select: { id: true, studentId: true, gradeLevel: true },
  });
  if (!student) throw new Error(`Student ${studentIdentifier} not found`);

  // Rows that disagree with the owner's grade — the general form of B-01.
  const rows = await prisma.$queryRawUnsafe<
    { id: string; gradeLevel: string; subject: string; topic: string | null }[]
  >(
    `SELECT m.id, m."gradeLevel", m.subject, m.topic
       FROM "Material" m
       JOIN "Curriculum" c ON m."curriculumId" = c.id
      WHERE c."studentId" = $1
        AND m."gradeLevel" <> $2::"GradeLevel"
      ORDER BY m.subject, m.topic`,
    student.id,
    student.gradeLevel,
  );

  console.log(`student        : ${student.studentId} (${student.gradeLevel})`);
  console.log(`mismatched rows: ${rows.length}`);
  if (rows.length === 0) {
    console.log("nothing to do — already consistent");
    return;
  }

  const byGrade = new Map<string, number>();
  for (const r of rows) byGrade.set(r.gradeLevel, (byGrade.get(r.gradeLevel) ?? 0) + 1);
  for (const [g, n] of byGrade) console.log(`  labelled ${g}: ${n}`);

  const snapshotPath = `docs/designs/2026-09-11-b01-rollback-${student.studentId}.json`;
  const snapshot = {
    finding: "B-01",
    generatedAt: new Date().toISOString(),
    student: { id: student.id, studentId: student.studentId, gradeLevel: student.gradeLevel },
    targetGradeLevel: student.gradeLevel,
    rowCount: rows.length,
    rows: rows.map((r) => ({ id: r.id, from: r.gradeLevel, to: student.gradeLevel })),
  };

  if (!APPLY) {
    console.log(`\n[dry-run] would set gradeLevel -> ${student.gradeLevel} on ${rows.length} rows`);
    console.log(`[dry-run] snapshot that WOULD be written: ${snapshotPath}`);
    console.log("[dry-run] re-run with --apply to execute");
    return;
  }

  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`\nsnapshot written: ${snapshotPath}`);

  const ids = rows.map((r) => r.id);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `UPDATE "Material"
          SET "gradeLevel" = $1::"GradeLevel", "updatedAt" = NOW()
        WHERE id = ANY($2::text[])`,
      student.gradeLevel,
      ids,
    );
  });
  console.log(`updated ${ids.length} rows -> gradeLevel=${student.gradeLevel}`);

  // Verify: no mismatches left, and the row count is unchanged (no deletions).
  const remaining = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*) AS n
       FROM "Material" m
       JOIN "Curriculum" c ON m."curriculumId" = c.id
      WHERE c."studentId" = $1
        AND m."gradeLevel" <> $2::"GradeLevel"`,
    student.id,
    student.gradeLevel,
  );
  console.log(`verification: mismatches remaining = ${remaining[0].n}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
