/**
 * Carry subjects that exist only in an older curriculum row into the row in
 * force (highest version), so students keep seeing them.
 *
 * Raihan (SMP_1) owns v1 (264 materials, 14 subjects) and v3 (228, 12). Three
 * subjects — Biologi, Geografi, Sejarah — live only in v1, so the
 * active-curriculum rule dropped them from his palette (15 -> 12).
 *
 * Already present in the active row under the same name? Never touched.
 * Every inserted row carries `metadata._copiedFrom` so the copy is reversible:
 *
 *   UPDATE "Material" SET metadata = metadata - '_copiedFrom'
 *     WHERE metadata ? '_copiedFrom';  -- then delete those ids
 *
 * Usage:  node scripts/run-ts.mjs scripts/copy-missing-subjects.ts          # dry run
 *         node scripts/run-ts.mjs scripts/copy-missing-subjects.ts --apply  # write
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { ACTIVE_CURRICULUM_ORDER } from "@/lib/curriculum-active";

const APPLY = process.argv.includes("--apply");

async function main(): Promise<void> {
  const templates = await prisma.student.findMany({
    where: { isTemplate: true },
    select: { id: true, studentId: true, gradeLevel: true },
  });

  let totalPlanned = 0;

  for (const t of templates) {
    const rows = await prisma.curriculum.findMany({
      where: { studentId: t.id },
      orderBy: ACTIVE_CURRICULUM_ORDER as never,
      select: { id: true, version: true },
    });
    if (rows.length < 2) {
      console.log(`${t.studentId} (${t.gradeLevel}): 1 curriculum — nothing to carry over`);
      continue;
    }
    const active = rows[0];
    const olderIds = rows.slice(1).map((r) => r.id);

    const activeSubjects = (
      await prisma.material.findMany({
        where: { curriculumId: active.id },
        select: { subject: true },
        distinct: ["subject"],
      })
    ).map((m) => m.subject);

    const missing = await prisma.material.findMany({
      where: { curriculumId: { in: olderIds }, subject: { notIn: activeSubjects } },
      include: { quizzes: true, prerequisites: { select: { id: true } } },
      orderBy: [{ subject: "asc" }, { weekOrder: "asc" }],
    });

    // Idempotence: drop anything already carried into the active row, so a
    // half-finished run can simply be re-run.
    const activeMeta = await prisma.material.findMany({
      where: { curriculumId: active.id },
      select: { metadata: true },
    });
    const carried = new Set(
      activeMeta
        .map((m) => (m.metadata as any)?._copiedFrom?.materialId)
        .filter((x): x is string => typeof x === "string"),
    );
    if (carried.size > 0) console.log(`  ${carried.size} already carried over — skipped`);
    const todo = missing.filter((m) => !carried.has(m.id));

    console.log(`\n═══ ${t.studentId} (${t.gradeLevel}) — active v${active.version} ${active.id} ═══`);
    if (missing.length === 0) {
      console.log("  no subject is unique to an older row");
      continue;
    }

    const bySubject = new Map<string, typeof todo>();
    for (const m of todo) {
      if (!bySubject.has(m.subject)) bySubject.set(m.subject, []);
      bySubject.get(m.subject)!.push(m);
    }
    for (const [subj, mats] of bySubject) {
      const weeks = mats.map((m) => m.weekOrder);
      const q = mats.reduce((a, m) => a + m.quizzes.length, 0);
      const withSlide = mats.filter((m) => (m.metadata as any)?.slide).length;
      console.log(
        `  ${subj.padEnd(10)} ${String(mats.length).padStart(3)} materials  weeks ${Math.min(...weeks)}..${Math.max(...weeks)}  quizzes ${q}  slides ${withSlide}  status ${[...new Set(mats.map((m) => m.status))].join("/")}`,
      );
    }
    totalPlanned += todo.length;

    if (!APPLY || todo.length === 0) continue;

    // Two passes: create materials (ids remapped), then quizzes.
    const idMap = new Map<string, string>();
    for (const m of todo) idMap.set(m.id, randomUUID());

    for (const m of todo) {
      const { id: _id, curriculumId: _c, createdAt: _cr, updatedAt: _up, quizzes: _q, prerequisites: _p, ...rest } = m as any;
      await prisma.material.create({
        data: {
          ...rest,
          id: idMap.get(m.id)!,
          curriculumId: active.id,
          metadata: { ...((m.metadata as Record<string, unknown>) ?? {}), _copiedFrom: { curriculumId: m.curriculumId, materialId: m.id } } as Prisma.InputJsonValue,
          prerequisiteId: m.prerequisiteId && idMap.has(m.prerequisiteId) ? idMap.get(m.prerequisiteId)! : null,
        },
      });
    }
    let quizzes = 0;
    for (const m of todo) {
      for (const q of m.quizzes) {
        const { id: _id, createdAt: _cr, updatedAt: _up, ...qrest } = q as any;
        await prisma.quiz.create({ data: { ...qrest, id: randomUUID(), materialId: idMap.get(m.id)! } });
        quizzes++;
      }
    }
    console.log(`  APPLIED: ${missing.length} materials + ${quizzes} quizzes -> v${active.version}`);
  }

  console.log(`\n${APPLY ? "applied" : "dry run"}: ${totalPlanned} materials would be carried over`);
  if (!APPLY) console.log("re-run with --apply to write");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
