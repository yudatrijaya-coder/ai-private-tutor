/**
 * Verify the quiz-ANSWER paths now land in ChatLog.
 *
 * Background: only the tutor LLM wrote ChatLog. The quiz *request* paths are
 * covered by message.ts (runQuizFlow), but the two paths a student actually
 * spends a quiz on go through state-machine.ts:
 *
 *   • routeCallback  — tapping an answer / redo / explain button (quiz:ans:…)
 *   • routeByState   — typing the answer while the session is quiz_active
 *
 * Both answer without the LLM, so a student's whole quiz attempt left no trace
 * in the dashboard history. This test drives the REAL router functions against
 * a THROWAWAY student that is deleted afterwards.
 *
 * Run: npx tsx scripts/test-chat-log-answers.ts
 */
import { prisma } from "../src/lib/prisma";
import { routeCallback, routeByState } from "../src/bot/state-machine";
import { describeQuizCallback } from "../src/bot/chat-log";
import { getSession, setSession } from "../src/bot/session";

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

const TMP_KEY = `E2EANSLOG${Date.now()}`;
const settle = () => new Promise((r) => setTimeout(r, 400));

async function main() {
  // ── 0. Unit: describeQuizCallback ──
  console.log("\n── 0. describeQuizCallback ──");
  check(
    "quiz:ans:1:2 → Jawaban C (soal 2)",
    describeQuizCallback("quiz:ans:1:2") === "Jawaban: C (soal 2)",
    describeQuizCallback("quiz:ans:1:2") ?? "null",
  );
  check("quiz:ans:0:0 → Jawaban A (soal 1)", describeQuizCallback("quiz:ans:0:0") === "Jawaban: A (soal 1)");
  check("quiz:exit dikenali", describeQuizCallback("quiz:exit") === "Keluar dari kuis");
  check(
    "quiz:redo:…:hard dikenali",
    describeQuizCallback("quiz:redo:abc:hard") === "Ulang kuis (versi lebih sulit)",
  );
  check("quiz:explain dikenali", describeQuizCallback("quiz:explain:abc") === "Minta penjelasan topik");
  check("bukan callback kuis → null", describeQuizCallback("onboard_x") === null);

  const student = await prisma.student.create({
    data: {
      studentId: TMP_KEY,
      name: "Murid Uji Jawaban",
      gradeLevel: "SD_5",
      status: "ACTIVE",
      telegramId: `9${Date.now()}`,
    },
  });

  try {
    console.log(`\nMurid uji: ${student.studentId} (${student.id})\n`);

    // ── 1. routeCallback mencatat penekanan tombol ──
    console.log("── 1. routeCallback: jawaban via tombol ──");
    const ctx: any = {
      callbackQuery: { data: "quiz:exit", from: { id: Number(student.telegramId) } },
      reply: async () => ({ message_id: 1 }),
      answerCbQuery: async () => true,
      editMessageText: async () => true,
    };
    const handled = await routeCallback(ctx);
    await settle();

    check("routeCallback menangani quiz:exit", handled === true);
    const cbRow = await prisma.chatLog.findFirst({
      where: { studentId: student.id, role: "user" },
      orderBy: { createdAt: "desc" },
    });
    check("penekanan tombol tercatat sebagai giliran murid", !!cbRow);
    check("isinya label manusiawi", cbRow?.content === "Keluar dari kuis", cbRow?.content);
    check("metadata intent=quiz_callback", (cbRow?.metadata as any)?.intent === "quiz_callback");

    const botRow = await prisma.chatLog.findFirst({
      where: { studentId: student.id, role: "assistant" },
      orderBy: { createdAt: "desc" },
    });
    check("balasan bot tercatat", !!botRow, botRow?.content?.slice(0, 40));
    check("balasan bot isinya benar", !!botRow && /Kuis dibatalkan/i.test(botRow.content));

    // ── 2. routeByState mencatat jawaban yang DIKETIK ──
    console.log("\n── 2. routeByState: jawaban diketik saat kuis aktif ──");
    // Put the student into quiz_active so routeByState treats the text as an answer.
    await setSession(student.id, {
      currentMode: "quiz_active",
      context: {
        quizId: "00000000-0000-0000-0000-000000000000", // not found → graceful reply
        answers: [],
        order: [],
        currentIndex: 0,
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
      } as any,
    });
    const session = await getSession(student.id);

    const ctx2: any = {
      message: { text: "b" },
      reply: async () => ({ message_id: 2 }),
    };
    const handled2 = await routeByState(ctx2, session, student as any);
    await settle();

    check("routeByState menangani jawaban ketikan", handled2 === true);
    const typedRow = await prisma.chatLog.findFirst({
      where: { studentId: student.id, role: "user", content: "b" },
      orderBy: { createdAt: "desc" },
    });
    check("jawaban ketikan tercatat", !!typedRow);
    check("metadata intent=quiz_answer", (typedRow?.metadata as any)?.intent === "quiz_answer");

    const botRow2 = await prisma.chatLog.findFirst({
      where: { studentId: student.id, role: "assistant" },
      orderBy: { createdAt: "desc" },
    });
    check(
      "balasan bot untuk kuis tak ditemukan tercatat",
      !!botRow2 && /nggak ditemukan/i.test(botRow2.content),
      botRow2?.content?.slice(0, 50),
    );

    // ── 3. Tidak dobel-catat ──
    console.log("\n── 3. Tidak dobel-catat ──");
    const userCount = await prisma.chatLog.count({
      where: { studentId: student.id, role: "user", content: "b" },
    });
    check("jawaban 'b' tercatat tepat sekali", userCount === 1, `count=${userCount}`);
  } finally {
    await prisma.chatLog.deleteMany({ where: { studentId: student.id } });
    await prisma.sessionState.deleteMany({ where: { studentId: student.id } });
    await prisma.student.delete({ where: { id: student.id } });
    console.log("\n🧹 Murid uji + ChatLog + session terhapus bersih");
  }

  console.log(
    `\n${fail === 0 ? "✅ ALL PASS" : "❌ ADA YANG GAGAL"} — ${pass} passed, ${fail} failed\n`,
  );
  process.exit(fail === 0 ? 0 : 1);
}

void main();
