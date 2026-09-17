/** Print the subject palette a student actually sees, from the active curriculum. */
import { prisma } from "@/lib/prisma";
import { getActiveCurriculumId } from "@/lib/curriculum-active";

async function main(): Promise<void> {
  const id = (process.argv[2] ?? "RAIHAN001").toUpperCase();
  const s = await prisma.student.findUnique({ where: { studentId: id }, select: { id: true, name: true, gradeLevel: true } });
  if (!s) throw new Error(`no student ${id}`);
  const cid = await getActiveCurriculumId(s.id);
  if (!cid) throw new Error("no active curriculum");

  const rows = await prisma.material.groupBy({
    by: ["subject"], where: { curriculumId: cid }, _count: { _all: true },
  });
  const sorted = rows.sort((a, b) => a.subject.localeCompare(b.subject));
  console.log(`${id} ${s.name} (${s.gradeLevel}) — active ${cid}`);
  console.log(`${sorted.length} subjects, ${sorted.reduce((a, r) => a + r._count._all, 0)} materials\n`);
  for (const r of sorted) console.log(`  ${r.subject.padEnd(24)} ${String(r._count._all).padStart(4)}`);

  const extra = ["Biologi", "Geografi", "Sejarah", "Fisika", "Kimia"];
  console.log("\nrequested subjects:");
  for (const e of extra) {
    const hit = sorted.find((r) => r.subject === e);
    console.log(`  ${hit ? "[OK]   " : "[MISS] "} ${e.padEnd(10)} ${hit ? `${hit._count._all} materials` : "absent"}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
