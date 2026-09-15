import "dotenv/config";
/**
 * Repair quiz questions whose `correctIndex` contradicts `isCorrect`.
 *
 * THE DEFECT
 * Each question carries two ways of naming the right answer:
 *
 *   correctIndex : number   — index into `options`
 *   options[i].isCorrect    — boolean flag
 *
 * Every grader trusts `correctIndex`:
 *   src/lib/quiz-grading.ts:88        const correct = question.correctIndex;
 *   src/bot/handlers/quiz.ts:421      selectedIndex === q.correctIndex
 *   src/bot/handlers/quiz.ts:643      a.selectedIndex === q.correctIndex
 *
 * and the bot also SHOWS `options[correctIndex]` to the student as the right
 * answer (quiz.ts:422, :647). So when the two disagree, the student is graded
 * against the wrong option and told that wrong option is correct.
 *
 * SCOPE (measured 2026-09-15)
 * 96 questions, all in subject "Kimia", every one of them with correctIndex = 0.
 * The uniform value is the signature of a generation pass that never set the
 * field, so it defaulted to 0 rather than being reasoned about.
 *
 * Across all 9038 questions correctIndex is otherwise well spread
 * (0:3131, 1:3801, 2:1790, 3:314, 4:2), so this is one bad batch, not a
 * systemic fault in the generator.
 *
 * WHY `isCorrect` IS TREATED AS AUTHORITATIVE
 * Checked by hand against the chemistry, not just by majority:
 *   "Reaksi antara etena (C2H4) dengan gas hidrogen (H2)"  -> adisi, not substitusi
 *   "Pasangan zat yang membentuk larutan penyangga"        -> CH3COOH + CH3COONa, not HCl + NaCl
 *   "pH penyangga 0,1 M CH3COOH / 0,1 M CH3COONa"          -> ~5 (pH = pKa), not 4
 *   "waktu paruh reaksi orde pertama bergantung pada"      -> k saja, not k + konsentrasi awal
 * In each case `isCorrect` is the chemically right answer and `correctIndex` is not.
 *
 * SAFETY
 * - Dry run by default; nothing is written without --apply.
 * - Only touches questions where EXACTLY ONE option is flagged and that index
 *   differs from correctIndex. Questions with no flag, or with several, are left
 *   alone — for those there is no second opinion to appeal to.
 * - Backs up every affected row to backups/ before writing.
 * - Aborts if a second run would still find work, i.e. if the write did not take.
 *
 * Usage:
 *   npx tsx scripts/fix-correct-index.ts            # dry run, prints the plan
 *   npx tsx scripts/fix-correct-index.ts --apply    # writes
 */
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

type Option = { text?: string; isCorrect?: boolean };
type Question = {
  question?: string;
  options?: Option[];
  explanation?: string;
  correctIndex?: number;
};

const APPLY = process.argv.includes("--apply");

/** Index of the single flagged option, or null when the flags are absent/ambiguous. */
function flaggedIndex(options: Option[]): number | null {
  const idx = options.map((o, i) => (o?.isCorrect ? i : -1)).filter((i) => i >= 0);
  return idx.length === 1 ? idx[0] : null;
}

