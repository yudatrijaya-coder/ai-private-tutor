/**
 * Emit the content and quiz banks from a live curriculum, one file pair per grade.
 *
 * `generateCurriculumDraft` fills each material from `curriculum-content.ts`
 * and attaches a quiz from the grade's `quiz-bank-*.ts`. Those hand-written bank
 * were built for the old Kurikulum Merdeka integrated palette (IPA / IPS) and
 * cover almost none of the topics the school actually teaches — against the
 * live SMP_1 palette they matched 1 of 218 topics for content. Regenerating a
 * curriculum therefore produced 218 structurally correct but empty materials.
 *
 * Every live curriculum already has a rendered slide and a quiz per topic, so
 * this lifts that data into `src/data/`. Existing bank entries are NOT touched:
 * the emitted files are consulted first and the originals stay as a fallback.
 *
 * Usage:
 *   node scripts/run-ts.mjs scripts/emit-content-bank.ts                 # dry run, all grades
 *   node scripts/run-ts.mjs scripts/emit-content-bank.ts --grade SD_5    # dry run, one grade
 *   node scripts/run-ts.mjs scripts/emit-content-bank.ts --write         # apply
 */
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { getActiveCurriculumId } from "@/lib/curriculum-active";
import { isUsableSlideText, isLlmReasoningDump } from "@/lib/content/slide-content";
import { questionRejection } from "@/lib/quiz-grading";

const ARGS = process.argv.slice(2);
const WRITE = ARGS.includes("--write");
const ONLY = ARGS[ARGS.indexOf("--grade") + 1];
const GRADES_ARG = ARGS.includes("--grade") && ONLY ? [ONLY] : null;

/**
 * Per-grade wiring. `student` is the representative whose live curriculum is
 * the source; each is the template student for its grade.
 */
const GRADES = {
  SD_5: {
    student: "SYIFA001",
    label: "SD Kelas 5",
    contentOut: "src/data/curriculum-content-sd5.ts",
    contentConst: "SD5_CONTENT",
    quizOut: "src/data/quiz-bank-sd5-db.ts",
    quizConst: "SD5_QUIZ_DB",
  },
  SMP_1: {
    student: "RAIHAN001",
    label: "SMP Kelas 7",
    contentOut: "src/data/curriculum-content-smp7.ts",
    contentConst: "SMP7_CONTENT",
    quizOut: "src/data/quiz-bank-smp7-db.ts",
    quizConst: "SMP7_QUIZ_DB",
  },
  SMA_2: {
    student: "SHOFI001",
    label: "SMA Kelas 11",
    contentOut: "src/data/curriculum-content-sma11.ts",
    contentConst: "SMA11_CONTENT",
    quizOut: "src/data/quiz-bank-sma11-db.ts",
    quizConst: "SMA11_QUIZ_DB",
  },
} as const;

type GradeKey = keyof typeof GRADES;

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
  // Delegate the decision to the shared rule. This function used to carry its
  // own copy, which had already drifted from the audit's: it *filtered*
  // non-string options instead of rejecting the row, shifting every later index
  // while `correctIndex` stayed put. One predicate, imported.
  const why = questionRejection(raw);
  if (why) {
    DROP_REASONS.set(why, (DROP_REASONS.get(why) ?? 0) + 1);
    return null;
  }
  const o = raw as Record<string, unknown>;

  const d = o.difficulty;
  const difficulty = d === "easy" || d === "medium" || d === "hard" ? d : undefined;

  return {
    question: String(o.question).trim(),
    options: o.options as string[],
    correctIndex: o.correctIndex as number,
    ...(difficulty ? { difficulty } : {}),
    explanation: typeof o.explanation === "string" ? o.explanation.trim() : "",
  };
}

/**
 * Pick the slide text for a material — the same choice the app makes.
 *
 * `resolveSlideMarkdown` walks `slide_sibi → slide → slides → slide_moodle` and
 * returns the first candidate its validator accepts, so the bank must walk the
 * same order. Doing anything cleverer (taking the longest, say) would ship the
 * bank and the rendered page disagreeing about which text is the slide.
 *
 * What matters is *skipping rejected candidates* rather than taking the first
 * non-empty one. Two SMA_2 rows store a stub in `slide_sibi` (77 and 81 chars)
 * while `slide` holds the real ~900-char lesson, and a first-non-empty rule
 * silently shipped the stub; the validator rejects it and the chain moves on.
 */
