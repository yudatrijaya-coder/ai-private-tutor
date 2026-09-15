/**
 * End-to-end test of the admin extension decision handler.
 *
 * Uses a FAKE Telegraf ctx (records outgoing messages) and a throwaway student
 * row — never touches real students and never talks to Telegram.
 *
 * Run: npx tsx scripts/test-extension-decision.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { handleExtensionDecision } from "../src/bot/handlers/extension";

const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID ?? "";
const TEST_CODE = "ZZTESTEXT001";
const STUDENT_TG = "999000111";
const OTHER_TG = "999000222";

interface Sent {
  to: string;
  text: string;
}

function makeCtx(fromId: string, sends: Sent[], edits: string[]) {
  return {
    callbackQuery: { from: { id: Number(fromId) } },
    answerCbQuery: async (t?: string) => {
      edits.push(`ANSWER:${t ?? ""}`);
    },
    editMessageText: async (t: string) => {
      edits.push(`EDIT:${t}`);
    },
    telegram: {
      sendMessage: async (chatId: string, text: string) => {
        sends.push({ to: chatId, text });
      },
    },
    reply: async (t: string) => {
      sends.push({ to: "reply", text: t });
    },
  } as never;
}

function monthsFromNow(d: Date, now: Date): number {
  return (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
}

async function main() {
  const failures: string[] = [];
  const check = (label: string, ok: boolean, detail = "") => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
    if (!ok) failures.push(label);
  };

  if (!ADMIN_ID) {
    console.log("SKIP: ADMIN_TELEGRAM_ID not set in .env");
    process.exit(0);
  }

  // Throwaway student
  await prisma.student.deleteMany({ where: { studentId: TEST_CODE } });
  const student = await prisma.student.create({
    data: {
      studentId: TEST_CODE,
      name: "ZZ Test Ext",
      gradeLevel: "SMP_1" as never,
      telegramId: STUDENT_TG,
      status: "TRIAL",
      trialEndsAt: new Date(Date.now() - 86400000), // expired
    },
  });
  const otherStudent = await prisma.student.findFirst({
    where: { studentId: { not: TEST_CODE } },
    select: { studentId: true },
  });

  // ── 1. Non-admin cannot approve ──
  let sends: Sent[] = [];
  let edits: string[] = [];
  await handleExtensionDecision(makeCtx(OTHER_TG, sends, edits), "set", student.studentId, 1);
  let row = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
  check(
    "non-admin refused, no DB change",
    row.status === "TRIAL" && row.subscriptionUntil === null && sends.length === 0,
    `status=${row.status}`,
  );

  // ── 2. Admin approves 3 months ──
  sends = [];
  edits = [];
  const before = new Date();
  await handleExtensionDecision(makeCtx(ADMIN_ID, sends, edits), "set", student.studentId, 3);
  row = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
  const gotMonths = row.subscriptionUntil ? monthsFromNow(row.subscriptionUntil, before) : -1;
  check(
    "approve 3mo → ACTIVE + +3 months",
    row.status === "ACTIVE" && row.trialEndsAt === null && gotMonths === 3,
    `status=${row.status} months=${gotMonths}`,
  );
  check(
    "approve 3mo → student notified",
    sends.some((s) => s.to === STUDENT_TG && /Aktif sampai/.test(s.text)),
  );
  check(
    "approve 3mo → admin message rewritten with package",
    edits.some((e) => e.startsWith("EDIT:") && /3 bulan/.test(e)),
  );

  // ── 3. Early renewal stacks (1 more month → 4 total) ──
  sends = [];
  edits = [];
  const firstUntil = row.subscriptionUntil!;
  await handleExtensionDecision(makeCtx(ADMIN_ID, sends, edits), "set", student.studentId, 1);
  row = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
  const stacked = row.subscriptionUntil ? monthsFromNow(row.subscriptionUntil, firstUntil) : -1;
  check(
    "early renewal stacks (+1 month onto remainder)",
    stacked === 1,
    `stackedMonths=${stacked}`,
  );

  // ── 4. Unknown package rejected ──
  const untilBefore = row.subscriptionUntil;
  sends = [];
  edits = [];
  await handleExtensionDecision(makeCtx(ADMIN_ID, sends, edits), "set", student.studentId, 7);
  row = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
  check(
    "unknown package → no change",
    row.subscriptionUntil?.getTime() === untilBefore?.getTime(),
  );

  // ── 4b. Callback carrying the DB uuid (not the login code) still resolves ──
  // Regression: a hand-built/re-sent admin notification shipped `student.id`
  // and the button died with "Siswa tidak ditemukan".
  await prisma.student.update({
    where: { id: student.id },
    data: { status: "TRIAL", trialEndsAt: new Date(Date.now() - 86400000), subscriptionUntil: null },
  });
  sends = [];
  edits = [];
  await handleExtensionDecision(makeCtx(ADMIN_ID, sends, edits), "set", student.id, 1);
  row = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
  check(
    "uuid-form callback resolves (approve 1mo)",
    row.status === "ACTIVE" && row.subscriptionUntil !== null,
    `status=${row.status}`,
  );
  check(
    "uuid-form callback → student notified",
    sends.some((s) => s.to === STUDENT_TG && /Aktif sampai/.test(s.text)),
  );

  // ── 4c. Genuinely unknown id → refused, no crash ──
  sends = [];
  edits = [];
  await handleExtensionDecision(makeCtx(ADMIN_ID, sends, edits), "set", "NOPE-DOES-NOT-EXIST", 1);
  check(
    "unknown id → refusal answer, no student message",
    edits.some((e) => /Siswa tidak ditemukan/.test(e)) && sends.length === 0,
  );

  // ── 5. Reject → no DB change + student told to re-check ──
  await prisma.student.update({
    where: { id: student.id },
    data: { status: "TRIAL", trialEndsAt: new Date(Date.now() - 86400000) },
  });
  sends = [];
  edits = [];
  await handleExtensionDecision(makeCtx(ADMIN_ID, sends, edits), "reject", student.studentId);
  row = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
  check(
    "reject → status unchanged",
    row.status === "TRIAL",
    `status=${row.status}`,
  );
  check(
    "reject → student asked to re-check transfer",
    sends.some((s) => s.to === STUDENT_TG && /transfer/i.test(s.text) && /cek dulu/i.test(s.text)),
  );
  check(
    "reject → no message to unrelated student",
    !sends.some((s) => s.to === (otherStudent?.studentId ?? "")),
  );

  // cleanup
  await prisma.student.delete({ where: { id: student.id } });
  console.log(`\ncleanup: test student ${TEST_CODE} deleted`);
  console.log(`${failures.length === 0 ? "ALL PASS" : `FAILURES: ${failures.join(", ")}`}`);
  await prisma.$disconnect();
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.student.deleteMany({ where: { studentId: TEST_CODE } }).catch(() => {});
  await prisma.$disconnect();
  process.exit(1);
});
