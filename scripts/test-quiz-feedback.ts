/**
 * Regression tests for the shared quiz-grading rule and the post-quiz feedback
 * service.
 *
 * These exist because the correctness check was duplicated in three places and
 * one copy was wrong:
 *
 *     String(ans).trim().toUpperCase() === String(question.correctAnswer)...
 *
 * `ans` is the whole `{questionIndex, selectedIndex}` object, and questions
 * carry `correctIndex`, not `correctAnswer`. The comparison was always false,
 * so every question was filed as wrong. The first test below fails loudly
 * against that code and passes against the shared helper.
 *
 * Run: npx tsx scripts/test-quiz-feedback.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  isAnswerCorrect,
  parseAnswers,
  parseQuestions,
  wrongQuestionIndices,
  countCorrect,
} from "../src/lib/quiz-grading";
import { sendQuizFeedback } from "../src/services/quiz-feedback";

const TEST_CODE = "ZZTESTFEED001";
const TEST_TG = "999000333";

const failures: string[] = [];
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
  if (!ok) failures.push(label);
}

/** The exact shape Quiz.questions holds in production. */
const QUESTIONS = [
  { question: "Ibu kota Indonesia?", options: ["Jakarta", "Bandung"], correctIndex: 0, explanation: "Jakarta adalah ibu kota." },
  { question: "2 + 2 = ?", options: ["3", "4"], correctIndex: 1, explanation: "Dua tambah dua empat." },
  { question: "Air membeku pada?", options: ["0°C", "100°C"], correctIndex: 0, explanation: "Titik beku air 0 derajat." },
  { question: "Planet terdekat matahari?", options: ["Venus", "Merkurius"], correctIndex: 1, explanation: "Merkurius paling dekat." },
  { question: "7 x 8 = ?", options: ["54", "56"], correctIndex: 1, explanation: "7 kali 8 sama dengan 56." },
];

/** The shape the web client actually posts. */
const ANSWERS = [
  { questionIndex: 0, selectedIndex: 0 }, // correct
  { questionIndex: 1, selectedIndex: 0 }, // WRONG (chose 3, answer 4)
  { questionIndex: 2, selectedIndex: 0 }, // correct
  { questionIndex: 3, selectedIndex: 0 }, // WRONG (chose Venus)
  { questionIndex: 4, selectedIndex: 1 }, // correct
];

