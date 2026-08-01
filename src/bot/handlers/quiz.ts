import type { Context } from "telegraf";
import type { Student, Quiz } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPersona } from "../personas";
import type { BotSession } from "../session";
import { setSession, clearSession, getSession } from "../session";
import { handleActivity } from "@/lib/gamification";
import { addToReviewQueue } from "@/lib/spaced-repetition";
import { gradeAttempt } from "@/agents/assessment/grader";

/** Callback data prefix for quiz answer buttons. */
export const QUIZ_ANS_PREFIX = "quiz:ans:";
export const QUIZ_EXIT_PREFIX = "quiz:exit";
/** Minutes a quiz session stays alive without input. */
const QUIZ_TIMEOUT_MIN = 10;

interface QuizQuestion {
  question: string;
  options?: string[];
  correctAnswer?: string;
  correctIndex?: number;
  explanation?: string;
}

/**
 * /quiz — find due quizzes for the student, pick one, start quiz session.
 */
export async function handleQuizStart(
  ctx: Context,
  student: Student,
): Promise<void> {
  const persona = getPersona(student.persona);

  // Pick a quiz — prefer one not yet mastered (recent quiz order), else oldest
  const quiz = await prisma.quiz.findFirst({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    include: { material: true },
  });

  if (!quiz) {
    await ctx.reply(
      `${persona.emoji} Wah, belum ada kuis untuk kamu nih, ${student.name}! ` +
        `Coba /materi dulu ya 📚`,
    );
    return;
  }

  // Start quiz session with timeout tracking
  await setSession(student.id, {
    currentMode: "quiz_active",
    context: {
      quizId: quiz.id,
      currentIndex: 0,
      answers: [],
      startedAt: Date.now(),
    },
  });

  await sendQuestion(ctx, quiz, 0);
}

/**
 * Handle a quiz-answer message when state is quiz_active.
 * Accepts: text answer (typed), or "keluar"/"batal" to exit.
 */
export async function handleQuizAnswer(
  ctx: Context,
  session: BotSession,
  student: Student,
): Promise<void> {
  const ctxData = session.context as {
    quizId: string;
    currentIndex: number;
    answers: { questionIndex: number; selectedIndex: number }[];
    startedAt?: number;
  };

  // Timeout check
  if (ctxData.startedAt && Date.now() - ctxData.startedAt > QUIZ_TIMEOUT_MIN * 60_000) {
    await clearSession(student.id);
    await ctx.reply("⏰ Waktu kuis habis (10 menit tanpa jawaban). Ketik /quiz kalau mau lanjut lagi ya! 😊");
    return;
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: ctxData.quizId },
    include: { material: true },
  });

  if (!quiz) {
    await ctx.reply("Wah, kuisnya nggak ditemukan. Coba /quiz lagi ya.");
    await clearSession(student.id);
    return;
  }

  const questions = (quiz.questions as unknown as QuizQuestion[]) ?? [];

  // Cancel commands
  const raw = ctx.message && "text" in ctx.message ? ctx.message.text ?? "" : "";
  const trimmed = raw.trim().toLowerCase();
  if (/^(keluar|batal|stop|quit|cancel)$/i.test(trimmed) || trimmed === "/cancel") {
    await clearSession(student.id);
    await ctx.reply("👋 Kuis dibatalkan. Ketik /quiz kapan pun mau lanjut ya!");
    return;
  }
  // Restart quiz mid-session
  if (/^\/(quiz|kuis)$/i.test(trimmed)) {
    await clearSession(student.id);
    await handleQuizStart(ctx, student);
    return;
  }

  // Ignore non-text (photos, stickers, etc.) during quiz
  if (!("text" in ctx.message!)) {
    await ctx.reply("📝 Ketik jawabanmu ya, atau pakai tombol pilihan di atas!");
    return;
  }

  const currentIdx = ctxData.currentIndex;
  const q = questions[currentIdx];
  if (!q) {
    await finishQuiz(ctx, student, quiz, questions, ctxData.answers);
    return;
  }

  // Resolve typed answer → option index (robust matching)
  const selectedIndex = matchAnswerToIndex(q, trimmed);
  if (selectedIndex === -1) {
    await ctx.reply(
      "🤔 Hmm, jawabanmu nggak ketemu di pilihan. Ketik nomor (misal: `2`), huruf (`b`), atau teks pilihan yang tersedia ya!",
      { parse_mode: "Markdown" },
    );
    return;
  }

  await recordAnswer(ctx, student, quiz, ctxData, currentIdx, selectedIndex);
}

/**
 * Handle an inline keyboard button press: quiz:ans:<qIdx>:<optIdx> or quiz:exit.
 */
