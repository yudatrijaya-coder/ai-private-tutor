import "dotenv/config";
/**
 * Two questions about the quiz content itself.
 *
 * 1. correctIndex vs isCorrect
 *    The canonical grader (src/lib/quiz-grading.ts) decides correctness with
 *    `selectedIndex === q.correctIndex`. But each option also carries an
 *    `isCorrect` flag, and the two can disagree. When they do, whichever one the
 *    author meant, the student is graded against the other.
 *
 * 2. Which questions carry characters that break Telegram Markdown
 *    (`_`, `*`, backtick, `[`), and whether the underscore is unpaired — an
 *    unpaired `_` is the exact shape that made Telegram reject the whole message.
 */
import { prisma } from "../src/lib/prisma";

type Option = { text?: string; isCorrect?: boolean };
type Question = {
  question?: string;
  options?: Option[];
  explanation?: string;
  correctIndex?: number;
};

function mdRisky(s: string): string[] {
  const found: string[] = [];
  if (s.includes("_")) found.push("_");
  if (s.includes("*")) found.push("*");
  if (s.includes("`")) found.push("`");
  if (s.includes("[")) found.push("[");
  return found;
}

async function main() {
  const quizzes = await prisma.quiz.findMany({
    select: { id: true, studentId: true, questions: true },
  });

  let totalQ = 0;
  let mismatch = 0;
  let noFlag = 0;
  let multiFlag = 0;
  const samples: string[] = [];

  let riskyQ = 0;
  let unpairedUnderscore = 0;
  const riskySamples: string[] = [];

  for (const q of quizzes) {
    const questions = (q.questions as Question[]) ?? [];
    for (const item of questions) {
      if (!item || typeof item !== "object") continue;
      totalQ++;

      const opts = item.options ?? [];
      const flagged = opts
        .map((o, i) => (o?.isCorrect ? i : -1))
        .filter((i) => i >= 0);

      if (flagged.length === 0) noFlag++;
      else if (flagged.length > 1) multiFlag++;
      else if (typeof item.correctIndex === "number" && flagged[0] !== item.correctIndex) {
        mismatch++;
        if (samples.length < 5) {
          samples.push(
            `  correctIndex=${item.correctIndex} ("${opts[item.correctIndex]?.text ?? "?"}") ` +
              `vs isCorrect=${flagged[0]} ("${opts[flagged[0]]?.text ?? "?"}")\n` +
              `    Q: ${(item.question ?? "").slice(0, 90)}`,
          );
        }
      }

      const fields = [item.question, item.explanation, ...opts.map((o) => o?.text)];
      const hit = fields.some((f) => typeof f === "string" && mdRisky(f).length > 0);
      if (hit) {
        riskyQ++;
        // An ODD number of underscores in one field leaves one unpaired, which is
        // what opens an entity Telegram never finds the end of.
        const unpaired = fields.some((f) => {
          if (typeof f !== "string") return false;
          return (f.match(/_/g)?.length ?? 0) % 2 === 1;
        });
        if (unpaired) {
          unpairedUnderscore++;
          if (riskySamples.length < 6) {
            const bad = fields.find((f) => typeof f === "string" && (f.match(/_/g)?.length ?? 0) % 2 === 1);
            riskySamples.push(`  ${String(bad).slice(0, 100)}`);
          }
        }
      }
    }
  }

  console.log(`quizzes scanned:        ${quizzes.length}`);
  console.log(`questions total:        ${totalQ}`);
  console.log("");
  console.log("── correctIndex vs isCorrect ──");
  console.log(`  disagree:             ${mismatch}`);
  console.log(`  no option flagged:    ${noFlag}`);
  console.log(`  multiple flagged:     ${multiFlag}`);
  for (const s of samples) console.log(s);
  console.log("");
  console.log("── Telegram-breaking characters ──");
  console.log(`  questions affected:   ${riskyQ}`);
  console.log(`  unpaired underscore:  ${unpairedUnderscore}  <- these broke the message`);
  for (const s of riskySamples) console.log(s);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
