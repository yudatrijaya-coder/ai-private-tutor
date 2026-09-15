/**
 * HTTP-level end-to-end proof of the quiz pipeline fixes.
 *
 * Exercises the RUNNING server (localhost:3000) exactly as the web client does:
 *
 *   1. POST /api/students/quizzes/<id>/grade  { commit: true }  → the real commit
 *   2. POST /api/students/activity            { quiz_complete } → the tracker echo
 *
 * Before the fix, step 2 inserted a SECOND Attempt for the same submission —
 * production held 135 such pairs, every one ~45 ms apart — and the review queue
 * stayed empty for web quizzes because the route's correctness check compared a
 * stringified answer object against a `correctAnswer` property that does not
 * exist (questions carry `correctIndex`).
 *
 * Fixtures go through Prisma; only the two HTTP calls are raw. The throwaway
 * student has NO telegramId, so the feedback service skips silently and nothing
 * is sent to Telegram.
 *
 * Run: npx tsx scripts/test-quiz-pipeline-http.ts
 */
import "dotenv/config";
import { execFileSync } from "child_process";
import * as path from "path";
import { prisma } from "../src/lib/prisma";

const BASE = "http://localhost:3000";
const CODE = "ZZHTTPFEED001";
const GRADE = "SMP_1" as never;

const failures: string[] = [];
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
  if (!ok) failures.push(label);
}

const QUESTIONS = [
  { question: "Ibu kota Indonesia?", options: ["Jakarta", "Bandung"], correctIndex: 0, explanation: "Jakarta adalah ibu kota." },
  { question: "2 + 2 = ?", options: ["3", "4"], correctIndex: 1, explanation: "Dua tambah dua empat." },
  { question: "Air membeku pada?", options: ["0C", "100C"], correctIndex: 0, explanation: "Titik beku air 0 derajat." },
  { question: "Planet terdekat matahari?", options: ["Venus", "Merkurius"], correctIndex: 1, explanation: "Merkurius paling dekat." },
  { question: "7 x 8 = ?", options: ["54", "56"], correctIndex: 1, explanation: "7 kali 8 sama dengan 56." },
];

/** 3 correct (0, 2, 4), 2 wrong (1, 3). */
const ANSWERS = [
  { questionIndex: 0, selectedIndex: 0 },
  { questionIndex: 1, selectedIndex: 0 },
  { questionIndex: 2, selectedIndex: 0 },
  { questionIndex: 3, selectedIndex: 0 },
  { questionIndex: 4, selectedIndex: 1 },
];

async function cleanup() {
  const existing = await prisma.student.findUnique({ where: { studentId: CODE } });
  if (!existing) return;
  await prisma.reviewQueue.deleteMany({ where: { studentId: existing.id } });
  await prisma.attempt.deleteMany({ where: { studentId: existing.id } });
  await prisma.studentActivity.deleteMany({ where: { studentId: existing.id } });
  await prisma.studentSubjectMastery.deleteMany({ where: { studentId: existing.id } });
  await prisma.progressSnap.deleteMany({ where: { studentId: existing.id } });
  const curriculum = await prisma.curriculum.findFirst({ where: { studentId: existing.id } });
  if (curriculum) {
    await prisma.quiz.deleteMany({ where: { material: { curriculumId: curriculum.id } } });
    await prisma.material.deleteMany({ where: { curriculumId: curriculum.id } });
    await prisma.curriculum.delete({ where: { id: curriculum.id } });
  }
  await prisma.student.delete({ where: { id: existing.id } });
}