const SLIDE_KEYS = ["slide_sibi", "slide", "slides", "slide_moodle"] as const;

function pickSlide(md: Record<string, unknown>): string {
  for (const key of SLIDE_KEYS) {
    const v = md[key];
    if (typeof v !== "string" || v.trim().length === 0) continue;
    const text = v.trim();
    if (!isUsableSlideText(text) || isLlmReasoningDump(text)) continue;
    return text;
  }
  return "";
}

async function collect(studentId: string): Promise<Emitted[]> {
  const student = await prisma.student.findUnique({
    where: { studentId },
    select: { id: true },
  });
  if (!student) throw new Error(`No such student: ${studentId}`);

  const curriculumId = await getActiveCurriculumId(student.id);
  if (!curriculumId) throw new Error(`No active curriculum for ${studentId}`);

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
    const content = pickSlide(md);

    const raw = m.quizzes.flatMap((q) => (q.questions as unknown[]) ?? []);
    const questions = raw.map(normalizeQuestion).filter((q): q is Q => q !== null);

    out.push({ subject: m.subject, topic: m.topic, subTopic: m.subTopic ?? "", content, questions });
  }
  return out;
}

function renderContent(entries: Emitted[], cfg: (typeof GRADES)[GradeKey]): string {
  const subjects = [...new Set(entries.map((e) => e.subject))].sort();
  const head = `/**
 * Curriculum Content Bank — ${cfg.label} (school palette)
 *
 * Generated from the live curriculum of ${cfg.student}: one entry per topic of
 * the ${subjects.length} subjects the school actually teaches. The hand-written
 * \`curriculum-content.ts\` was built for the old Kurikulum Merdeka integrated
 * palette (IPA / IPS) and covers almost none of these topics, so regenerating a
 * curriculum produced empty materials.
 *
 * Values are the rendered slide markdown, the same text the student sees.
 * Looked up by \`getContent(subject, topic, subTopic, grade)\`, which scopes the
 * key by grade because sub-topics repeat across grades with different depth
 * (e.g. Fisika/Suhu dan Kalor at SMP_1 and SMA_2).
 *
 * DO NOT EDIT BY HAND — regenerate with:
 *   node scripts/run-ts.mjs scripts/emit-content-bank.ts --write
 *
 * @module @/data/${cfg.contentOut.replace("src/data/", "").replace(".ts", "")}
 */

export const ${cfg.contentConst}: Record<string, string> = {
`;
  const body = entries
    .map((e) => {
      const key = lit(`${e.subject}||${e.topic}||${e.subTopic}`);
      return `  // ── ${e.subject} › ${e.topic} ──\n  [${key}]: \`${esc(e.content)}\`,\n`;
    })
    .join("\n");
  return `${head}${body}};\n`;
}

function renderQuiz(entries: Emitted[], cfg: (typeof GRADES)[GradeKey]): string {
  const withQuiz = entries.filter((e) => e.questions.length > 0);
  const total = withQuiz.reduce((n, e) => n + e.questions.length, 0);
  const moduleName = cfg.quizOut.replace("src/data/", "").replace(".ts", "");
  const head = `/**
 * Quiz Bank — ${cfg.label}, school palette (generated)
 *
 * ${withQuiz.length} topics × ${total} questions, lifted from the live curriculum of
 * ${cfg.student} so \`generateCurriculumDraft\` can attach a quiz to every material
 * it creates. Consulted by \`quiz-bank-*.ts\` before its own map.
 *
 * DO NOT EDIT BY HAND — regenerate with:
 *   node scripts/run-ts.mjs scripts/emit-content-bank.ts --write
 *
 * @module @/data/${moduleName}
 */
import type { QuestionData } from "@/agents/assessment/types";

export const ${cfg.quizConst}: Record<string, QuestionData[]> = {
`;
  const body = withQuiz
    .map((e) => {
      const key = lit(`${e.subject}||${e.topic}||${e.subTopic}`);
      const qs = e.questions.map((q) => `    ${JSON.stringify(q)},`).join("\n");
      return `  [${key}]: [\n${qs}\n  ],\n`;
    })
    .join("\n");
  return `${head}${body}};\n`;
}

