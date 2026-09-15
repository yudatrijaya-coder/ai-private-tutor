/**
 * Render the feedback message for REAL production attempts, without sending.
 *
 * The regression suite asserts against synthetic fixtures. This renders what a
 * student would actually receive, using live rows — so the wording, the escaped
 * Markdown and the length budget are checked against real content rather than
 * text we wrote ourselves.
 *
 * `deps.sendMessage` is injected, so nothing is transmitted to Telegram.
 *
 * Run: npx tsx scripts/render-quiz-feedback.ts [count]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { sendQuizFeedback } from "../src/services/quiz-feedback";

const COUNT = Number(process.argv[2] ?? 3);
/** With --wrong, render attempts that actually have wrong answers. */
const ONLY_WRONG = process.argv.includes("--wrong");

async function main() {
  // Real attempts that actually have answers recorded, newest first.
  const attempts = await prisma.attempt.findMany({
    where: ONLY_WRONG
      ? { answers: { not: undefined }, score: { lt: prisma.attempt.fields.maxScore } }
      : { answers: { not: undefined } },
    orderBy: { createdAt: "desc" },
    take: COUNT,
    include: {
      quiz: { include: { material: true } },
      student: { select: { name: true, studentId: true, telegramId: true } },
    },
  });

  if (attempts.length === 0) {
    console.log("No attempts with answers found.");
    return;
  }

  console.log(`Rendering ${attempts.length} real attempt(s). Nothing is sent.\n`);

  for (const a of attempts) {
    console.log("═".repeat(72));
    console.log(
      `attempt=${a.id.slice(0, 8)}  student=${a.student.name} (${a.student.studentId})  ` +
        `telegramId=${a.student.telegramId ? "SET" : "none"}  score=${a.score}/${a.maxScore}  ` +
        `type=${a.type}`,
    );
    console.log("─".repeat(72));

    // Tiumu is the only student with a telegramId, so most attempts skip. That
    // skip is itself the honest result: it is what production does today.
    const captured: { chatId: string; text: string }[] = [];
    const result = await sendQuizFeedback(a.id, {
      sendMessage: async (chatId, text) => {
        captured.push({ chatId, text });
        return true;
      },
    });

    console.log(`status=${result.status}${result.reason ? `  reason=${result.reason}` : ""}`);
    if (captured.length > 0) {
      console.log("");
      console.log(captured[0].text);
      console.log("");
      console.log(`[message length: ${captured[0].text.length} chars]`);
    }
    console.log("");

    // Release the claim so this read-only render does not block a real send.
    await prisma.cronClaim.deleteMany({ where: { key: `quiz-feedback:${a.id}` } });
  }

  const claims = await prisma.cronClaim.count({ where: { key: { startsWith: "quiz-feedback:" } } });
  console.log(`Claims left behind: ${claims} (expected 0)`);
}

main()
  .catch((err) => {
    console.error("RENDER FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
