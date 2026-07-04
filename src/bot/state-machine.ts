import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import type { BotSession } from "./session";
import { handleQuizAnswer } from "./handlers/quiz";
import { handleGeneric } from "./handlers/generic";

/**
 * Route an incoming message based on the current session state.
 * Called ONCE per message, before the tutor's intent detection.
 */
export async function routeByState(
  ctx: Context,
  session: BotSession,
  student: Student,
): Promise<boolean> {
  // If a quiz is active, the message IS a quiz answer
  if (session.currentMode === "quiz_active" || session.currentMode === "waiting_quiz_answer") {
    await handleQuizAnswer(ctx, session, student);
    return true; // handled
  }

  // Other state-specific routing can be added here in future:
  // - choosing_topic -> topic selection handler
  // - vision_answer -> vision handler

  return false; // not handled by state machine, fall through to intent detection
}
