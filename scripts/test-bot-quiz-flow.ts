import "dotenv/config";
import type { Context } from "telegraf";
import { prisma } from "../src/lib/prisma";
import {
  handleQuizStart,
  handleSubjectCallback,
  handleQuizPick,
  handleQuizCallback,
  QUIZ_SUBJECT_PREFIX,
  QUIZ_PICK_PREFIX,
  QUIZ_ANS_PREFIX,
} from "../src/bot/handlers/quiz";
import { getSession } from "../src/bot/session";

/**
 * End-to-end exercise of the bot's quiz flow, from `/quiz` to the result
 * message, without a live Telegram chat.
 *
 * WHY THIS EXISTS
 * The flow had never been driven end to end. Two defects had shipped through
 * it undetected:
 *
 *   1. `Quiz.questions[].options` was stored two ways. The object shape reached
 *      the inline keyboard as "[object Object]", and `matchAnswerToIndex` threw
 *      on `o.trim()` — so the bot offered unreadable buttons and crashed on a
 *      typed answer.
 *   2. Unescaped question text ("F_N") made Telegram reject the whole message,
 *      so the student saw nothing at all.
 *
 * Both were found by reading code and probing the DB. Neither would have
 * survived this test. The fixture below deliberately reproduces both shapes and
 * the exact production content that broke.
 *
 * The last section replays every captured message against the real Telegram
 * API with an invalid chat id: Telegram validates entities BEFORE it looks up
 * the chat, so a well-formed message fails with "chat not found" while a
 * malformed one fails with "can't parse entities". That distinguishes the two
 * without needing a live chat.
 *
 * Run: npx tsx scripts/test-bot-quiz-flow.ts
 */

const TEST_CODE = "ZZTESTBOT001";
const TEST_TG = "999000444";
const TEST_SUBJECT = "ZZ Uji Bot";
const TEST_TOPIC = "ZZ Topik Bot";

const failures: string[] = [];
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
  if (!ok) failures.push(label);
}

interface Sent {
  text: string;
  opts?: { parse_mode?: string; reply_markup?: unknown };
}

/** A Context that records what the handlers send instead of hitting Telegram. */
function makeCtx() {
  const sent: Sent[] = [];
  const answered: string[] = [];
  const edited: Sent[] = [];
  const ctx = {
    reply: async (text: string, opts?: Sent["opts"]) => {
      sent.push({ text, opts });
      return {} as never;
    },
    answerCbQuery: async (text?: string) => {
      answered.push(text ?? "");
      return true as never;
    },
    editMessageText: async (text: string, opts?: Sent["opts"]) => {
      edited.push({ text, opts });
      return {} as never;
    },
    callbackQuery: { data: "" },
    message: { text: "" },
    from: { id: Number(TEST_TG) },
    chat: { id: Number(TEST_TG) },
  };
  return { ctx: ctx as unknown as Context, sent, answered, edited };
}

function buttons(msg: Sent | undefined): { text: string; callback_data: string }[] {
  const kb = (msg?.opts?.reply_markup as { inline_keyboard?: { text: string; callback_data: string }[][] })
    ?.inline_keyboard;
  return (kb ?? []).flat();
}

async function cleanup() {
  const s = await prisma.student.findUnique({ where: { studentId: TEST_CODE }, select: { id: true } });
  if (s) {
    // Cascades cover Attempt; ReviewQueue and TopicMastery are keyed by studentId.
    await prisma.reviewQueue.deleteMany({ where: { studentId: s.id } });
    await prisma.topicMastery.deleteMany({ where: { studentId: s.id } });
    await prisma.studentActivity.deleteMany({ where: { studentId: s.id } });
    await prisma.attempt.deleteMany({ where: { studentId: s.id } });
    await prisma.progressSnap.deleteMany({ where: { studentId: s.id } }).catch(() => {});
    await prisma.sessionState.deleteMany({ where: { studentId: s.id } }).catch(() => {});
    const quizzes = await prisma.quiz.findMany({ where: { studentId: s.id }, select: { id: true, materialId: true } });
    await prisma.quiz.deleteMany({ where: { studentId: s.id } });
    await prisma.material.deleteMany({ where: { id: { in: quizzes.map((q) => q.materialId) } } });
    await prisma.student.delete({ where: { id: s.id } });
  }
}

