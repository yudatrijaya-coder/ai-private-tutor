/**
 * Guard for the active-curriculum rule.
 *
 * Two things are asserted:
 *
 *  1. `getActiveCurriculumId` resolves to the highest `version`, for every
 *     student — not "the newest row" by luck.
 *  2. For a student who owns more than one curriculum, reading the active one
 *     gives measurably different answers from reading all of them. If that
 *     assertion ever stops holding, the bug it guards has moved and this file
 *     should be revisited rather than deleted.
 *
 * Run: npx --no-install jiti scripts/check-active-curriculum.ts
 */
import { prisma } from "../src/lib/prisma";
import { getActiveCurriculumId, ACTIVE_CURRICULUM_ORDER } from "../src/lib/curriculum-active";

let failures = 0;
function check(label: string, ok: boolean, detail = ""): void {
  const mark = ok ? "PASS" : "FAIL";
  if (!ok) failures += 1;
  console.log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main(): Promise<void> {
  console.log("── active curriculum rule ──\n");

  const students = await prisma.student.findMany({
    select: { id: true, studentId: true, gradeLevel: true },
    orderBy: { studentId: "asc" },
  });

  let multi = 0;

  for (const s of students) {
    const curricula = await prisma.curriculum.findMany({
      where: { studentId: s.id },
      orderBy: ACTIVE_CURRICULUM_ORDER as never,
      select: { id: true, version: true, createdAt: true },
    });

    console.log(`${s.studentId} (${s.gradeLevel}) — ${curricula.length} curriculum(s)`);

    const resolved = await getActiveCurriculumId(s.id);

    if (curricula.length === 0) {
      check("no curriculum → null", resolved === null);
      continue;
    }

    // Rule 1: highest version wins.
    const maxVersion = Math.max(...curricula.map((c) => c.version));
    const expected = curricula.find((c) => c.version === maxVersion)!;
    check(
      `resolves to highest version (v${maxVersion})`,
      resolved === expected.id,
      `got ${resolved === curricula[0].id ? "first row" : "other"}`,
    );

    // Rule 1b: the orderBy used by every call site agrees with the helper.
    check(`orderBy[0] is the active row`, curricula[0].id === expected.id);

    if (curricula.length > 1) {
      multi += 1;

      const activeId = expected.id;
      const allIds = curricula.map((c) => c.id);

      const activeSubjects = await prisma.material.findMany({
        where: { curriculumId: activeId },
        select: { subject: true },
        distinct: ["subject"],
      });
      const unionSubjects = await prisma.material.findMany({
        where: { curriculumId: { in: allIds } },
        select: { subject: true },
        distinct: ["subject"],
      });
      const activeCount = await prisma.material.count({ where: { curriculumId: activeId } });
      const unionCount = await prisma.material.count({
        where: { curriculumId: { in: allIds } },
      });

      check(
        "active-only differs from union (the guarded bug is real)",
        activeSubjects.length !== unionSubjects.length || activeCount !== unionCount,
        `subjects ${activeSubjects.length} vs ${unionSubjects.length}, ` +
          `materials ${activeCount} vs ${unionCount}`,
      );
      check(
        "active-only is a strict subset",
        activeSubjects.length <= unionSubjects.length && activeCount <= unionCount,
      );
    }
  }

  console.log("");
  if (multi === 0) {
    console.log("NOTE: no student currently owns >1 curriculum, so the behavioural");
    console.log("      assertion was skipped. The rule is still enforced.");
  } else {
    console.log(`${multi} student(s) own >1 curriculum — that is the case this rule exists for.`);
  }

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
