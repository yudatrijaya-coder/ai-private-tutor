/**
 * Where did Raihan's active-curriculum materials actually come from?
 * Groups by subject and reports the distinct `metadata.source` values.
 *
 * Read-only.
 */
import { prisma } from "@/lib/prisma";
import { getActiveCurriculumId } from "@/lib/curriculum-active";

async function main(): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { studentId: "RAIHAN001" },
    select: { id: true, name: true },
  });
  if (!student) throw new Error("RAIHAN001 not found");

  const cid = await getActiveCurriculumId(student.id);
  if (!cid) throw new Error("no active curriculum");

  const rows = await prisma.material.findMany({
    where: { curriculumId: cid },
    select: { subject: true, metadata: true, sourceUrls: true, topic: true },
    orderBy: { subject: "asc" },
  });

  const bySubject = new Map<string, { n: number; sources: Set<string>; sibi: number }>();
  for (const r of rows) {
    const e = bySubject.get(r.subject) ?? { n: 0, sources: new Set<string>(), sibi: 0 };
    e.n += 1;
    const md = (r.metadata ?? {}) as Record<string, unknown>;
    e.sources.add(String(md.source ?? "(none)"));
    if (r.sourceUrls) e.sibi += 1;
    bySubject.set(r.subject, e);
  }

  console.log(`${student.name} — active curriculum ${cid}`);
  console.log(`${rows.length} materials, ${bySubject.size} subjects\n`);
  console.log("subject".padEnd(24), "n".padStart(3), " src  sources");
  console.log("-".repeat(90));
  for (const [s, e] of [...bySubject.entries()].sort((a, b) => b[1].n - a[1].n)) {
    console.log(
      s.padEnd(24),
      String(e.n).padStart(3),
      String(e.sibi).padStart(4),
      " " + [...e.sources].join(", "),
    );
  }

  const orphans = await prisma.curriculum.findMany({
    where: { studentId: student.id },
    select: { id: true, version: true, _count: { select: { materials: true } } },
    orderBy: { version: "desc" },
  });
  console.log("\ncurriculum rows:");
  for (const c of orphans) {
    console.log(`  v${c.version}  ${c.id}  ${c._count.materials} materials`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
