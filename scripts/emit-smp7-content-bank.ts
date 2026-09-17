/**
 * Emit the SMP_1 content and quiz banks from a student's active curriculum.
 *
 * The hand-written banks were built for the Kurikulum Merdeka integrated
 * palette (IPA / IPS, 99 entries). The school teaches 15 separate subjects with
 * 218 topics, and every one of those topics already has a rendered slide
 * (`metadata.slide_sibi`) and a quiz in the database. This script lifts that
 * data into `src/data/` so `generateCurriculumDraft` can reproduce the school's
 * curriculum instead of producing 218 empty rows.
 *
 * Existing bank entries are NOT touched — the emitted files are consulted
 * first and the originals stay in place as a fallback.
 *
 * Usage:
 *   node scripts/run-ts.mjs scripts/emit-smp7-content-bank.ts            # dry run
 *   node scripts/run-ts.mjs scripts/emit-smp7-content-bank.ts --write
 */
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { getActiveCurriculumId } from "@/lib/curriculum-active";

const ARGS = process.argv.slice(2);
const STUDENT = ARGS.find((a) => !a.startsWith("--")) ?? "RAIHAN001";
const WRITE = ARGS.includes("--write");

const CONTENT_OUT = "src/data/curriculum-content-smp7.ts";
const QUIZ_OUT = "src/data/quiz-bank-smp7-db.ts";

/** Escape a value for a TS template literal, in this order: `\` first. */
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

/** JSON string literal — safe for any character, including `'` and CJK. */
function lit(s: string): string {
  return JSON.stringify(s);
}

interface Emitted {
  subject: string;
  topic: string;
  subTopic: string;
  content: string;
  questions: Q[];
}

/** The exact QuestionData shape — DB rows carry extra/absent fields. */
interface Q {
  question: string;
  options: string[];
  correctIndex: number;
  difficulty?: "easy" | "medium" | "hard";
  explanation: string;
}

const DROP_REASONS = new Map<string, number>();

/**
 * Project a stored quiz question onto QuestionData, or reject it.
 *
 * Rows written by the older Python pipeline carry `null` array slots and stray
 * keys (`questionIndex`), which do not satisfy the type and would fail `tsc`
 * once emitted. Anything that cannot be shown to a student unambiguously —
 * no question, too few options, `correctIndex` outside `options`, or a
 * non-integer index — is dropped and counted rather than coerced.
 */
function normalizeQuestion(raw: unknown): Q | null {
  const drop = (why: string): null => {
    DROP_REASONS.set(why, (DROP_REASONS.get(why) ?? 0) + 1);
    return null;
  };
  if (raw === null || typeof raw !== "object") return drop("not an object");
  const o = raw as Record<string, unknown>;

  const question = typeof o.question === "string" ? o.question.trim() : "";
  if (!question) return drop("empty question");

  const options = Array.isArray(o.options)
    ? o.options.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  if (options.length < 2) return drop(`options < 2 (got ${options.length})`);

  const correctIndex = o.correctIndex;
  if (
    typeof correctIndex !== "number" ||
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex >= options.length
  ) {
    return drop("correctIndex out of range");
  }

  const d = o.difficulty;
  const difficulty =
    d === "easy" || d === "medium" || d === "hard" ? d : undefined;

  return {
    question,
    options,
    correctIndex,
    ...(difficulty ? { difficulty } : {}),
    explanation: typeof o.explanation === "string" ? o.explanation.trim() : "",
  };
}

async function collect(): Promise<Emitted[]> {
  const student = await prisma.student.findUnique({
    where: { studentId: STUDENT },
    select: { id: true },
  });
  if (!student) throw new Error(`No such student: ${STUDENT}`);

  const curriculumId = await getActiveCurriculumId(student.id);
  if (!curriculumId) throw new Error(`No active curriculum for ${STUDENT}`);

  const materials = await prisma.material.findMany({
    where: { curriculumId },
    select: {
      subject: true,
      topic: true,
      subTopic: true,
      metadata: true,
      quizzes: { select: { questions: true } },
    },
    orderBy: [{ subject: "asc" }, { weekOrder: "asc" }, { subTopic: "asc" }],
  });

  const out: Emitted[] = [];
  for (const m of materials) {
    const md = (m.metadata ?? {}) as Record<string, unknown>;
    const content =
      typeof md.slide_sibi === "string" && md.slide_sibi.trim().length > 0
        ? md.slide_sibi.trim()
        : typeof md.slide === "string"
          ? md.slide.trim()
          : "";

    const raw = m.quizzes.flatMap((q) => (q.questions as unknown[]) ?? []);
    const questions = raw
      .map(normalizeQuestion)
      .filter((q): q is Q => q !== null);

    out.push({ subject: m.subject, topic: m.topic, subTopic: m.subTopic, content, questions });
  }
  return out;
}

