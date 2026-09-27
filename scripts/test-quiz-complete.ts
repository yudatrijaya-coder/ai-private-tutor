/**
 * Full end-to-end quiz completion, on a THROWAWAY student.
 *
 * Drives the real handlers through a complete quiz (start → pick → answer every
 * question → finishQuiz) and asserts the three things the production bug hid:
 *   1. answers typed as A/B/C/D are accepted (matchAnswerToIndex),
 *   2. the result carries a proactive LLM evaluation,
 *   3. the follow-up buttons (redo / harder / explain / other subject) are wired.
 *
 * Creates its own Student + Material + Quiz with a deterministic fixture, then
 * deletes every row it created — including Attempt/ReviewQueue cascades. It
 * never touches a real student's data.
 *
 * Run: npx tsx scripts/test-quiz-complete.ts
 */
import { prisma } from "../src/lib/prisma";
import {
  handleQuizPick,
  handleQuizAnswer,
  handleQuizCallback,
} from "../src/bot/handlers/quiz";

const MARK = `E2E-${Date.now()}`;

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

interface Call {
  kind: string;
  text: string;
  keyboard?: { text: string; callback_data: string }[][];
  parseMode?: string;
}
function makeMockCtx(calls: Call[], withCallback = false) {
  const ctx: any = {
    reply: async (text: string, extra?: any) => {
      calls.push({
        kind: "reply",
        text,
        keyboard: extra?.reply_markup?.inline_keyboard,
        parseMode: extra?.parse_mode,
      });
      return { message_id: calls.length };
    },
    answerCbQuery: async () => {
      calls.push({ kind: "answerCbQuery", text: "" });
      return true;
    },
    editMessageText: async (text: string, extra?: any) => {
      calls.push({ kind: "editMessageText", text, keyboard: extra?.reply_markup?.inline_keyboard });
      return true;
    },
    telegram: { sendMessage: async () => ({ message_id: 1 }) },
  };
  if (withCallback) ctx.callbackQuery = {};
  return ctx;
}

async function cleanup(studentId: string, materialId: string, quizId: string) {
  // Order matters: children before parents.
  await prisma.attempt.deleteMany({ where: { quizId } }).catch(() => {});
  await prisma.reviewQueue.deleteMany({ where: { quizId } }).catch(() => {});
  await prisma.quiz.deleteMany({ where: { id: quizId } }).catch(() => {});
  await prisma.material.deleteMany({ where: { id: materialId } }).catch(() => {});
  await prisma.sessionState.deleteMany({ where: { studentId } }).catch(() => {});
  await prisma.student.deleteMany({ where: { id: studentId } }).catch(() => {});
}

