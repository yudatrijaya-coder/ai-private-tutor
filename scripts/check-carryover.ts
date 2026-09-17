/**
 * After carrying subjects over: does any lesson now appear twice in the active
 * curriculum, and what exactly was inserted (for rollback)?
 *
 * Usage: node scripts/run-ts.mjs scripts/check-carryover.ts [--dump]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { getActiveCurriculumId } from "@/lib/curriculum-active";

async function main(): Promise<void> {
  const s = await prisma.student.findUnique({ where: { studentId: "RAIHAN001" }, select: { id: true } });
  const cid = (await getActiveCurriculumId(s!.id))!;

  const rows = await prisma.material.findMany({
    where: { curriculumId: cid }, select: { id: true, subject: true, topic: true, subTopic: true, weekOrder: true, metadata: true },
  });

  console.log("── same topic+subTopic under more than one subject ──");
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = `${r.topic}||${r.subTopic}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  let dupes = 0;
  for (const [k, v] of groups) {
    const subs = [...new Set(v.map((r) => r.subject))];
    if (subs.length < 2) continue;
    dupes++;
    console.log(`  ${k}  ->  ${subs.map((x) => `${x}(w${v.find((r) => r.subject === x)!.weekOrder})`).join(", ")}`);
  }
  console.log(dupes === 0 ? "  none" : `  ${dupes} lesson(s) taught under two subject names (same as Fisika/Kimia vs IPA)`);

  const carried = rows.filter((r) => (r.metadata as any)?._copiedFrom);
  console.log(`\n── carried over into the active row: ${carried.length} ──`);
  for (const c of carried) console.log(`  ${c.subject.padEnd(9)} w${String(c.weekOrder).padStart(2)} ${String(c.subTopic).slice(0, 44)}`);

  const q = await prisma.quiz.count({ where: { materialId: { in: carried.map((c) => c.id) } } });
  console.log(`\nquizzes attached to the carried materials: ${q}`);

  if (process.argv.includes("--dump")) {
    mkdirSync("audit-reports", { recursive: true });
    const path = "audit-reports/2026-09-17-carryover-raihan.json";
    writeFileSync(path, JSON.stringify({
      studentId: "RAIHAN001", curriculumId: cid, insertedAt: new Date().toISOString(),
      rollback: `DELETE FROM "Quiz" WHERE "materialId" IN (SELECT id FROM "Material" WHERE metadata ? '_copiedFrom'); DELETE FROM "Material" WHERE metadata ? '_copiedFrom';`,
      materials: carried.map((c) => ({ id: c.id, subject: c.subject, topic: c.topic, subTopic: c.subTopic, weekOrder: c.weekOrder, copiedFrom: (c.metadata as any)._copiedFrom })),
      quizCount: q,
    }, null, 2) + "\n");
    console.log(`\nwrote ${path}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