async function main() {
  // ── 1. The bug that motivated this file ────────────────────────────────
  // Reconstruct the old expression and prove it disagrees with reality.
  const oldIsCorrect = (ans: unknown, q: Record<string, unknown>) =>
    String(ans).trim().toUpperCase() ===
    String((q as { correctAnswer?: string }).correctAnswer).trim().toUpperCase();

  const oldResults = ANSWERS.map((a) => oldIsCorrect(a, QUESTIONS[a.questionIndex]));
  const oldCorrectCount = oldResults.filter(Boolean).length;
  check(
    "old check marked every question wrong (the bug)",
    oldCorrectCount === 0,
    `old counted ${oldCorrectCount}/5 correct`,
  );

  const newCorrectCount = countCorrect(QUESTIONS, ANSWERS);
  check(
    "shared helper counts 3/5 correct",
    newCorrectCount === 3,
    `got ${newCorrectCount}/5`,
  );

  // ── 2. Per-answer correctness ──────────────────────────────────────────
  check("answer 0 correct", isAnswerCorrect(QUESTIONS[0], ANSWERS[0]) === true);
  check("answer 1 wrong", isAnswerCorrect(QUESTIONS[1], ANSWERS[1]) === false);
  check("answer 3 wrong", isAnswerCorrect(QUESTIONS[3], ANSWERS[3]) === false);
  check(
    "unanswered counts as wrong",
    isAnswerCorrect(QUESTIONS[0], { questionIndex: 0, selectedIndex: null }) === false,
  );
  check("missing question is not correct", isAnswerCorrect(undefined, ANSWERS[0]) === false);

  // ── 3. Wrong-question extraction ───────────────────────────────────────
  const wrong = wrongQuestionIndices(QUESTIONS, ANSWERS);
  check(
    "wrong indexes are [1, 3]",
    wrong.length === 2 && wrong[0] === 1 && wrong[1] === 3,
    JSON.stringify(wrong),
  );

  // Unattempted questions must NOT be manufactured into review work.
  const partial = wrongQuestionIndices(QUESTIONS, [{ questionIndex: 0, selectedIndex: 0 }]);
  check("unattempted questions are not filed", partial.length === 0, JSON.stringify(partial));

  // ── 4. Defensive parsing ───────────────────────────────────────────────
  check("parseQuestions handles null", parseQuestions(null).length === 0);
  check("parseQuestions handles non-array", parseQuestions({}).length === 0);
  check("parseAnswers handles undefined", parseAnswers(undefined).length === 0);
  check("parseAnswers handles bare index array", parseAnswers([0, 1]).length === 2);
  check(
    "parseAnswers drops junk entries",
    parseAnswers(["nonsense", null, { questionIndex: 0, selectedIndex: 1 }]).length === 1,
  );

  // ── 5. Feedback service against real DB rows ───────────────────────────
  await prisma.student.deleteMany({ where: { studentId: TEST_CODE } });
  const student = await prisma.student.create({
    data: {
      studentId: TEST_CODE,
      name: "ZZ Test Feed",
      gradeLevel: "SMP_1" as never,
      telegramId: TEST_TG,
      status: "ACTIVE",
      currentStreak: 4,
    },
  });

  const curriculum = await prisma.curriculum.create({
    data: { studentId: student.id, gradeLevel: "SMP_1" as never, version: 999 },
  });
  const material = await prisma.material.create({
    data: {
      curriculumId: curriculum.id,
      topic: "ZZ Uji Umpan Balik",
      subject: "ZZ Uji",
      gradeLevel: "SMP_1" as never,
      weekOrder: 1,
    },
  });
  const quiz = await prisma.quiz.create({
    data: {
      materialId: material.id,
      studentId: student.id,
      questions: QUESTIONS as never,
      maxScore: QUESTIONS.length,
    },
  });

  const sent: { to: string; text: string }[] = [];
  const record = async (chatId: string, text: string) => {
    sent.push({ to: chatId, text });
    return true;
  };

  // A student with no telegramId is skipped silently, not errored.
  await prisma.student.update({ where: { id: student.id }, data: { telegramId: null } });
  const attempt1 = await prisma.attempt.create({
    data: {
      quizId: quiz.id,
      studentId: student.id,
      type: "QUIZ",
      answers: ANSWERS as never,
      score: 3,
      maxScore: 5,
    },
  });
  const skipped = await sendQuizFeedback(attempt1.id, { sendMessage: record });
  check("no telegramId → skipped", skipped.status === "skipped", skipped.reason ?? "");
  check("no telegramId → nothing sent", sent.length === 0);

  await prisma.student.update({ where: { id: student.id }, data: { telegramId: TEST_TG } });

  // Happy path: one message, mentions the score and both wrong questions.
  const result = await sendQuizFeedback(attempt1.id, { sendMessage: record });
  check("feedback sent", result.status === "sent", result.reason ?? "");
  check("exactly one message", sent.length === 1, `got ${sent.length}`);
  const body = sent[0]?.text ?? "";
  check("message has the score", body.includes("3/5"), body.slice(0, 80));
  check("message walks through wrong Q2", body.includes("2 + 2"));
  check("message walks through wrong Q4", body.includes("Planet terdekat"));
  check("message includes an explanation", body.includes("Merkurius paling dekat"));
  check("message includes the streak", body.includes("Streak"));
  check("message suggests /review", body.includes("/review"));

  // Idempotency: the same attempt must never produce a second message.
  const again = await sendQuizFeedback(attempt1.id, { sendMessage: record });
  check("second call is skipped", again.status === "skipped", again.reason ?? "");
  check("still exactly one message", sent.length === 1, `got ${sent.length}`);

  // A failed send releases the claim so a retry can still get through.
  const attempt2 = await prisma.attempt.create({
    data: {
      quizId: quiz.id,
      studentId: student.id,
      type: "QUIZ",
      answers: ANSWERS as never,
      score: 3,
      maxScore: 5,
    },
  });
  const failThenSucceed: string[] = [];
  let call = 0;
  const flaky = async (_chatId: string, text: string) => {
    call += 1;
    failThenSucceed.push(text);
    return call > 1; // first attempt fails
  };
  const failed = await sendQuizFeedback(attempt2.id, { sendMessage: flaky });
  check("failed send reports failure", failed.status === "failed", failed.reason ?? "");
  const retried = await sendQuizFeedback(attempt2.id, { sendMessage: flaky });
  check("retry after failure succeeds", retried.status === "sent", retried.reason ?? "");

  // A perfect score should say so instead of listing wrong answers.
  const attempt3 = await prisma.attempt.create({
    data: {
      quizId: quiz.id,
      studentId: student.id,
      type: "QUIZ",
      answers: [
        { questionIndex: 0, selectedIndex: 0 },
        { questionIndex: 1, selectedIndex: 1 },
        { questionIndex: 2, selectedIndex: 0 },
        { questionIndex: 3, selectedIndex: 1 },
        { questionIndex: 4, selectedIndex: 1 },
      ] as never,
      score: 5,
      maxScore: 5,
    },
  });
  sent.length = 0;
  const perfect = await sendQuizFeedback(attempt3.id, { sendMessage: record });
  check("perfect score sent", perfect.status === "sent", perfect.reason ?? "");
  check("perfect score congratulated", (sent[0]?.text ?? "").includes("Semua soal yang kamu jawab sudah benar"));

  // Unknown attempt id must not throw.
  const missing = await sendQuizFeedback("00000000-0000-0000-0000-000000000000", { sendMessage: record });
  check("unknown attempt skipped", missing.status === "skipped", missing.reason ?? "");

  // ── Cleanup ────────────────────────────────────────────────────────────
  await prisma.attempt.deleteMany({ where: { studentId: student.id } });
  await prisma.reviewQueue.deleteMany({ where: { studentId: student.id } });
  await prisma.quiz.deleteMany({ where: { studentId: student.id } });
  await prisma.material.deleteMany({ where: { curriculumId: curriculum.id } });
  await prisma.curriculum.deleteMany({ where: { id: curriculum.id } });
  await prisma.cronClaim.deleteMany({ where: { key: { contains: "quiz-feedback" } } });
  await prisma.student.deleteMany({ where: { studentId: TEST_CODE } });

  const left = await prisma.student.count({ where: { studentId: TEST_CODE } });
  check("cleanup removed the fixture", left === 0);

  console.log("");
  if (failures.length === 0) {
    console.log("ALL PASS");
    process.exit(0);
  }
  console.log(`${failures.length} FAILURE(S): ${failures.join(", ")}`);
  process.exit(1);
}

main().catch(async (err) => {
  console.error("TEST CRASHED:", err);
  await prisma.student.deleteMany({ where: { studentId: TEST_CODE } }).catch(() => {});
  process.exit(1);
});
