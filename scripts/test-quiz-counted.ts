/**
 * End-to-end exercise of the COUNT-AWARE quiz assembly against the live DB.
 *
 * Reproduces the exact production complaint — Raihan asked for "20 soal kimia
 * Pemisahan Campuran" and got 6 — and asserts the new path honours the number:
 *
 *   A. merge matching bank quizzes, de-duplicated, until the count is met;
 *   B. generate the shortfall only when the student is demanding + specific;
 *   C. never silently serve fewer than asked without saying so.
 *
 * `ctx` is a mock that records outbound calls instead of hitting Telegram.
 * Self-cleaning: any Quiz row this test creates is deleted at the end, and the
 * student's session is restored to `chat`.
 *
 * Run: npx tsx scripts/test-quiz-counted.ts
 */
import { prisma } from "../src/lib/prisma";
import { handleQuizStart, parseQuizRequest, parseQuizCount, getStudentSubjects, isDemandingQuizRequest } from "../src/bot/handlers/quiz";

const STUDENT_KEY = "RAIHAN001";

interface Call {
  kind: string;
  text: string;
}

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function makeMockCtx(calls: Call[]) {
  const ctx: any = {
    reply: async (text: string) => {
      calls.push({ kind: "reply", text });
      return { message_id: calls.length };
    },
    answerCbQuery: async () => {
      calls.push({ kind: "answerCbQuery", text: "" });
      return true;
    },
    editMessageText: async (text: string) => {
      calls.push({ kind: "editMessageText", text });
      return true;
    },
    telegram: { sendMessage: async () => ({ message_id: 1 }) },
  };
  return ctx;
}

