/**
 * Audit every quiz row in the database for questions that cannot be rendered.
 *
 * A grader reads `correctIndex`; the UI needs `question` and `options`. Rows
 * written by the older pipeline can be truncated mid-generation, storing only
 * `explanation` + `correctIndex` — a quiz that shows the student nothing but
 * still scores. This finds them.
 *
 * Read-only.
 *
 * Usage: node scripts/run-ts.mjs scripts/audit-quiz-integrity.ts
 */
import { prisma } from "@/lib/prisma";

interface Bad {
  quizId: string;
  studentId: string;
  subject: string;
  subTopic: string;
  index: number;
  why: string;
  keys: string;
}

async function main(): Promise<void> {
  const quizzes = await prisma.quiz.findMany({
    select: {
      id: true,
      studentId: true,
      questions: true,
      material: { select: { subject: true, subTopic: true } },
    },
  });

  const bad: Bad[] = [];
  let totalQuestions = 0;
  let emptyQuizzes = 0;
  const known = new Map<string, { quizRows: number; students: Set<string> }>();

  for (const q of quizzes) {
    const arr = Array.isArray(q.questions) ? (q.questions as unknown[]) : [];
    if (arr.length === 0) {
      emptyQuizzes++;
      continue;
    }
    arr.forEach((raw, i) => {
      totalQuestions++;
      const why = describe(raw);
      if (!why) return;
      bad.push({
        quizId: q.id,
        studentId: q.studentId,
        subject: q.material?.subject ?? "?",
        subTopic: q.material?.subTopic ?? "?",
        index: i,
        why,
        keys:
          raw && typeof raw === "object"
            ? Object.keys(raw as object).sort().join(",")
            : String(raw),
      });
      if (q.material) {
        const k = `${q.studentId}::${q.material.subject}::${q.material.subTopic}`;
        const e = known.get(k) ?? { quizRows: 0, students: new Set<string>() };
        e.quizRows++;
        e.students.add(q.studentId);
        known.set(k, e);
      }
    });
  }

  console.log(`quiz rows      : ${quizzes.length}`);
  console.log(`empty quizzes  : ${emptyQuizzes}`);
  console.log(`questions      : ${totalQuestions}`);
  console.log(`unrenderable   : ${bad.length}`);

  const byWhy = new Map<string, number>();
  for (const b of bad) byWhy.set(b.why, (byWhy.get(b.why) ?? 0) + 1);
  console.log("");
  for (const [why, n] of [...byWhy.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${why}`);
  }

  console.log("\naffected material :: student  (quiz rows with at least one bad question)");
  console.log("─".repeat(78));
  const rows = [...known.entries()].sort((a, b) => b[1].quizRows - a[1].quizRows);
  for (const [k, v] of rows) {
    const [studentId, subject, subTopic] = k.split("::");
    console.log(`  ${subject} / ${subTopic.slice(0, 46).padEnd(46)} ${v.quizRows}q  ${studentId.slice(0, 8)}`);
  }
  console.log(`\n${rows.length} affected material(s), ${bad.length} unrenderable question(s)`);

  // Show the distinct key signatures — tells us which generation run produced them.
  const sigs = new Map<string, number>();
  for (const b of bad) sigs.set(b.keys, (sigs.get(b.keys) ?? 0) + 1);
  console.log("\nstored key signatures:");
  for (const [s, n] of [...sigs.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  [${s}]`);
  }

  await prisma.$disconnect();
}

function describe(raw: unknown): string | null {
  if (raw === null) return "null entry";
  if (typeof raw !== "object") return `non-object (${typeof raw})`;
  const o = raw as Record<string, unknown>;
  const question = typeof o.question === "string" ? o.question.trim() : "";
  if (!question) return "no `question`";
  const options = Array.isArray(o.options) ? o.options : [];
  if (options.length < 2) return `options < 2 (got ${options.length})`;
  const ci = o.correctIndex;
  if (typeof ci !== "number" || !Number.isInteger(ci) || ci < 0 || ci >= options.length) {
    return "`correctIndex` outside options";
  }
  return null;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