function renderContent(entries: Emitted[]): string {
  const head = `/**
 * Curriculum Content Bank — SMP Kelas 7 (school palette)
 *
 * Generated from a live curriculum: one entry per topic of the 15 subjects the
 * school actually teaches (Biologi, Fisika, Kimia, Geografi, Sejarah, Ekonomi,
 * Sosiologi, …). The hand-written \`curriculum-content.ts\` covered the old
 * Kurikulum Merdeka integrated palette (IPA / IPS) and matched only 1 of these
 * 218 topics, so regenerating a curriculum produced empty materials.
 *
 * Values are the rendered slide markdown, the same text the student sees.
 *
 * DO NOT EDIT BY HAND — regenerate with:
 *   node scripts/run-ts.mjs scripts/emit-smp7-content-bank.ts --write
 *
 * @module @/data/curriculum-content-smp7
 */

export const SMP7_CONTENT: Record<string, string> = {
`;
  const body = entries
    .map((e) => {
      const key = lit(`${e.subject}||${e.topic}||${e.subTopic}`);
      return `  // ── ${e.subject} › ${e.topic} ──\n  [${key}]: \`${esc(e.content)}\`,\n`;
    })
    .join("\n");
  return `${head}${body}};\n`;
}

function renderQuiz(entries: Emitted[]): string {
  const withQuiz = entries.filter((e) => e.questions.length > 0);
  const total = withQuiz.reduce((n, e) => n + e.questions.length, 0);
  const head = `/**
 * Quiz Bank — SMP Kelas 7, school palette (generated)
 *
 * ${withQuiz.length} topics × ${total} questions, lifted from a live curriculum so
 * \`generateCurriculumDraft\` can attach a quiz to every material it creates.
 * The hand-written \`quiz-bank-smp7.ts\` only covered 54 of these topics.
 *
 * DO NOT EDIT BY HAND — regenerate with:
 *   node scripts/run-ts.mjs scripts/emit-smp7-content-bank.ts --write
 *
 * @module @/data/quiz-bank-smp7-db
 */
import type { QuestionData } from "@/agents/assessment/types";

export function smp7DbQuizKey(subject: string, topic: string, subTopic: string): string {
  return \`\${subject}||\${topic}||\${subTopic}\`;
}

export const SMP7_QUIZ_DB: Record<string, QuestionData[]> = {
`;
  const body = withQuiz
    .map((e) => {
      const key = lit(`${e.subject}||${e.topic}||${e.subTopic}`);
      const qs = e.questions
        .map((q) => `    ${JSON.stringify(q)},`)
        .join("\n");
      return `  [${key}]: [\n${qs}\n  ],\n`;
    })
    .join("\n");
  return `${head}${body}};\n`;
}

async function main(): Promise<void> {
  const entries = await collect();
  const missingContent = entries.filter((e) => e.content.length === 0);
  const withQuiz = entries.filter((e) => e.questions.length > 0);

  console.log(`student   : ${STUDENT}`);
  console.log(`topics    : ${entries.length}`);
  console.log(`content   : ${entries.length - missingContent.length}/${entries.length}`);
  if (missingContent.length) {
    console.log(`  no slide : ${missingContent.map((e) => `${e.subject}/${e.subTopic}`).join(", ")}`);
  }
  console.log(`quizzes   : ${withQuiz.length}/${entries.length}`);
  console.log(`questions : ${withQuiz.reduce((n, e) => n + e.questions.length, 0)}`);
  if (DROP_REASONS.size > 0) {
    const total = [...DROP_REASONS.values()].reduce((a, b) => a + b, 0);
    console.log(`dropped   : ${total} malformed question(s)`);
    for (const [why, n] of [...DROP_REASONS.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(n).padStart(4)} × ${why}`);
    }
  }

  const bySubject = new Map<string, { n: number; c: number; q: number; qs: number }>();
  for (const e of entries) {
    const s = bySubject.get(e.subject) ?? { n: 0, c: 0, q: 0, qs: 0 };
    s.n++;
    if (e.content) s.c++;
    if (e.questions.length) { s.q++; s.qs += e.questions.length; }
    bySubject.set(e.subject, s);
  }
  console.log("");
  for (const [s, v] of [...bySubject.entries()].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`  ${s.padEnd(24)} topics=${String(v.n).padStart(3)} content=${String(v.c).padStart(3)} quiz=${String(v.q).padStart(3)} questions=${v.qs}`);
  }

  const contentSrc = renderContent(entries);
  const quizSrc = renderQuiz(entries);
  console.log("");
  console.log(`would write ${CONTENT_OUT}  ${(contentSrc.length / 1024).toFixed(0)} KB`);
  console.log(`would write ${QUIZ_OUT}  ${(quizSrc.length / 1024).toFixed(0)} KB`);

  if (WRITE) {
    writeFileSync(CONTENT_OUT, contentSrc);
    writeFileSync(QUIZ_OUT, quizSrc);
    console.log("\nwritten.");
  } else {
    console.log("\n(dry run — pass --write to apply)");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