async function main() {
  const student = await prisma.student.findFirst({ where: { studentId: STUDENT_KEY } });
  if (!student) {
    console.error(`❌ Murid ${STUDENT_KEY} tidak ditemukan`);
    process.exit(1);
  }
  console.log(`\nMurid: ${student.name} (${student.id})\n`);

  const sessionBefore = await prisma.sessionState.findUnique({ where: { studentId: student.id } });
  const quizzesBefore = await prisma.quiz.count({ where: { studentId: student.id } });

  // The exact Raihan message.
  const msg = "buat 20 soal kimia Pemisahan Campuran";

  console.log("── parse: Raihan's real request ──");
  const subjects = await getStudentSubjects(student.id);
  const named = parseQuizRequest(msg, subjects);
  const count = parseQuizCount(msg);
  const demanding = isDemandingQuizRequest(msg);
  console.log(`  subject=${named.subject} topic=${named.topic} count=${count} demanding=${demanding}`);
  check("count terbaca = 20", count === 20, String(count));
  check("subject = Kimia", /kimia/i.test(named.subject ?? ""), String(named.subject));
  check("topic menyebut pemisahan", /pemisah/i.test(named.topic ?? ""), String(named.topic));
  check("dianggap demanding", demanding === true);

  console.log("\n── A/C: assemble 20 from the bank (no generation) ──");
  const calls: Call[] = [];
  const ctx = makeMockCtx(calls);
  await handleQuizStart(ctx, student as any, {
    subject: named.subject,
    topic: named.topic,
    count: 20,
    demanding: false, // no B: prove A+C alone
  });

  // What did the flow actually start? Read the session it left behind.
  const sessionAfter = await prisma.sessionState.findUnique({ where: { studentId: student.id } });
  const ctxData: any = sessionAfter?.context ?? {};
  const startedQuiz = ctxData.quizId
    ? await prisma.quiz.findUnique({ where: { id: ctxData.quizId } })
    : null;
  const startedCount = Array.isArray(startedQuiz?.questions)
    ? (startedQuiz!.questions as unknown[]).length
    : 0;

  console.log(`  kuis dimulai: ${startedQuiz?.id ?? "-"} (${startedCount} soal)`);
  check("ada kuis yang dimulai", !!startedQuiz);
  check("jumlah soal = 20 (diminta 20)", startedCount === 20, `${startedCount}`);
  check("mode = quiz_active", sessionAfter?.currentMode === "quiz_active", String(sessionAfter?.currentMode));

  // De-dup: every question in the assembled quiz must be unique.
  const qs = (startedQuiz?.questions as any[]) ?? [];
  const uniq = new Set(qs.map((q) => (q?.question ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()));
  check("tidak ada soal duplikat", uniq.size === qs.length, `${uniq.size}/${qs.length}`);

  // Contamination guard: the broader "Campuran" material is full of
  // molaritas/larutan/konsentrasi questions. None of those may leak into a
  // "Pemisahan Campuran" quiz.
  const contaminated = qs.filter((q) =>
    /molaritas|konsentrasi|larutan|zat terlarut|persen massa/i.test(
      `${q?.question ?? ""} ${q?.explanation ?? ""}`,
    ),
  );
  check("tidak terkontaminasi soal larutan/molaritas", contaminated.length === 0, `${contaminated.length} bocor`);

  // C: when the bank CANNOT reach the count and generation is off, the bot
  // must say so — not silently serve fewer. "unsur senyawa" only has a handful
  // of questions in the bank, so a 30-question ask is genuinely short.
  console.log("\n── C: honest message when the bank falls short ──");
  const calls2: Call[] = [];
  const ctx2 = makeMockCtx(calls2);
  await handleQuizStart(ctx2, student as any, {
    subject: "Kimia",
    topic: "unsur senyawa",
    count: 30,
    demanding: false,
  });
  const saidShort = calls2.some((c) => /baru ada|bank soal/i.test(c.text));
  const announcedCount = calls2.some((c) => /minta 30|30 soal/i.test(c.text));
  check("mengakui kekurangan secara jujur", saidShort, JSON.stringify(calls2.map((c) => c.text.slice(0, 70))));
  check("menyebut jumlah yang diminta", announcedCount);

  // ── B: demanding + specific topic → generate the shortfall ──
  // The bank holds far fewer than 30 questions on this topic, and the student
  // is insisting, so the flow must top up with generated questions rather than
  // give up. This exercises the full wired path (handleQuizStart → B → LLM →
  // assembled quiz), which is the only way to prove the escalation is reachable.
  console.log("\n── B: demanding + topic spesifik → generate sisa ──");
  const calls3: Call[] = [];
  const ctx3 = makeMockCtx(calls3);
  const t0 = Date.now();
  await handleQuizStart(ctx3, student as any, {
    subject: "Kimia",
    topic: "unsur senyawa",
    count: 12,
    demanding: true,
  });
  const bMs = Date.now() - t0;
  const announcedGenerating = calls3.some((c) => /bikinin|bikin.*soal/i.test(c.text));
  const s3 = await prisma.sessionState.findUnique({ where: { studentId: student.id } });
  const bQuiz = (s3?.context as any)?.quizId
    ? await prisma.quiz.findUnique({ where: { id: (s3!.context as any).quizId } })
    : null;
  const bCount = Array.isArray(bQuiz?.questions) ? (bQuiz!.questions as unknown[]).length : 0;
  console.log(`  jalur B: ${bCount} soal dalam ${bMs} ms`);
  check("B: memberi tahu sedang membuat soal", announcedGenerating, JSON.stringify(calls3.map((c) => c.text.slice(0, 60))));
  check("B: berhasil menyusun kuis", !!bQuiz);
  check("B: mencapai jumlah yang diminta (12)", bCount === 12, `${bCount}`);

  // Cleanup — remove every Quiz row created by this test, restore session.
  const quizzesAfter = await prisma.quiz.count({ where: { studentId: student.id } });
  const created = quizzesAfter - quizzesBefore;
  if (created > 0) {
    // Newest first: the assembled rows are the most recent.
    const newest = await prisma.quiz.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      take: created,
      select: { id: true },
    });
    await prisma.quiz.deleteMany({ where: { id: { in: newest.map((q) => q.id) } } });
  }
  if (sessionBefore) {
    await prisma.sessionState.update({
      where: { studentId: student.id },
      data: { currentMode: sessionBefore.currentMode, context: sessionBefore.context as never },
    });
  } else {
    await prisma.sessionState.deleteMany({ where: { studentId: student.id } });
  }
  console.log(`\n🧹 dibersihkan: ${created} kuis uji dihapus, session dipulihkan`);

  console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error("❌ Test crashed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
