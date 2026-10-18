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
  QUIZ_REDO_PREFIX,
  QUIZ_EXPLAIN_PREFIX,
} from "./handlers/quiz";
import { handlePhoto } from "./handlers/vision";
import {
  handleOnboardingMessage,
  handleOnboardingCallback,
} from "./handlers/onboarding";
import { handleExtensionRequest } from "./handlers/extension";
import { logChat, mirrorRepliesToChatLog, describeQuizCallback } from "./chat-log";

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
    // Speed Math session takes precedence — free-text numeric answer
    const sm = (session.context as any)?.speedmath;
    if (sm?.active) {
      const msgText = "text" in msg ? (msg.text?.trim() ?? "") : "";
      const smHandled = await (await import("./handlers/speedmath")).handleSpeedMathAnswer(
        ctx,
        student,
        msgText,
      );
      if (smHandled) return true;
    }

    // Record the typed answer in the dashboard history. This path answers
    // without the tutor LLM, so it would otherwise leave no trace.
    const typed = "text" in msg ? (msg.text?.trim() ?? "") : "";
    if (typed) {
      logChat(student.id, "user", typed, "telegram", { intent: "quiz_answer" });
    }
    mirrorRepliesToChatLog(ctx, student.id);

    await handleQuizAnswer(ctx, session, student);
    return true;
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

  // Record quiz button presses in the dashboard history. The handlers reply
  // directly (no LLM), so without this the student's taps leave no trace —
  // their conversation looked empty even though they were answering.
  const quizLabel = describeQuizCallback(data);
  if (quizLabel) {
    const student = await findStudentByTelegramId(ctx);
    if (student) {
      logChat(student.id, "user", quizLabel, "telegram", {
        intent: "quiz_callback",
        data,
      });
      mirrorRepliesToChatLog(ctx, student.id);
    }
  }

  // Quiz answer/exit/redo/explain callbacks
  if (
    data.startsWith(QUIZ_ANS_PREFIX) ||
    data.startsWith(QUIZ_EXIT_PREFIX) ||
    data.startsWith(QUIZ_REDO_PREFIX) ||
    data.startsWith(QUIZ_EXPLAIN_PREFIX)
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

  // Extension request (trial expired → ask admin to approve)
  if (data === "ext:request") {
    const student = await findStudentByTelegramId(ctx);
    if (!student) {
      await ctx.answerCbQuery("Sesi tidak ditemukan. Ketik /start ya!").catch(() => {});
      return true;
    }
    await handleExtensionRequest(ctx, student);
    return true;
  }

  // Admin decision on an extension request (package choice / ❌ reject)
  if (data.startsWith("ext:set:") || data.startsWith("ext:reject:")) {
    const [, action, studentId, monthsRaw] = data.split(":");
    const { handleExtensionDecision } = await import("./handlers/extension");
    await handleExtensionDecision(
      ctx,
      action as "set" | "reject",
      studentId,
      monthsRaw ? Number(monthsRaw) : undefined,
    );
    return true;
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
