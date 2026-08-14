import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { BotSession } from "./session";
import {
  handleQuizAnswer,
  handleQuizCallback,
  handleSubjectCallback,
  handleQuizPick,
  QUIZ_ANS_PREFIX,
  QUIZ_EXIT_PREFIX,
  QUIZ_SUBJECT_PREFIX,
  QUIZ_PICK_PREFIX,
} from "./handlers/quiz";
import { handlePhoto } from "./handlers/vision";
import {
  handleOnboardingMessage,
  handleOnboardingCallback,
} from "./handlers/onboarding";

/**
 * Route an incoming message based on the current session state.
 * Called ONCE per message, before the main intent detection.
 */
export async function routeByState(
  ctx: Context,
  session: BotSession,
  student: Student,
): Promise<boolean> {
  const msg = ctx.message;
  if (!msg) return false;

  // Quiz active — message IS a quiz answer
  if (
    session.currentMode === "quiz_active" ||
    session.currentMode === "waiting_quiz_answer"
  ) {
    await handleQuizAnswer(ctx, session, student);
    return true;
  }

  // Vision pending — a photo was just sent, handled by vision handler
  if (session.currentMode === "vision_pending") {
    // Clear the pending state and let the main handler process
    return false;
  }

  // Photo message — route to vision handler
  if ("photo" in msg) {
    await handlePhoto(ctx, student);
    return true;
  }

  return false; // not handled by state machine, fall through to intent detection
}

/**
 * Route callback queries (inline keyboard buttons).
 */
export async function routeCallback(
  ctx: Context,
): Promise<boolean> {
  if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return false;

  const data = ctx.callbackQuery.data;

  // Quiz answer/exit callbacks
  if (
    data.startsWith(QUIZ_ANS_PREFIX) ||
    data.startsWith(QUIZ_EXIT_PREFIX)
  ) {
    const student = await findStudentByTelegramId(ctx);
    if (!student) {
      await ctx.answerCbQuery("Sesi tidak ditemukan. Ketik /start ya!").catch(() => {});
      return true;
    }
    return await handleQuizCallback(ctx, student);
  }

  // Subject picker callbacks
  if (data.startsWith(QUIZ_SUBJECT_PREFIX)) {
    const student = await findStudentByTelegramId(ctx);
    if (!student) {
      await ctx.answerCbQuery("Sesi tidak ditemukan.").catch(() => {});
      return true;
    }
    const subject = data.slice(QUIZ_SUBJECT_PREFIX.length);
    return await handleSubjectCallback(ctx, student, subject);
  }

  // Quiz pick callbacks
  if (data.startsWith(QUIZ_PICK_PREFIX)) {
    const student = await findStudentByTelegramId(ctx);
    if (!student) {
      await ctx.answerCbQuery("Sesi tidak ditemukan.").catch(() => {});
      return true;
    }
    const quizId = data.slice(QUIZ_PICK_PREFIX.length);
    return await handleQuizPick(ctx, student, quizId);
  }

  // Back to subject list
  if (data === "quiz:back:subjects") {
    const student = await findStudentByTelegramId(ctx);
    if (!student) return true;
    // Re-send the subject picker by calling handleQuizStart
    const { handleQuizStart } = await import("./handlers/quiz");
    await handleQuizStart(ctx as any, student);
    return true;
  }

  // Onboarding callbacks
  if (data.startsWith("onboard_") || data.startsWith("approve:") || data.startsWith("reject:")) {
    return await handleOnboardingCallback(ctx);
  }

  // Weekly exam schedule callbacks
  if (data.startsWith("wexam:")) {
    const student = await findStudentByTelegramId(ctx);
    if (!student) {
      await ctx.answerCbQuery("Sesi tidak ditemukan. Ketik /start ya!").catch(() => {});
      return true;
    }
    const { handleWeeklyExamCallback } = await import("./handlers/weekly-exam");
    return await handleWeeklyExamCallback(ctx, student);
  }

  return false;
}

/** Resolve the student behind a callback query (message sender or inline message). */
async function findStudentByTelegramId(ctx: Context): Promise<Student | null> {
  const from = ctx.callbackQuery?.from;
  if (!from) return null;
  try {
    return await prisma.student.findUnique({
      where: { telegramId: String(from.id) },
    });
  } catch (err) {
    console.error("[state-machine] findStudentByTelegramId error:", err);
    return null;
  }
}