export async function handleQuizCallback(
  ctx: Context,
  student: Student,
): Promise<boolean> {
  if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return false;
  const data = ctx.callbackQuery.data;

  if (data.startsWith(QUIZ_EXIT_PREFIX)) {
    await clearSession(student.id);
    await ctx.answerCbQuery("Kuis dibatalkan 👋");
    await ctx.reply("👋 Kuis dibatalkan. Ketik /quiz kapan pun mau lanjut ya!");
    return true;
  }

  if (!data.startsWith(QUIZ_ANS_PREFIX)) return false;

  const parts = data.split(":");
  // quiz:ans:<qIdx>:<optIdx>
  const qIdx = parseInt(parts[2] ?? "", 10);
  const optIdx = parseInt(parts[3] ?? "", 10);
  if (Number.isNaN(qIdx) || Number.isNaN(optIdx)) return false;

  const session = await getSession(student.id);
  const ctxData = session.context as {
    quizId: string;
    currentIndex: number;
    answers: { questionIndex: number; selectedIndex: number }[];
    startedAt?: number;
  };

  // Stale callback — session not in quiz
  if (session.currentMode !== "quiz_active" || !ctxData.quizId) {
    await ctx.answerCbQuery("Sesi kuis sudah berakhir. Ketik /quiz untuk mulai baru ya!");
    return true;
  }

  // Stale answer — from an older question (e.g. user tapped twice quickly)
  if (qIdx !== ctxData.currentIndex) {
    await ctx.answerCbQuery(
      qIdx < ctxData.currentIndex ? "Soal ini sudah dijawab ✅" : "Belum sampai soal ini ya!",
    );
    return true;
  }

  // Already answered this question?
  if (ctxData.answers.some((a) => a.questionIndex === qIdx)) {
    await ctx.answerCbQuery("Soal ini sudah dijawab ✅");
    return true;
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: ctxData.quizId },
    include: { material: true },
  });
  if (!quiz) {
    await ctx.answerCbQuery("Kuis tidak ditemukan");
    await clearSession(student.id);
    return true;
  }

  await recordAnswer(ctx, student, quiz, ctxData, qIdx, optIdx);
  return true;
}

/**
 * Record an answer, show immediate per-question feedback, then move on.
 */
async function recordAnswer(
  ctx: Context,
  student: Student,
  quiz: Quiz & { material?: unknown },
  ctxData: {
    quizId: string;
    currentIndex: number;
    answers: { questionIndex: number; selectedIndex: number }[];
    startedAt?: number;
  },
  questionIndex: number,
  selectedIndex: number,
): Promise<void> {
  const questions = (quiz.questions as unknown as QuizQuestion[]) ?? [];
  const q = questions[questionIndex];
  if (!q) return;

  // Persist answer
  ctxData.answers.push({ questionIndex, selectedIndex });
  const isCorrect = selectedIndex === q.correctIndex;
  const correctText = q.options?.[q.correctIndex ?? -1] ?? q.correctAnswer ?? "?";

  // Immediate per-question feedback
  let feedback = isCorrect
    ? `✅ *Benar!*`
    : `❌ *Kurang tepat* — jawaban benar: *${correctText}*`;
  if (q.explanation) feedback += `\n💡 ${q.explanation}`;

  await ctx.answerCbQuery(isCorrect ? "✅ Benar!" : "❌ Kurang tepat").catch(() => {});
  await ctx.reply(feedback, { parse_mode: "Markdown" }).catch(() => {});

  // Advance
  const nextIdx = questionIndex + 1;
  if (nextIdx < questions.length) {
    await setSession(student.id, {
      currentMode: "quiz_active",
      context: { ...ctxData, currentIndex: nextIdx },
    });
    await sendQuestion(ctx, quiz, nextIdx);
  } else {
    await finishQuiz(ctx, student, quiz, questions, ctxData.answers);
  }
}

/**
 * Render a question with inline answer buttons (when options exist).
 */
async function sendQuestion(ctx: Context, quiz: Quiz, index: number): Promise<void> {
  const questions = (quiz.questions as unknown as QuizQuestion[]) ?? [];
  const q = questions[index];
  if (!q) return;

  let text = `📝 *Soal ${index + 1} dari ${questions.length}*\n\n${q.question}`;

  const keyboard: { text: string; callback_data: string }[][] = [];
  if (q.options && q.options.length > 0) {
    q.options.forEach((opt, i) => {
      keyboard.push([
        {
          text: `${i + 1}. ${opt}`,
          callback_data: `${QUIZ_ANS_PREFIX}${index}:${i}`,
        },
      ]);
    });
  } else {
    text += "\n\nKetik jawabanmu ya! 🤗";
  }

  keyboard.push([{ text: "🚪 Keluar", callback_data: QUIZ_EXIT_PREFIX }]);

  await ctx.reply(text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard },
  });
}

/**
 * Match a typed answer to an option index.
 * Accepts: "2", "b", "B.", "2.", full option text, case-insensitive.
 */
