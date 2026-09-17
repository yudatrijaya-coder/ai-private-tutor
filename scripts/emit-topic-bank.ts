/**
 * Emit a grade's `curriculum-topics-*.ts` from a live curriculum.
 *
 * `GRADE_TOPICS` is what `generateCurriculumDraft` iterates, so it decides which
 * subjects and topics a regenerated curriculum contains. Two of the three banks
 * had drifted from the curricula the school actually runs:
 *
 *   SMP_1  99 hand-written entries, Kurikulum Merdeka integrated palette
 *          (IPA / IPS, no Biologi / Fisika / Geografi / Sejarah)
 *   SMA_2  172 hand-written entries vs 403 in the live curriculum
 *
 * Rebuilding from a live curriculum makes the bank reproduce the school's
 * subject set exactly, so regenerating cannot drop or invent a subject.
 *
 * Subjects are ordered by their earliest weekOrder (ties broken by name) so the
 * output is a pure function of the curriculum — no hand-maintained list to drift.
 *
 * Usage:
 *   node scripts/run-ts.mjs scripts/emit-topic-bank.ts                    # dry run, all grades
 *   node scripts/run-ts.mjs scripts/emit-topic-bank.ts --grade SMA_2
 *   node scripts/run-ts.mjs scripts/emit-topic-bank.ts --to /tmp/out      # write to a dir, for diffing
 *   node scripts/run-ts.mjs scripts/emit-topic-bank.ts --write
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { getActiveCurriculumId } from "@/lib/curriculum-active";

const ARGS = process.argv.slice(2);
const WRITE = ARGS.includes("--write");
const TO = ARGS.includes("--to") ? ARGS[ARGS.indexOf("--to") + 1] : null;
const ONLY = ARGS.includes("--grade") ? ARGS[ARGS.indexOf("--grade") + 1] : null;

const GRADES = {
  SD_5: { student: "SYIFA001", out: "src/data/curriculum-topics-sd5.ts", const: "GRADE_TOPICS_SD5", key: "SD_5", label: "SD Kelas 5" },
  SMP_1: { student: "RAIHAN001", out: "src/data/curriculum-topics-smp7.ts", const: "GRADE_TOPICS_SMP7", key: "SMP_1", label: "SMP Kelas 7" },
  SMA_2: { student: "SHOFI001", out: "src/data/curriculum-topics-sma11.ts", const: "GRADE_TOPICS_SMA11", key: "SMA_2", label: "SMA Kelas 11" },
} as const;

type GradeKey = keyof typeof GRADES;

/**
 * A TS string literal for any value. `JSON.stringify` rather than manual
 * escaping: the live data contains embedded newlines (`"masa akhir pemerintah
 * Belanda di Indonesia\n…"`) and hand-rolled escaping silently emitted a
 * multi-line string literal and broke the file.
 */
function q(s: string): string {
  return JSON.stringify(s);
}

interface Row {
  subject: string;
  topic: string;
  subTopic: string | null;
  weekOrder: number;
  priority: number;
}

/** Subject order derived from the curriculum: earliest week, then name. */
function deriveOrder(rows: Row[]): string[] {
  const first = new Map<string, number>();
  for (const r of rows) {
    const cur = first.get(r.subject);
    if (cur === undefined || r.weekOrder < cur) first.set(r.subject, r.weekOrder);
  }
  return [...first.keys()].sort((a, b) => {
    const d = (first.get(a) ?? 0) - (first.get(b) ?? 0);
    return d !== 0 ? d : a.localeCompare(b);
  });
}

