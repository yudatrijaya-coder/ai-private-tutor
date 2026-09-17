/**
 * Emit `src/data/curriculum-topics-smp7.ts` from a student's active curriculum.
 *
 * The hand-written data bank in that file was built for the Kurikulum Merdeka
 * integrated palette (IPA / IPS) and therefore no longer matches what the
 * school teaches — Moodle runs Biologi, Fisika, Kimia, Geografi and Sejarah as
 * separate courses. Regenerating a curriculum from the data bank would silently
 * restore the wrong subjects.
 *
 * This rebuilds the data bank so that `GRADE_TOPICS.SMP_1` produces exactly the
 * subject set and topics of the reference curriculum (the Raihan template).
 *
 * Subjects are emitted in the given order; entries within a subject keep the
 * curriculum's own (weekOrder, topic, subTopic) ordering.
 *
 * Usage:
 *   node scripts/run-ts.mjs scripts/emit-smp7-bank.ts              # dry run
 *   node scripts/run-ts.mjs scripts/emit-smp7-bank.ts --write
 */
import { prisma } from "@/lib/prisma";
import { getActiveCurriculumId } from "@/lib/curriculum-active";
import { writeFileSync } from "node:fs";

const ARGS = process.argv.slice(2);
const STUDENT = ARGS.find((a) => !a.startsWith("--")) ?? "RAIHAN001";
const WRITE = ARGS.includes("--write");
const OUT = "src/data/curriculum-topics-smp7.ts";

/** Emit order. Must cover every subject of the reference curriculum. */
const ORDER = [
  "Biologi",
  "Fisika",
  "Kimia",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Bahasa Mandarin",
  "Matematika",
  "Geografi",
  "Sejarah",
  "Ekonomi",
  "Sosiologi",
  "Informatika",
  "Pendidikan Agama Islam",
  "Pendidikan Pancasila",
  "PJOK",
];

function q(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function main(): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { studentId: STUDENT },
    select: { id: true, name: true },
  });
  if (!student) throw new Error(`${STUDENT} not found`);
  const cid = await getActiveCurriculumId(student.id);
  if (!cid) throw new Error("no active curriculum");

  const rows = await prisma.material.findMany({
    where: { curriculumId: cid },
    select: { subject: true, topic: true, subTopic: true, weekOrder: true, priority: true },
    orderBy: [{ weekOrder: "asc" }, { topic: "asc" }, { subTopic: "asc" }],
  });

  const found = [...new Set(rows.map((r) => r.subject))].sort();
  const missing = found.filter((s) => !ORDER.includes(s));
  const extra = ORDER.filter((s) => !found.includes(s));
  if (missing.length || extra.length) {
    throw new Error(
      `ORDER does not match the curriculum.\n  not in ORDER: ${missing.join(", ") || "-"}\n  in ORDER but absent: ${extra.join(", ") || "-"}`,
    );
  }

  const lines: string[] = [];
  for (const subject of ORDER) {
    const mine = rows.filter((r) => r.subject === subject);
    lines.push(``);
    lines.push(`    // ═══ ${subject} — ${mine.length} sub-topik ═══`);
    for (const r of mine) {
      lines.push(
        `    { subject: ${q(subject)}, topic: ${q(r.topic)}, subTopic: ${q(r.subTopic ?? "")}, weekOrder: ${r.weekOrder}, priority: ${r.priority} },`,
      );
    }
  }

  const header = `/**
 * Full SMP Kelas 7 Kurikulum Merdeka.
 *
 * Subject structure follows the school, not the 2022 integrated model: Moodle
 * Kumbang runs Biologi (4169), Fisika (4171), Kimia (4174), Geografi (4172) and
 * Sejarah (4179) as separate VII A courses and has no IPA or IPS course at all.
 * Ekonomi (4170) is likewise its own course.
 *
 * Generated from the reference curriculum (student ${STUDENT}, curriculum
 * ${cid}) by \`scripts/emit-smp7-bank.ts\`. Regenerate with:
 *
 *   node scripts/run-ts.mjs scripts/emit-smp7-bank.ts --write
 *
 * Do not hand-edit: the point of this file is that \`GRADE_TOPICS.SMP_1\`
 * reproduces the school's subject set exactly, so that regenerating a
 * curriculum cannot drop or invent a subject.
 */
import type { TopicEntry } from "./curriculum-topics";

export const GRADE_TOPICS_SMP7: Record<string, TopicEntry[]> = {
  SMP_1: [${lines.join("\n")}
  ],
};
`;

  const counts = ORDER.map((s) => `${s}=${rows.filter((r) => r.subject === s).length}`);
  console.log(`${student.name} — ${rows.length} entries, ${ORDER.length} subjects`);
  console.log(counts.join("  "));
  console.log(`\n${WRITE ? "wrote" : "would write"}: ${OUT}`);

  if (WRITE) writeFileSync(OUT, header);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
