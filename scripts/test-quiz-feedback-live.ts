/**
 * Prove the fire-and-forget feedback actually fires from the grade route.
 *
 * The other suite deliberately uses a student with no telegramId, so it only
 * ever exercises the skip path. This one gives the fixture a telegramId that
 * Telegram will reject ("chat not found"), which means:
 *
 *   - the real fetch to api.telegram.org runs,
 *   - the failure path is exercised (claim released, status "failed"),
 *   - and NOTHING is delivered, because the chat does not exist.
 *
 * That is the only way to test the transport without messaging a real person.
 *
 * The route calls `void sendQuizFeedback(...)`, so the HTTP response returns
 * before the send finishes. We poll for the outcome rather than assume it.
 *
 * Run: npx tsx scripts/test-quiz-feedback-live.ts
 */
import "dotenv/config";
import { execFileSync } from "child_process";
import * as path from "path";
import { prisma } from "../src/lib/prisma";
import { sendQuizFeedback } from "../src/services/quiz-feedback";

const BASE = "http://localhost:3000";
const CODE = "ZZLIVEFEED001";
const GRADE = "SMP_1" as never;
/** Valid shape, guaranteed not to exist as a Telegram chat. */
const BOGUS_CHAT_ID = "1";

const failures: string[] = [];
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
  if (!ok) failures.push(label);
}

const QUESTIONS = [
  { question: "Ibu kota Indonesia?", options: ["Jakarta", "Bandung"], correctIndex: 0, explanation: "Jakarta adalah ibu kota." },
  { question: "2 + 2 = ?", options: ["3", "4"], correctIndex: 1, explanation: "Dua tambah dua empat." },
];
const ANSWERS = [
  { questionIndex: 0, selectedIndex: 0 }, // correct
  { questionIndex: 1, selectedIndex: 0 }, // wrong
];

async function cleanup() {
  const s = await prisma.student.findUnique({ where: { studentId: CODE } });
  if (!s) return;
  // Scope the claim cleanup to THIS fixture's attempts. Deleting every
  // `quiz-feedback:*` claim would wipe a real student's in-flight claim and let
  // the next request send a second message.
  const fixtureAttempts = await prisma.attempt.findMany({
    where: { studentId: s.id },
    select: { id: true },
  });
  await prisma.cronClaim.deleteMany({
    where: { key: { in: fixtureAttempts.map((a) => `quiz-feedback:${a.id}`) } },
  });
  await prisma.reviewQueue.deleteMany({ where: { studentId: s.id } });
  await prisma.attempt.deleteMany({ where: { studentId: s.id } });
  await prisma.studentActivity.deleteMany({ where: { studentId: s.id } });
  await prisma.studentSubjectMastery.deleteMany({ where: { studentId: s.id } });
  await prisma.progressSnap.deleteMany({ where: { studentId: s.id } });
  const c = await prisma.curriculum.findFirst({ where: { studentId: s.id } });
  if (c) {
    await prisma.quiz.deleteMany({ where: { material: { curriculumId: c.id } } });
    await prisma.material.deleteMany({ where: { curriculumId: c.id } });
    await prisma.curriculum.delete({ where: { id: c.id } });
  }
  await prisma.student.delete({ where: { id: s.id } });
}

/** Poll until the predicate holds or the budget runs out. */
async function waitFor<T>(label: string, fn: () => Promise<T | null>, budgetMs = 12000): Promise<T | null> {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    const got = await fn();
    if (got !== null) return got;
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`  (${label} not observed within ${budgetMs}ms)`);
  return null;
}

async function main() {
  await cleanup();

  const student = await prisma.student.create({
    data: {
      studentId: CODE,
      name: "ZZ Live Feed",
      gradeLevel: GRADE,
      status: "ACTIVE",
      telegramId: BOGUS_CHAT_ID,
    },
  });
  const curriculum = await prisma.curriculum.create({
    data: { studentId: student.id, gradeLevel: GRADE, version: 997 },
  });
  const material = await prisma.material.create({
    data: { curriculumId: curriculum.id, topic: "ZZ Live", subject: "ZZ Live", gradeLevel: GRADE, weekOrder: 1 },
  });
  const quiz = await prisma.quiz.create({
    data: { materialId: material.id, studentId: student.id, questions: QUESTIONS as never, maxScore: 2 },
  });
  check("fixture created with a telegramId", student.telegramId === BOGUS_CHAT_ID);

  const token = execFileSync(
    "node",
    [path.join(__dirname, "mint-student-token.cjs"), student.id, CODE, "ZZ Live Feed", GRADE as string, "ACTIVE"],
    { cwd: path.join(__dirname, ".."), encoding: "utf8" },
  ).trim();

  // ── A. The route fires the service without awaiting it ─────────────────
  const res = await fetch(`${BASE}/api/students/quizzes/${quiz.id}/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `student_session=${token}` },
    body: JSON.stringify({ answers: ANSWERS, commit: true }),
  });
  check("grade route responded", res.status === 200, `status=${res.status}`);

  // Fire-and-forget: the response above must NOT have waited on Telegram, so
  // the attempt exists immediately while the send may still be in flight.
  const attempt = await prisma.attempt.findFirst({ where: { studentId: student.id } });
  check("attempt committed", Boolean(attempt), attempt ? `score=${attempt.score}/2` : "none");

  // ── B. The send was actually attempted, and failed against a dead chat ──
  // Claim lifecycle proves the transport ran: `claimOnce` is taken *before*
  // the send, so the claim appearing means the send started, and it
  // disappearing again means the rejection was handled and the claim released.
  const claimKey = `quiz-feedback:${attempt!.id}`;

  const claimAppeared = await waitFor("claim taken (send started)", async () => {
    return (await prisma.cronClaim.findUnique({ where: { key: claimKey } })) ?? null;
  }, 8000);
  check(
    "send started (claim taken before the Telegram call)",
    claimAppeared !== null,
    claimAppeared ? "observed" : "never saw the claim",
  );

  const claimReleased = await waitFor("claim released (send failed)", async () => {
    const c = await prisma.cronClaim.findUnique({ where: { key: claimKey } });
    return c === null ? "gone" : null;
  }, 8000);
  check(
    "rejected send released the claim",
    claimReleased === "gone",
    "a stuck claim would block every future retry",
  );

  // ── C. Direct call confirms the transport really ran and reported failure ─
  await prisma.cronClaim.deleteMany({ where: { key: claimKey } });
  const direct = await sendQuizFeedback(attempt!.id);
  check(
    "real Telegram call attempted and rejected (dead chat)",
    direct.status === "failed",
    `status=${direct.status} reason=${direct.reason ?? "-"}`,
  );
  const releasedAfterFailure = await prisma.cronClaim.findUnique({ where: { key: claimKey } });
  check("failed send released the claim", releasedAfterFailure === null);

  // ── D. A retry is therefore possible ───────────────────────────────────
  const retry = await sendQuizFeedback(attempt!.id);
  check(
    "retry runs again (claim was free)",
    retry.status === "failed",
    `status=${retry.status}`,
  );

  // ── E. Idempotency still holds on the success path ─────────────────────
  await prisma.cronClaim.deleteMany({ where: { key: claimKey } });
  const fakeSend = async () => true;
  const first = await sendQuizFeedback(attempt!.id, { sendMessage: fakeSend });
  const second = await sendQuizFeedback(attempt!.id, { sendMessage: fakeSend });
  check("first send succeeds", first.status === "sent", first.reason ?? "");
  check("second send skipped as duplicate", second.status === "skipped" && second.reason === "already sent",
    `status=${second.status} reason=${second.reason ?? "-"}`);

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
