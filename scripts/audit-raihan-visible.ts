/**
 * Live check: what Raihan actually sees now, through the real read paths.
 *
 * Runs the same queries the app runs, against the running database, and prints
 * before/after numbers side by side. This is the evidence that the fix reached
 * the student, not just the type checker.
 *
 * Run: node scripts/run-ts.mjs scripts/audit-raihan-visible.ts
 */
import { prisma } from "@/lib/prisma";
import { getActiveCurriculumId, ACTIVE_CURRICULUM_ORDER } from "@/lib/curriculum-active";

async function main(): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { studentId: "RAIHAN001" },
    select: { id: true, studentId: true, gradeLevel: true },
  });
  if (!student) throw new Error("RAIHAN001 not found");

  const all = await prisma.curriculum.findMany({
    where: { studentId: student.id },
    orderBy: ACTIVE_CURRICULUM_ORDER as never,
    select: { id: true, version: true, createdAt: true },
  });

  console.log(`══ ${student.studentId} (${student.gradeLevel}) — ${all.length} curriculum(s) ══\n`);

  for (const c of all) {
    const count = await prisma.material.count({ where: { curriculumId: c.id } });
    console.log(`  v${c.version}  ${c.createdAt.toISOString().slice(0, 10)}  ${count} materials`);
  }

  const activeId = await getActiveCurriculumId(student.id);
  const allIds = all.map((c) => c.id);
  console.log(`\n  ACTIVE (v${all[0].version}) = ${activeId}`);
  console.log(`  matches highest version: ${activeId === all[0].id}\n`);

  const [activeSubjects, unionSubjects] = await Promise.all([
    prisma.material.findMany({
      where: { curriculumId: activeId! },
      select: { subject: true },
      distinct: ["subject"],
      orderBy: { subject: "asc" },
    }),
    prisma.material.findMany({
      where: { curriculumId: { in: allIds } },
      select: { subject: true },
      distinct: ["subject"],
      orderBy: { subject: "asc" },
    }),
  ]);

  const [activeCount, unionCount] = await Promise.all([
    prisma.material.count({ where: { curriculumId: activeId! } }),
    prisma.material.count({ where: { curriculumId: { in: allIds } } }),
  ]);

  const a = activeSubjects.map((s) => s.subject);
  const u = unionSubjects.map((s) => s.subject);
  const extra = u.filter((s) => !a.includes(s));

  console.log(`── palet mapel (/api/students/subjects) ──`);
  console.log(`  SEBELUM (union semua) : ${u.length} mapel`);
  console.log(`  SESUDAH (aktif saja)  : ${a.length} mapel`);
  console.log(`  mapel v1 yang kini tidak lagi tampil: ${extra.join(", ") || "(none)"}`);

  console.log(`\n── jumlah material (halaman mapel) ──`);
  console.log(`  SEBELUM (union semua) : ${unionCount}`);
  console.log(`  SESUDAH (aktif saja)  : ${activeCount}`);

  // Fisika is the subject the earlier audit measured 36 vs 18 on.
  for (const subject of ["Fisika", "IPA", "IPS"]) {
    const [act, un] = await Promise.all([
      prisma.material.count({ where: { curriculumId: activeId!, subject } }),
      prisma.material.count({ where: { curriculumId: { in: allIds }, subject } }),
    ]);
    console.log(`  ${subject.padEnd(8)} SEBELUM ${String(un).padStart(3)} → SESUDAH ${String(act).padStart(3)}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