async function runGrade(grade: GradeKey): Promise<boolean> {
  const cfg = GRADES[grade];
  const before = new Map(DROP_REASONS);
  const collected = await collect(cfg.student);

  // Collapse duplicate keys. A topic can appear twice in a curriculum — e.g.
  // SMA_2 has `Matematika Penalaran / Logika Matematika / Penarikan
  // Kesimpulan` at a real week and again at weekOrder 999. Materials come back
  // ordered by weekOrder, so keeping the first occurrence keeps the scheduled
  // one. Required, not cosmetic: a duplicate key is a TS1117 error in the
  // emitted object literal.
  const byKey = new Map<string, Emitted>();
  const collapsed: string[] = [];
  for (const e of collected) {
    const k = `${e.subject}||${e.topic}||${e.subTopic}`;
    if (byKey.has(k)) {
      collapsed.push(k);
      continue;
    }
    byKey.set(k, e);
  }
  const entries = [...byKey.values()];

  const missingContent = entries.filter((e) => e.content.length === 0);
  const withQuiz = entries.filter((e) => e.questions.length > 0);

  console.log(`\n═══ ${grade} (${cfg.label}) — source ${cfg.student} ═══`);
  console.log(`topics    : ${entries.length}${collapsed.length ? ` (collapsed ${collapsed.length} duplicate key(s) from ${collected.length})` : ""}`);
  for (const k of collapsed) console.log(`  dup     : ${k} — kept the scheduled row`);
  console.log(`content   : ${entries.length - missingContent.length}/${entries.length}`);
  if (missingContent.length) {
    console.log(`  no slide: ${missingContent.map((e) => `${e.subject}/${e.subTopic}`).join(", ")}`);
  }
  console.log(`quizzes   : ${withQuiz.length}/${entries.length}`);
  console.log(`questions : ${withQuiz.reduce((n, e) => n + e.questions.length, 0)}`);
  if (DROP_REASONS.size > 0) {
    const dropped = [...DROP_REASONS.entries()].filter(([k]) => !before.has(k));
    const bumped = [...DROP_REASONS.entries()].filter(
      ([k, v]) => before.has(k) && before.get(k) !== v,
    );
    if (dropped.length || bumped.length) {
      console.log(`dropped   :`);
      for (const [why, n] of [...dropped, ...bumped].sort((a, b) => b[1] - a[1])) {
        console.log(`    ${String(before.has(why) ? n - (before.get(why) ?? 0) : n).padStart(4)} × ${why}`);
      }
    }
  }

  const bySubject = new Map<string, { n: number; c: number; q: number; qs: number }>();
  for (const e of entries) {
    const s = bySubject.get(e.subject) ?? { n: 0, c: 0, q: 0, qs: 0 };
    s.n++;
    if (e.content) s.c++;
    if (e.questions.length) {
      s.q++;
      s.qs += e.questions.length;
    }
    bySubject.set(e.subject, s);
  }
  console.log("");
  for (const [s, v] of [...bySubject.entries()].sort((a, b) => b[1].n - a[1].n)) {
    console.log(
      `  ${s.padEnd(24)} topics=${String(v.n).padStart(3)} content=${String(v.c).padStart(3)} quiz=${String(v.q).padStart(3)} questions=${v.qs}`,
    );
  }

  const contentSrc = renderContent(entries, cfg);
  const quizSrc = renderQuiz(entries, cfg);
  console.log("");
  console.log(`${WRITE ? "writing" : "would write"} ${cfg.contentOut}  ${(contentSrc.length / 1024).toFixed(0)} KB`);
  console.log(`${WRITE ? "writing" : "would write"} ${cfg.quizOut}  ${(quizSrc.length / 1024).toFixed(0)} KB`);

  if (WRITE) {
    writeFileSync(cfg.contentOut, contentSrc);
    writeFileSync(cfg.quizOut, quizSrc);
  }

  return missingContent.length === 0 && entries.length > 0;
}

async function main(): Promise<void> {
  const targets = (GRADES_ARG ?? Object.keys(GRADES)) as GradeKey[];
  const unknown = targets.filter((g) => !(g in GRADES));
  if (unknown.length) {
    console.error(`Unknown grade(s): ${unknown.join(", ")}. Known: ${Object.keys(GRADES).join(", ")}`);
    process.exit(1);
  }

  let allOk = true;
  for (const g of targets) {
    allOk = (await runGrade(g)) && allOk;
  }

  console.log(WRITE ? "\nwritten." : "\n(dry run — pass --write to apply)");
  await prisma.$disconnect();
  if (!allOk) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
