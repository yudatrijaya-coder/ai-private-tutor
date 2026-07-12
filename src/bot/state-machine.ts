import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import type { BotSession } from "./session";
import { handleQuizAnswer } from "./handlers/quiz";
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

  // Registration flow states — route to onboarding handler
  if (
    session.currentMode === "registering_name" ||
    session.currentMode === "registering_grade" ||
    session.currentMode === "registering_character" ||
    session.currentMode === "registering_days" ||
    session.currentMode === "registering_confirm"
  ) {
    return await handleOnboardingMessage(ctx, session);
  }

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

  // Onboarding callbacks
  if (data.startsWith("onboard_") || data.startsWith("approve:") || data.startsWith("reject:")) {
    await handleOnboardingCallback(ctx);
    return true;
  }

  return false;
}