function matchAnswerToIndex(q: QuizQuestion, raw: string): number {
  if (!q.options || q.options.length === 0) {
    // Free-text question — no options; match against correctAnswer if present
    if (q.correctAnswer) {
      return raw.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase() ? 0 : -1;
    }
    return raw.trim() !== "" ? 0 : -1;
  }

  const t = raw.trim().toLowerCase();
  if (!t) return -1;

  // Numeric "2" / "2." / "2)" → index 1
  const numMatch = t.match(/^(\d+)[.)]?$/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n >= 1 && n <= q.options.length) return n - 1;
    return -1;
  }

  // Letter "b" / "b." / "b)" → index 1
  const letterMatch = t.match(/^([a-z])[.)]?$/);
  if (letterMatch) {
    const c = letterMatch[1].charCodeAt(0) - 97;
    if (c >= 0 && c < q.options.length) return c;
    return -1;
  }

  // Full text match (case-insensitive, trimmed)
  const fullIdx = q.options.findIndex((o) => o.trim().toLowerCase() === t);
  if (fullIdx >= 0) return fullIdx;

  // Partial contains match — but only when unambiguous
  const containsIdx = q.options.filter((o) =>
    o.trim().toLowerCase().includes(t),
  );
  if (containsIdx.length === 1) {
    return q.options.findIndex((o) => o.trim().toLowerCase().includes(t));
  }

  return -1;
}

/**
 * Grade the quiz using the server-side grader (same as the web app),
 * persist the attempt, award XP/badges, queue wrong answers for review.
 */
async function finishQuiz(
  ctx: Context,
  student: Student,
  quiz: Quiz & { material?: unknown },
  questions: QuizQuestion[],
  answers: { questionIndex: number; selectedIndex: number }[],
): Promise<void> {
  const persona = getPersona(student.persona);

  // Grade server-side (persists Attempt + ProgressSnap)
  let grade: Awaited<ReturnType<typeof gradeAttempt>> | null = null;
  try {
    grade = await gradeAttempt({
      quizId: quiz.id,
      studentId: student.id,
      answers: answers.map((a) => ({
        questionIndex: a.questionIndex,
        selectedIndex: a.selectedIndex,
      })),
    });
    console.log("[quiz] Attempt saved (server grader):", quiz.id, grade.score, "/", grade.maxScore);
  } catch (dbErr) {
    console.error("[quiz] gradeAttempt failed:", dbErr);
  }

  if (!grade) {
    await clearSession(student.id);
    await ctx.reply("😅 Gagal menyimpan hasil kuis. Coba /quiz lagi ya!");
    return;
  }

  const score = grade.score;
  const maxScore = grade.maxScore;
  const mastery = maxScore > 0 ? (score / maxScore) * 100 : 0;

  // Gamification: award XP, update streak, check badges
  await handleActivity({
    studentId: student.id,
    materialId: quiz.materialId ?? undefined,
    type: "quiz_complete",
    metadata: { score, maxScore, subject: (quiz as any).material?.subject },
  }).catch((err) => console.warn("[quiz] handleActivity error:", err));

  // Spaced repetition: add wrong answers to review queue
  for (const a of answers) {
    const q = questions[a.questionIndex];
    if (!q) continue;
    const isCorrect = a.selectedIndex === q.correctIndex;
    if (!isCorrect) {
      await addToReviewQueue(
        student.id,
        quiz.id,
        a.questionIndex,
        (quiz.material as any)?.subject ?? "",
        undefined,
      ).catch((err) => console.warn("[quiz] addToReviewQueue error:", err));
    }
  }

  // Reset session
  await clearSession(student.id);
  console.log("[quiz] Session cleared");

  // Build per-question feedback
  const feedbackLines: string[] = [];
  for (const a of answers) {
    const q = questions[a.questionIndex];
    if (!q) continue;
    const isCorrect = a.selectedIndex === q.correctIndex;
    if (isCorrect) {
      feedbackLines.push(`✅ Soal ${a.questionIndex + 1}: ${q.question.slice(0, 60)}…`);
    } else {
      const correctText = q.options?.[q.correctIndex ?? -1] ?? q.correctAnswer ?? "?";
      const yourText = q.options?.[a.selectedIndex] ?? "?";
      feedbackLines.push(
        `❌ Soal ${a.questionIndex + 1}: ${q.question.slice(0, 80)}…\n` +
        `   Jawabanmu: *${yourText}* | Jawaban benar: *${correctText}*\n` +
        `   💡 ${q.explanation ?? "Coba baca materinya lagi ya!"}`,
      );
    }
  }

  const gradeEmoji = mastery >= 80 ? "🌟" : mastery >= 60 ? "👍" : "💪";

  const resultText =
    `${persona.emoji} *Selesai!* ${gradeEmoji}\n\n` +
    `Skor kamu: *${score}/${maxScore}* (${Math.round(mastery)}%)\n\n` +
    feedbackLines.join("\n\n") +
    "\n\n" +
    (mastery >= 80
      ? "Keren banget! Kamu udah paham banget! 🎉"
      : mastery >= 60
        ? "Lumayan! Ayo belajar lagi biar makin jago!"
        : "Semangat! Coba ulang lagi biar makin paham! 🔥") +
    "\n\nAda yang mau ditanyakan? 😊";

  try {
    await ctx.reply(resultText, { parse_mode: "Markdown" });
    console.log("[quiz] Result sent");
  } catch (replyErr) {
    console.error("[quiz] Failed to send result:", replyErr);
  }
}