async function build(grade: GradeKey): Promise<{
  src: string;
  rows: Row[];
  deduped: Row[];
  order: string[];
  dropped: number;
  student: string;
  cid: string;
}> {
  const cfg = GRADES[grade];
  const student = await prisma.student.findUnique({
    where: { studentId: cfg.student },
    select: { id: true, name: true },
  });
  if (!student) throw new Error(`${cfg.student} not found`);
  const cid = await getActiveCurriculumId(student.id);
  if (!cid) throw new Error(`no active curriculum for ${cfg.student}`);

  const rows = (await prisma.material.findMany({
    where: { curriculumId: cid },
    select: { subject: true, topic: true, subTopic: true, weekOrder: true, priority: true },
    orderBy: [{ weekOrder: "asc" }, { topic: "asc" }, { subTopic: "asc" }],
  })) as Row[];

  // Drop exact duplicate keys, keeping the scheduled row. Rows are ordered by
  // weekOrder, and an unscheduled row carries weekOrder 999, so the first
  // occurrence of a key is the real one. Only SMA_2 has any (one key).
  const seen = new Set<string>();
  const deduped: Row[] = [];
  for (const r of rows) {
    const k = `${r.subject}||${r.topic}||${r.subTopic}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(r);
  }
  const dropped = rows.length - deduped.length;

  const order = deriveOrder(deduped);
  const lines: string[] = [];
  for (const subject of order) {
    const mine = deduped.filter((r) => r.subject === subject);
    lines.push("");
    lines.push(`    // ═══ ${subject} — ${mine.length} sub-topik ═══`);
    for (const r of mine) {
      lines.push(
        `    { subject: ${q(subject)}, topic: ${q(r.topic)}, subTopic: ${q(r.subTopic ?? "")}, weekOrder: ${r.weekOrder}, priority: ${r.priority} },`,
      );
    }
  }

  const moduleName = cfg.out.replace("src/data/", "").replace(".ts", "");
  const src = `/**
 * ${cfg.label} — school palette.
 *
 * Generated from the reference curriculum (student ${cfg.student}, curriculum
 * ${cid}, ${rows.length} topics, ${order.length} subjects) by
 * \`scripts/emit-topic-bank.ts\`. Regenerate with:
 *
 *   node scripts/run-ts.mjs scripts/emit-topic-bank.ts --grade ${grade} --write
 *
 * Do not hand-edit: the point of this file is that \`GRADE_TOPICS.${grade}\`
 * reproduces the school's subject set exactly, so that regenerating a
 * curriculum cannot drop or invent a subject.
 *
 * @module @/data/${moduleName}
 */
import type { TopicEntry } from "./curriculum-topics";

export const ${cfg.const}: Record<string, TopicEntry[]> = {
  ${cfg.key}: [${lines.join("\n")}
  ],
};
`;

  return { src, rows, deduped, order, dropped, student: student.name, cid };
}

async function main(): Promise<void> {
  const targets = (ONLY ? [ONLY] : Object.keys(GRADES)) as GradeKey[];
  const unknown = targets.filter((g) => !(g in GRADES));
  if (unknown.length) {
    console.error(`Unknown grade(s): ${unknown.join(", ")}. Known: ${Object.keys(GRADES).join(", ")}`);
    process.exit(1);
  }
  if (TO) mkdirSync(TO, { recursive: true });

  for (const g of targets) {
    const { src, rows, deduped, order, dropped, student, cid } = await build(g);
    const cfg = GRADES[g];
    console.log(`\n═══ ${g} (${cfg.label}) — ${student} / ${cid.slice(0, 8)} ═══`);
    console.log(`${rows.length} topics, ${order.length} subjects${dropped ? ` (dropped ${dropped} duplicate key row(s))` : ""}`);
    console.log(`order: ${order.join(" › ")}`);
    for (const s of order) {
      console.log(`  ${s.padEnd(24)} ${String(deduped.filter((r) => r.subject === s).length).padStart(3)}`);
    }

    const target = TO ? join(TO, cfg.out.split("/").pop()!) : cfg.out;
    if (WRITE || TO) {
      writeFileSync(target, src);
      console.log(`wrote ${target}`);
    } else {
      console.log(`would write ${cfg.out}  ${(src.length / 1024).toFixed(0)} KB`);
    }
  }

  console.log(WRITE ? "\nwritten." : TO ? "\n(staged for diff)" : "\n(dry run — pass --write to apply)");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
