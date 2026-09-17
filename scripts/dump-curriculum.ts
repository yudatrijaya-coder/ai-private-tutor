/**
 * Dump every material of a student's active curriculum grouped by subject,
 * so the shape of IPA/IPS vs the split subjects can be compared.
 *
 * Read-only.
 */
import { prisma } from "@/lib/prisma";
import { getActiveCurriculumId } from "@/lib/curriculum-active";
import { writeFileSync } from "node:fs";

const STUDENT = process.argv[2] ?? "RAIHAN001";
const OUT = process.argv[3] ?? "/tmp/dump-curriculum.json";

async function main(): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { studentId: STUDENT },
    select: { id: true, name: true, gradeLevel: true },
  });
  if (!student) throw new Error(`${STUDENT} not found`);
  const cid = await getActiveCurriculumId(student.id);
  if (!cid) throw new Error("no active curriculum");

  const rows = await prisma.material.findMany({
    where: { curriculumId: cid },
    select: {
      subject: true,
      topic: true,
      subTopic: true,
      weekOrder: true,
      priority: true,
      status: true,
      _count: { select: { quizzes: true } },
    },
    orderBy: [{ subject: "asc" }, { weekOrder: "asc" }],
  });

  const out: Record<string, unknown[]> = {};
  for (const r of rows) {
    (out[r.subject] ??= []).push({
      w: r.weekOrder,
      t: r.topic,
      s: r.subTopic,
      q: r._count.quizzes,
      st: r.status,
    });
  }
  writeFileSync(OUT, JSON.stringify({ student: student.name, cid, subjects: out }, null, 1));
  console.log(`${student.name} ${student.gradeLevel} — ${rows.length} rows, ${Object.keys(out).length} subjects`);
  for (const [s, v] of Object.entries(out)) console.log(`  ${s.padEnd(24)} ${v.length}`);
  console.log(`\nwritten: ${OUT}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
