import type { Context } from "telegraf";
import type { Student, Quiz } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPersona } from "../personas";
import type { BotSession } from "../session";
import { setSession, clearSession } from "../session";

/**
 * /quiz — fetch next available quiz, send first question.
 */
export async function handleQuizStart(
  ctx: Context,
  student: Student,
): Promise<void> {
  const persona = getPersona(student.persona);

  // Find the first quiz for this student that still has attempts
  const quiz = await prisma.quiz.findFirst({
    where: { studentId: student.id },
    orderBy: { createdAt: "asc" },
    include: { material: true },
  });

  if (!quiz) {
    await ctx.reply(
      `${persona.emoji} Wah, belum ada kuis untuk kamu nih, ${student.name}! ` +
        `Coba /materi dulu ya 📚`,
    );
    return;
  }

  // Start quiz session
  await setSession(student.id, {
    currentMode: "quiz_active",
    context: {
      quizId: quiz.id,
      currentIndex: 0,
      answers: [],
    },
  });

  await sendQuestion(ctx, quiz, 0);
}

/**
 * Handle a quiz-answer message when state is quiz_active.
 */
export async function handleQuizAnswer(
  ctx: Context,
  session: BotSession,
  student: Student,
): Promise<void> {
  const ctxData = session.context as {
    quizId: string;
    currentIndex: number;
    answers: { questionIndex: number; answer: string }[];
  };

  const quiz = await prisma.quiz.findUnique({
    where: { id: ctxData.quizId },
  });

  if (!quiz) {
    await ctx.reply("Wah, kuisnya nggak ditemukan. Coba /quiz lagi ya.");
    await clearSession(student.id);
    return;
  }

  const questions = quiz.questions as Array<{
    question: string;
    options?: string[];
    correctAnswer: string;
  }>;
  const currentIdx = ctxData.currentIndex;
  const userAnswer = ctx.message && "text" in ctx.message ? ctx.message.text : "";

  // Record answer
  ctxData.answers.push({
    questionIndex: currentIdx,
    answer: userAnswer,
  });

  // Next question or finish
  const nextIdx = currentIdx + 1;
  if (nextIdx < questions.length) {
    await setSession(student.id, {
      currentMode: "quiz_active",
      context: {
        ...ctxData,
        currentIndex: nextIdx,
      },
    });
    await sendQuestion(ctx, quiz, nextIdx);
  } else {
    // All questions answered — calculate score
    await finishQuiz(ctx, student, quiz, questions, ctxData.answers);
  }
}

async function sendQuestion(ctx: Context, quiz: Quiz, index: number): Promise<void> {
  const questions = quiz.questions as Array<{
    question: string;
    options?: string[];
    correctAnswer: string;
  }>;
  const q = questions[index];

  if (!q) return;

  let text = `📝 *Soal ${index + 1} dari ${questions.length}*\n\n${q.question}`;

  if (q.options && q.options.length > 0) {
    text += "\n\n" + q.options.map((o, i) => `${i + 1}. ${o}`).join("\n");
  }

  text += "\n\nKetik jawabanmu ya! 🤗";

  await ctx.reply(text, { parse_mode: "Markdown" });
}

async function finishQuiz(
  ctx: Context,
  student: Student,
  quiz: Quiz,
  questions: Array<{ question: string; options?: string[]; correctAnswer: string }>,
  answers: { questionIndex: number; answer: string }[],
): Promise<void> {
  const persona = getPersona(student.persona);
  let score = 0;

  for (const a of answers) {
    const q = questions[a.questionIndex];
    if (q && a.answer?.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase()) {
      score++;
    }
  }

  const maxScore = questions.length;
  const mastery = maxScore > 0 ? (score / maxScore) * 100 : 0;

  // Save attempt to DB
  try {
    await prisma.attempt.create({
      data: {
        quizId: quiz.id,
        studentId: student.id,
        type: quiz.type,
        answers,
        score,
        maxScore,
        masteryAfter: mastery,
      },
    });
    console.log("[quiz] Attempt saved:", quiz.id, score, "/", maxScore);
  } catch (dbErr) {
    console.error("[quiz] Failed to save attempt:", dbErr);
  }

  // Reset session
  await clearSession(student.id);
  console.log("[quiz] Session cleared");

  const gradeEmoji = mastery >= 80 ? "🌟" : mastery >= 60 ? "👍" : "💪";

  const resultText =
    `${persona.emoji} *Selesai!* ${gradeEmoji}\n\n` +
    `Skor kamu: *${score}/${maxScore}* (${Math.round(mastery)}%)\n\n` +
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
