import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { optionTexts, pickCorrectIndex } from "../src/lib/quiz-grading";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Flatten `Quiz.questions[].options` from objects to plain strings.
 *
 * THE DEFECT
 * 200 questions store their options as `[{text, isCorrect}, ...]` while the
 * other 8838 store `["...", "..."]`. Every consumer — the student pages, the
 * admin pages, the bot's inline keyboard, the feedback message — treats the
 * field as `string[]`. The object shape reached React as a child and threw
 * error #31 ("Objects are not valid as a React child"), which took the whole
 * `/student/review` page down.
 *
 * The code now normalises on read (`parseQuestions` / `optionTexts`), so this
 * script is defence in depth: it removes the inconsistency at rest so that
 * reporting, ad-hoc SQL and future code see one shape. `correctIndex` is
 * preserved exactly; `isCorrect` was never read by any code path, so nothing
 * depends on it.
 *
 * Usage:
 *   npx tsx scripts/flatten-quiz-options.ts            # dry run
 *   npx tsx scripts/flatten-quiz-options.ts --apply    # write, with backup
 */

const APPLY = process.argv.includes("--apply");

interface RawQuestion {
  question?: string;
  options?: unknown;
  correctIndex?: unknown;
  [k: string]: unknown;
}

function isObjectOptions(raw: unknown): boolean {
  return (
    Array.isArray(raw) &&
    raw.length > 0 &&
    raw.every((o) => o !== null && typeof o === "object" && !Array.isArray(o))
  );
}

async function main() {
  const quizzes = await prisma.quiz.findMany({ select: { id: true, questions: true } });

  const plan: { id: string; questions: RawQuestion[]; changed: number }[] = [];
  let questionsScanned = 0;
  let questionsChanged = 0;

  for (const quiz of quizzes) {
    const raw = quiz.questions;
    if (!Array.isArray(raw)) continue;
    const questions = raw as RawQuestion[];
    let changed = 0;
    const next = questions.map((q) => {
      if (!q || typeof q !== "object") return q;
      questionsScanned++;
      if (!isObjectOptions(q.options)) return q;
      changed++;
      questionsChanged++;
      const options = optionTexts(q.options);
      const correctIndex = pickCorrectIndex(q.options, q.correctIndex, options.length);
      return { ...q, options, ...(correctIndex !== null ? { correctIndex } : {}) };
    });
    if (changed > 0) plan.push({ id: quiz.id, questions: next, changed });
  }

  console.log(`quizzes total          : ${quizzes.length}`);
  console.log(`questions scanned      : ${questionsScanned}`);
  console.log(`quizzes needing change : ${plan.length}`);
  console.log(`questions to flatten   : ${questionsChanged}`);

  // Sanity: no question may end up without a usable answer index.
  const broken: string[] = [];
  for (const p of plan) {
    for (let i = 0; i < p.questions.length; i++) {
      const q = p.questions[i];
      const n = optionTexts(q.options).length;
      const ci = pickCorrectIndex(q.options, q.correctIndex, n);
      if (ci === null) broken.push(`${p.id}[${i}] options=${n} correctIndex=${String(q.correctIndex)}`);
    }
  }
  console.log(`unresolvable answers   : ${broken.length}`);
  for (const b of broken.slice(0, 10)) console.log(`   ${b}`);

  if (!APPLY) {
    console.log("\ndry run — nothing written. Re-run with --apply to write.");
    return;
  }
  if (plan.length === 0) {
    console.log("\nnothing to do.");
    return;
  }

  mkdirSync("backups", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join("backups", `quiz-options-${stamp}.json`);
  const before = await prisma.quiz.findMany({
    where: { id: { in: plan.map((p) => p.id) } },
    select: { id: true, questions: true },
  });
  writeFileSync(backupPath, JSON.stringify(before, null, 2), "utf8");
  console.log(`\nbackup written: ${backupPath}`);

  let written = 0;
  for (const p of plan) {
    await prisma.quiz.update({
      where: { id: p.id },
      data: { questions: p.questions as never },
    });
    written++;
  }
  console.log(`quizzes updated        : ${written}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