async function main() {
  console.log(APPLY ? "MODE: apply (rows will be written)" : "MODE: dry run (nothing is written)");
  console.log("");

  const quizzes = await prisma.quiz.findMany({
    select: { id: true, studentId: true, materialId: true, questions: true, material: { select: { subject: true } } },
  });

  type Plan = {
    quizId: string;
    subject: string;
    questionIndex: number;
    from: number;
    to: number;
    question: string;
    fromText: string;
    toText: string;
  };
  const plans: Plan[] = [];
  let scanned = 0;
  let noFlag = 0;
  let multiFlag = 0;

  for (const quiz of quizzes) {
    const questions = (quiz.questions as Question[]) ?? [];
    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      if (!item || typeof item !== "object") continue;
      scanned++;

      const opts = item.options ?? [];
      const flags = opts.map((o, k) => (o?.isCorrect ? k : -1)).filter((k) => k >= 0);
      if (flags.length === 0) {
        noFlag++;
        continue;
      }
      if (flags.length > 1) {
        multiFlag++;
        continue;
      }
      const target = flaggedIndex(opts);
      if (target === null) continue;
      if (item.correctIndex === target) continue;

      plans.push({
        quizId: quiz.id,
        subject: quiz.material?.subject ?? "?",
        questionIndex: i,
        from: item.correctIndex ?? -1,
        to: target,
        question: (item.question ?? "").slice(0, 88),
        fromText: opts[item.correctIndex ?? -1]?.text ?? "(none)",
        toText: opts[target]?.text ?? "(none)",
      });
    }
  }

  const bySubject = new Map<string, number>();
  for (const p of plans) bySubject.set(p.subject, (bySubject.get(p.subject) ?? 0) + 1);

  console.log(`quizzes scanned:      ${quizzes.length}`);
  console.log(`questions scanned:    ${scanned}`);
  console.log(`  no option flagged:  ${noFlag}  (left alone — no second opinion available)`);
  console.log(`  several flagged:    ${multiFlag}  (left alone — ambiguous)`);
  console.log(`  to repair:          ${plans.length}`);
  for (const [s, n] of [...bySubject].sort((a, b) => b[1] - a[1])) console.log(`      ${s}: ${n}`);
  console.log("");

  for (const p of plans.slice(0, 10)) {
    console.log(`  [${p.subject}] Q${p.questionIndex} of quiz ${p.quizId.slice(0, 8)}`);
    console.log(`      question: ${p.question}`);
    console.log(`      was  idx ${p.from}: ${p.fromText}`);
    console.log(`      now  idx ${p.to}: ${p.toText}`);
  }
  if (plans.length > 10) console.log(`  ... and ${plans.length - 10} more`);
  console.log("");

  // Impact, so the change is judged on consequences rather than row count.
  const quizIds = [...new Set(plans.map((p) => p.quizId))];
  const attempts = await prisma.attempt.count({ where: { quizId: { in: quizIds } } });
  console.log(`attempts already recorded on these quizzes: ${attempts}`);
  console.log(
    attempts === 0
      ? "  -> no student has been graded yet, so this repair corrects future grading only"
      : "  -> WARNING: students have already been graded; their recorded scores may be wrong",
  );
  console.log("");

  if (!APPLY) {
    console.log("dry run complete — re-run with --apply to write");
    return;
  }

  if (plans.length === 0) {
    console.log("nothing to do");
    return;
  }

  // ── Backup before touching anything ────────────────────────────────────────
  const dir = path.join(process.cwd(), "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(dir, `correct-index-${stamp}.json`);

  const affected = await prisma.quiz.findMany({
    where: { id: { in: quizIds } },
    select: { id: true, studentId: true, questions: true },
  });
  fs.writeFileSync(backupPath, JSON.stringify(affected, null, 2));
  console.log(`backup written: ${backupPath} (${affected.length} quizzes)`);

  // ── Write ──────────────────────────────────────────────────────────────────
  let written = 0;
  for (const quiz of affected) {
    const questions = (quiz.questions as Question[]) ?? [];
    let changed = false;
    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      if (!item || typeof item !== "object") continue;
      const target = flaggedIndex(item.options ?? []);
      if (target === null) continue;
      if (item.correctIndex === target) continue;
      item.correctIndex = target;
      changed = true;
    }
    if (!changed) continue;
    await prisma.quiz.update({ where: { id: quiz.id }, data: { questions: questions as never } });
    written++;
  }
  console.log(`quizzes updated: ${written}`);

  // ── Verify the write actually took ────────────────────────────────────────
  const after = await prisma.quiz.findMany({
    where: { id: { in: quizIds } },
    select: { questions: true },
  });
  let remaining = 0;
  for (const q of after) {
    for (const item of ((q.questions as Question[]) ?? [])) {
      if (!item || typeof item !== "object") continue;
      const target = flaggedIndex(item.options ?? []);
      if (target === null) continue;
      if (item.correctIndex !== target) remaining++;
    }
  }
  console.log(`verification: ${remaining} question(s) still disagree`);
  if (remaining !== 0) {
    console.error("FAILED — the write did not take. Backup is at " + backupPath);
    process.exit(1);
  }
  console.log("OK — every flagged question now agrees with its isCorrect flag");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