async function main() {
  // ── Fixture: 4 questions, all option-based ──
  const questions = [
    { question: `${MARK} Berapa 2+2?`, options: ["3", "4", "5", "6"], correctIndex: 1, explanation: "2+2=4", difficulty: "easy" },
    { question: `${MARK} Ibu kota Indonesia?`, options: ["Bandung", "Jakarta", "Surabaya", "Medan"], correctIndex: 1, explanation: "Jakarta", difficulty: "hard" },
    { question: `${MARK} Air membeku pada?`, options: ["0°C", "100°C", "50°C", "25°C"], correctIndex: 0, explanation: "0 derajat", difficulty: "medium" },
    { question: `${MARK} Lambang oksigen?`, options: ["O", "H", "C", "N"], correctIndex: 0, explanation: "O", difficulty: "hard" },
  ];

  const student = await prisma.student.create({
    data: {
      studentId: MARK,
      name: "Murid Uji E2E",
      telegramId: MARK, // unique, never a real chat id
      gradeLevel: "SD_5",
      persona: "KAK_DEWI",
      status: "ACTIVE",
    },
  });

  const curriculum = await prisma.curriculum.findFirst({ select: { id: true } });
  if (!curriculum) throw new Error("tidak ada Curriculum untuk FK");

  const material = await prisma.material.create({
    data: {
      curriculumId: curriculum.id,
      topic: `${MARK} Topik Uji`,
      subject: "Matematika",
      gradeLevel: "SD_5",
      weekOrder: 1,
      status: "READY",
    },
  });

  const quiz = await prisma.quiz.create({
    data: {
      materialId: material.id,
      studentId: student.id,
      type: "QUIZ",
      questions: questions as any,
      maxScore: questions.length,
    },
  });

  console.log(`\nFixture: student=${student.id} quiz=${quiz.id} (${questions.length} soal)\n`);

  try {
    // ── 1. Mulai kuis: soal 1 tampil, satu per satu ──
    console.log("── 1. Mulai kuis ──");
    {
      const calls: Call[] = [];
      const ctx = makeMockCtx(calls);
      await handleQuizPick(ctx, student, quiz.id);
      const q = calls.find((c) => /Soal 1 dari/.test(c.text));
      check("soal 1 dari 4 terkirim", !!q && q.text.includes("Soal 1 dari 4"), q?.text?.slice(0, 60));
      check("hanya satu soal tampil", calls.filter((c) => /Soal \d+ dari/.test(c.text)).length === 1);
      const ans = (q?.keyboard ?? []).filter((r) => r[0]?.callback_data?.startsWith("quiz:ans:"));
      check("4 tombol jawaban", ans.length === 4, `n=${ans.length}`);
    }

    // ── 2. Jawab dengan MENGETIK huruf A/B/C/D (cara murid selama ini) ──
    console.log("\n── 2. Jawab dengan mengetik huruf (A/B/C/D) ──");
    {
      // Q1 benar (B=index1), Q2 salah (A), Q3 benar (A), Q4 benar (O=A)
      const typed = ["B", "a", "A", "a"];
      const allCalls: Call[] = [];
      for (const letter of typed) {
        const calls: Call[] = [];
        const ctx = makeMockCtx(calls);
        (ctx as any).message = { text: letter };
        await handleQuizAnswer(ctx, await prisma.sessionState.findUnique({ where: { studentId: student.id } }) as any, student);
        allCalls.push(...calls);
      }
      const feedback = allCalls.filter((c) => /✅|❌/.test(c.text));
      check("setiap ketikan menghasilkan umpan balik", feedback.length >= 3, `n=${feedback.length}`);
      const result = allCalls.find((c) => /Selesai!/.test(c.text));
      check("kuis selesai setelah soal terakhir", !!result, JSON.stringify(allCalls.map((c) => c.text?.slice(0, 30))));
      check("skor dihitung (3/4)", !!result && /3\/4/.test(result.text), result?.text?.slice(0, 80));
      if (result) console.log(`     ${result.text.split("\n").filter(Boolean).slice(0, 3).join(" | ")}`);

      // ── 3. Evaluasi proaktif + tombol tindak lanjut ──
      console.log("\n── 3. Evaluasi proaktif & tombol lanjutan ──");
      const evalMsg = allCalls.find(
        (c) => c.kind === "reply" && !/Selesai!/.test(c.text) && !/Soal \d+/.test(c.text) && !/✅|❌/.test(c.text) && c.text.length > 30,
      );
      check("ada pesan evaluasi proaktif dari LLM", !!evalMsg, "tidak ditemukan");
      if (evalMsg) console.log(`     evaluasi: ${evalMsg.text.replace(/\n/g, " ").slice(0, 120)}…`);

      const followUp = allCalls.find((c) => c.keyboard?.some((r) => r.some((b) => b.callback_data.startsWith("quiz:redo:"))));
      check("tombol tindak lanjut terkirim", !!followUp);
      const flat = (followUp?.keyboard ?? []).flat().map((b) => b.callback_data);
      check("ada tombol 🔁 ulang", flat.some((d) => /^quiz:redo:[^:]+$/.test(d)), JSON.stringify(flat));
      check("ada tombol 💪 lebih sulit", flat.some((d) => d.endsWith(":hard")), JSON.stringify(flat));
      check("ada tombol 💡 jelaskan", flat.some((d) => d.startsWith("quiz:explain:")), JSON.stringify(flat));
      check("ada tombol 📚 pilih mapel lain", flat.includes("quiz:back:subjects"), JSON.stringify(flat));
    }

    // ── 4. Attempt tersimpan dengan skor benar ──
    console.log("\n── 4. Attempt tersimpan ──");
    {
      const attempt = await prisma.attempt.findFirst({ where: { quizId: quiz.id } });
      check("Attempt dibuat", !!attempt);
      check("skor attempt = 3", attempt?.score === 3, `score=${attempt?.score}`);
      const answers = (attempt?.answers as any[]) ?? [];
      check("4 jawaban tersimpan", answers.length === 4, `n=${answers.length}`);
    }
  } finally {
    await cleanup(student.id, material.id, quiz.id);
    const leftover = await prisma.student.findUnique({ where: { id: student.id } });
    console.log(`\n🧹 Cleanup: murid uji ${leftover ? "MASIH ADA (gagal!)" : "terhapus bersih"}`);
    if (leftover) fail++;
  }

  console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("FATAL:", e);
  await prisma.$disconnect();
  process.exit(1);
});