async function main() {
  await cleanup();

  // ── Fixture ────────────────────────────────────────────────────────────
  const student = await prisma.student.create({
    data: {
      studentId: CODE,
      name: "ZZ HTTP Feed",
      gradeLevel: GRADE,
      status: "ACTIVE",
      // Deliberately no telegramId: the feedback service must skip silently.
    },
  });
  const curriculum = await prisma.curriculum.create({
    data: { studentId: student.id, gradeLevel: GRADE, version: 999 },
  });
  const material = await prisma.material.create({
    data: {
      curriculumId: curriculum.id,
      topic: "ZZ HTTP Uji",
      subject: "ZZ HTTP",
      gradeLevel: GRADE,
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
  check("fixture created", Boolean(student.id && quiz.id), `quiz=${quiz.id.slice(0, 8)}`);

  const token = execFileSync(
    "node",
    [path.join(__dirname, "mint-student-token.cjs"), student.id, CODE, "ZZ HTTP Feed", GRADE as string, "ACTIVE"],
    { cwd: path.join(__dirname, ".."), encoding: "utf8" },
  ).trim();

  const H = { "Content-Type": "application/json", Cookie: `student_session=${token}` };

  // ── 1. The real commit (what the quiz page does on submit) ─────────────
  const gradeRes = await fetch(`${BASE}/api/students/quizzes/${quiz.id}/grade`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ answers: ANSWERS, commit: true }),
  });
  const gradeJson = await gradeRes.json();
  check(
    "grade route committed",
    gradeRes.status === 200 && gradeJson.committed === true,
    `status=${gradeRes.status} err=${gradeJson.error ?? "-"}`,
  );
  check(
    "grade route scored 3/5",
    gradeJson.score === 3 && gradeJson.maxScore === 5,
    `score=${gradeJson.score}/${gradeJson.maxScore}`,
  );

  const afterGrade = await prisma.attempt.count({ where: { studentId: student.id } });
  check("grade route wrote exactly 1 attempt", afterGrade === 1, `got ${afterGrade}`);

  // BUG B: the review queue used to stay empty for web submissions.
  const reviewRows = await prisma.reviewQueue.findMany({
    where: { studentId: student.id },
    orderBy: { questionIdx: "asc" },
  });
  check("review queue filled by grade route", reviewRows.length === 2, `got ${reviewRows.length}`);
  check(
    "only the wrong questions queued (1,3)",
    reviewRows.map((r) => r.questionIdx).join(",") === "1,3",
    `got [${reviewRows.map((r) => r.questionIdx).join(",")}]`,
  );
  check("review rows carry the subject", reviewRows[0]?.subject === "ZZ HTTP", `got "${reviewRows[0]?.subject}"`);

  const lapsesAfterGrade = (
    await prisma.reviewQueue.aggregate({
      where: { studentId: student.id },
      _sum: { lapses: true },
    })
  )._sum.lapses ?? 0;

  // ── 2. The tracker echo (the second half of the web submit) ────────────
  const actRes = await fetch(`${BASE}/api/students/activity`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      studentId: CODE,
      materialId: material.id,
      quizId: quiz.id,
      type: "quiz_complete",
      metadata: { subject: "ZZ HTTP", topic: "ZZ HTTP Uji", score: 3, maxScore: 5, answers: ANSWERS },
    }),
  });
  check("activity route accepted the echo", actRes.status === 200, `status=${actRes.status}`);

  // BUG C: this used to insert a duplicate Attempt ~45 ms later.
  const afterEcho = await prisma.attempt.count({ where: { studentId: student.id } });
  check("tracker echo did NOT duplicate the attempt", afterEcho === 1, `got ${afterEcho}`);

  // The echo must not disturb the queue that gradeAttempt already built.
  // `addToReviewQueue` upserts with `lapses: { increment: 1 }`, so re-running
  // the loop on top of gradeAttempt's write bumped every row from 0 to 1 —
  // measured with scripts/diag-lapses.ts. Comparing before/after is the robust
  // guard: it holds whatever the first writer decided a fresh row looks like.
  const lapsesAfterEcho = await prisma.reviewQueue.aggregate({
    where: { studentId: student.id },
    _sum: { lapses: true },
  });
  check(
    "echo recorded no spurious lapse",
    (lapsesAfterEcho._sum.lapses ?? 0) === lapsesAfterGrade,
    `before=${lapsesAfterGrade} after=${lapsesAfterEcho._sum.lapses ?? 0}`,
  );
  const stillTwo = await prisma.reviewQueue.count({ where: { studentId: student.id } });
  check("echo left the queue at 2 rows", stillTwo === 2, `got ${stillTwo}`);

  // ── 3. No Telegram traffic, no claim taken ─────────────────────────────
  const claims = await prisma.cronClaim.count({ where: { key: { startsWith: "quiz-feedback:" } } });
  check("no claim taken when there is no telegramId", claims === 0, `got ${claims}`);

  // ── Cleanup ────────────────────────────────────────────────────────────
  await cleanup();
  const left = await prisma.student.count({ where: { studentId: CODE } });
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
  await cleanup().catch(() => {});
  process.exit(1);
});