async function main() {
  await cleanup();

  const curriculum = await prisma.curriculum.findFirst({ select: { id: true } });
  if (!curriculum) throw new Error("no curriculum row to attach the fixture to");

  const student = await prisma.student.create({
    data: {
      studentId: TEST_CODE,
      name: "ZZ Test Bot",
      gradeLevel: "SMP_1" as never,
      telegramId: TEST_TG,
      status: "ACTIVE",
      isTemplate: false,
    },
  });

  const material = await prisma.material.create({
    data: {
      curriculumId: curriculum.id,
      topic: TEST_TOPIC,
      subject: TEST_SUBJECT,
      gradeLevel: "SMP_1" as never,
      weekOrder: 1,
      status: "READY" as never,
    },
  });

  // Question 0 reproduces BOTH production defects at once: object-shaped
  // options (the shape that rendered "[object Object]") and a physics
  // subscript (the text Telegram refused to parse).
  const QUESTIONS = [
    {
      question: "Gaya normal meja pada buku adalah F_N. Berapa besar gaya itu?",
      options: [
        { text: "Sama dengan berat buku", isCorrect: true },
        { text: "Nol", isCorrect: false },
        { text: "Lebih besar dari berat buku", isCorrect: false },
      ],
      correctIndex: 0,
      explanation: "Gaya normal = berat buku (w = m*g) pada bidang datar.",
    },
    {
      question: "Nilai dari lim_{x→2} (x² - 4)/(x - 2) adalah ...",
      options: ["2", "4", "8"],
      correctIndex: 1,
      explanation: "Faktorkan: (x-2)(x+2)/(x-2) = x+2 → 4.",
    },
  ];

  const quiz = await prisma.quiz.create({
    data: {
      materialId: material.id,
      studentId: student.id,
      questions: QUESTIONS as never,
      maxScore: QUESTIONS.length,
    },
  });

  // ── 1. /quiz — subject picker ──────────────────────────────────────────
  let { ctx, sent, answered, edited } = makeCtx();
  await handleQuizStart(ctx, student);
  check("quiz start sends a message", sent.length === 1, `sent=${sent.length}`);
  const subjectButtons = buttons(sent[0]);
  check(
    "subject picker lists the fixture subject",
    subjectButtons.some((b) => b.callback_data === `${QUIZ_SUBJECT_PREFIX}${TEST_SUBJECT}`),
    JSON.stringify(subjectButtons.map((b) => b.callback_data)),
  );
  check(
    "subject picker has no unescaped-object label",
    subjectButtons.every((b) => !b.text.includes("[object Object]")),
  );

  // ── 2. subject chosen — quiz list ──────────────────────────────────────
  ({ ctx, sent, answered, edited } = makeCtx());
  (ctx as unknown as { callbackQuery: { data: string } }).callbackQuery.data =
    `${QUIZ_SUBJECT_PREFIX}${TEST_SUBJECT}`;
  await handleSubjectCallback(ctx, student, TEST_SUBJECT);
  check("subject callback edits the message", edited.length === 1, `edited=${edited.length}`);
  const quizButtons = buttons(edited[0]);
  check(
    "quiz list offers the fixture quiz",
    quizButtons.some((b) => b.callback_data === `${QUIZ_PICK_PREFIX}${quiz.id}`),
    JSON.stringify(quizButtons.map((b) => b.callback_data)),
  );
  check(
    "quiz list labels carry no object text",
    quizButtons.every((b) => !b.text.includes("[object Object]")),
  );

  // ── 3. quiz picked — first question ────────────────────────────────────
  ({ ctx, sent, answered, edited } = makeCtx());
  await handleQuizPick(ctx, student, quiz.id);
  check("picking a quiz sends the first question", sent.length === 1, `sent=${sent.length}`);
  const q1 = sent[0];
  const q1Buttons = buttons(q1);
  check(
    "question 1 renders 3 answer buttons",
    q1Buttons.filter((b) => b.callback_data.startsWith(QUIZ_ANS_PREFIX)).length === 3,
    JSON.stringify(q1Buttons.map((b) => b.callback_data)),
  );
  check(
    "object-shaped options became readable labels, not [object Object]",
    q1Buttons.some((b) => b.text.includes("Sama dengan berat buku")) &&
      q1Buttons.every((b) => !b.text.includes("[object Object]")),
    JSON.stringify(q1Buttons.map((b) => b.text)),
  );
  check(
    "answer button labels are NOT markdown-escaped",
    q1Buttons.every((b) => !b.text.includes("\\")),
    JSON.stringify(q1Buttons.filter((b) => b.text.includes("\\")).map((b) => b.text)),
  );
  check(
    "question body escapes the unpaired underscore (F\\_N)",
    q1.text.includes("F\\_N"),
    q1.text.replace(/\n/g, "\\n").slice(0, 90),
  );
  check(
    "question body leaves no raw F_N",
    !/F_N/.test(q1.text),
  );
  check("question body uses Markdown parse_mode", q1.opts?.parse_mode === "Markdown");

  const session1 = await getSession(student.id);
  check("session entered quiz_active", session1.currentMode === "quiz_active", session1.currentMode);

  // ── 4. answer question 1 correctly ─────────────────────────────────────
  ({ ctx, sent, answered, edited } = makeCtx());
  (ctx as unknown as { callbackQuery: { data: string } }).callbackQuery.data = `${QUIZ_ANS_PREFIX}0:0`;
  const handled = await handleQuizCallback(ctx, student);
  check("answer callback was handled", handled === true);
  check("callback query was acknowledged", answered.length === 1, JSON.stringify(answered));
  check("feedback message sent", sent.length >= 1, `sent=${sent.length}`);
  check(
    "correct answer is confirmed",
    sent[0]?.text.includes("Benar"),
    sent[0]?.text.replace(/\n/g, "\\n").slice(0, 80),
  );
  check("explanation is escaped in the feedback", !/\bm\*g\b/.test(sent[0]?.text ?? ""));

  // Question 2 should follow automatically.
  const q2 = sent[1];
  check("question 2 follows the answer", !!q2, `sent=${sent.length}`);
  // `{` is not a Markdown metacharacter, so escapeMd leaves it alone. What
  // matters is that the underscore is escaped and the message parses — the
  // Telegram replay at the end proves the second half.
  check(
    "question 2 body escapes the underscore in lim_{x→2}",
    !!q2 && q2.text.includes("lim\\_{x→2}"),
    q2?.text.replace(/\n/g, "\\n").slice(0, 90),
  );
  check("question 2 body leaves no raw lim_{x", !!q2 && !/lim_\{x/.test(q2.text));

  // ── 5. answer question 2 WRONG → finish + grading ──────────────────────
  ({ ctx, sent, answered, edited } = makeCtx());
  (ctx as unknown as { callbackQuery: { data: string } }).callbackQuery.data = `${QUIZ_ANS_PREFIX}1:0`;
  await handleQuizCallback(ctx, student);
  check("wrong answer is flagged", sent[0]?.text.includes("Kurang tepat"), sent[0]?.text.slice(0, 60));
  check(
    "wrong answer names the correct option text",
    sent[0]?.text.includes("4"),
    sent[0]?.text.replace(/\n/g, "\\n").slice(0, 120),
  );

  const result = sent.find((m) => m.text.includes("Selesai"));
  check("a result message was sent", !!result, `sent=${sent.length}`);
  if (result) {
    check("result reports 1/2", result.text.includes("1/2"), result.text.replace(/\n/g, "\\n").slice(0, 160));
    check(
      "result does not leak an object into the score line",
      !result.text.includes("[object Object]"),
    );
    check(
      "result escapes the question excerpt",
      !/(?<!\\)F_N/.test(result.text) && !/(?<!\\)lim_\{x/.test(result.text),
    );
  }

  // ── 6. side effects ────────────────────────────────────────────────────
  const attempt = await prisma.attempt.findFirst({
    where: { studentId: student.id, quizId: quiz.id },
    orderBy: { createdAt: "desc" },
  });
  check("an Attempt row was persisted", !!attempt, attempt ? `score=${attempt.score}` : "none");
  check("persisted score is 1", attempt?.score === 1, String(attempt?.score));

  const sessionAfter = await getSession(student.id);
  check(
    "session was reset after the quiz finished",
    sessionAfter.currentMode !== "quiz_active",
    sessionAfter.currentMode,
  );

  const review = await prisma.reviewQueue.findMany({ where: { studentId: student.id } });
  check(
    "exactly the wrong question was filed for review (1, not 2)",
    review.length === 1 && review[0].questionIdx === 1,
    JSON.stringify(review.map((r) => ({ idx: r.questionIdx, lapses: r.lapses }))),
  );

  // ── 7. Replay every captured message against the real Telegram API ─────
  // An invalid chat id still proves parsing: Telegram validates entities
  // before it resolves the chat.
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("\nSKIP  Telegram replay — TELEGRAM_BOT_TOKEN not set");
  } else {
    const all: Sent[] = [];
    ({ ctx, sent } = makeCtx());
    await handleQuizStart(ctx, student);
    all.push(...sent);
    ({ ctx, sent, edited } = makeCtx());
    await handleSubjectCallback(ctx, student, TEST_SUBJECT);
    all.push(...edited);
    ({ ctx, sent } = makeCtx());
    await handleQuizPick(ctx, student, quiz.id);
    all.push(...sent);
    ({ ctx, sent } = makeCtx());
    (ctx as unknown as { callbackQuery: { data: string } }).callbackQuery.data = `${QUIZ_ANS_PREFIX}0:0`;
    await handleQuizCallback(ctx, student);
    all.push(...sent);

    let parseErrors = 0;
    let rejected = 0;
    for (const m of all) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: -999999999999,
          text: m.text,
          ...(m.opts?.parse_mode ? { parse_mode: m.opts.parse_mode } : {}),
          ...(m.opts?.reply_markup ? { reply_markup: m.opts.reply_markup } : {}),
        }),
      });
      const body = (await res.json()) as { ok: boolean; description?: string };
      const desc = body.description ?? "";
      if (desc.includes("can't parse entities")) {
        parseErrors++;
        console.log(`      parse error: ${desc}`);
        console.log(`      text: ${m.text.replace(/\n/g, "\\n").slice(0, 140)}`);
      } else if (!body.ok) {
        rejected++;
      }
    }
    check(
      `all ${all.length} captured messages pass Telegram's entity parser`,
      parseErrors === 0,
      `parseErrors=${parseErrors}`,
    );
    check(
      "rejections are chat-not-found, not parse failures",
      rejected === all.length,
      `chatNotFound=${rejected}/${all.length}`,
    );
  }

  await cleanup();
  const leftover = await prisma.student.findUnique({ where: { studentId: TEST_CODE } });
  check("cleanup removed the fixture", leftover === null);

  console.log(failures.length === 0 ? "\nALL PASS" : `\n${failures.length} FAILED`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await cleanup().catch(() => {});
  process.exit(1);
});
