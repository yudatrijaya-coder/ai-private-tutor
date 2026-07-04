import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type BotSessionState =
  | "chat"
  | "quiz_active"
  | "choosing_topic"
  | "vision_answer"
  | "waiting_quiz_answer";

export interface BotSession {
  studentId: string;
  currentMode: BotSessionState;
  context: Record<string, unknown>;
}

/**
 * Mapping from DB currentMode strings to BotSessionState.
 */
const DB_TO_STATE: Record<string, BotSessionState> = {
  chat: "chat",
  quiz_active: "quiz_active",
  choosing_topic: "choosing_topic",
  vision_answer: "vision_answer",
  waiting_quiz_answer: "waiting_quiz_answer",
};

const STATE_TO_DB: Record<BotSessionState, string> = {
  chat: "chat",
  quiz_active: "quiz_active",
  choosing_topic: "choosing_topic",
  vision_answer: "vision_answer",
  waiting_quiz_answer: "waiting_quiz_answer",
};

/**
 * Get (or create) a BotSession for a student.
 */
export async function getSession(studentId: string): Promise<BotSession> {
  let row = await prisma.sessionState.findUnique({
    where: { studentId },
  });

  if (!row) {
    row = await prisma.sessionState.create({
      data: {
        studentId,
        currentMode: "chat",
        context: {},
      },
    });
  }

  return {
    studentId: row.studentId,
    currentMode: DB_TO_STATE[row.currentMode] ?? "chat",
    context: (row.context as Record<string, unknown>) ?? {},
  };
}

/**
 * Update an existing session.
 */
export async function setSession(
  studentId: string,
  data: {
    currentMode?: BotSessionState;
    context?: Record<string, unknown>;
  },
): Promise<BotSession> {
  const updateData: Prisma.SessionStateUpdateInput = {};

  if (data.currentMode) {
    updateData.currentMode = STATE_TO_DB[data.currentMode];
  }
  if (data.context !== undefined) {
    updateData.context = data.context as Prisma.InputJsonValue;
  }

  const row = await prisma.sessionState.update({
    where: { studentId },
    data: updateData,
  });

  return {
    studentId: row.studentId,
    currentMode: DB_TO_STATE[row.currentMode] ?? "chat",
    context: (row.context as Record<string, unknown>) ?? {},
  };
}

/**
 * Reset session back to default 'chat' state with empty context.
 */
export async function clearSession(studentId: string): Promise<BotSession> {
  return setSession(studentId, {
    currentMode: "chat",
    context: {},
  });
}
