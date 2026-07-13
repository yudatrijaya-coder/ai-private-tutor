import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import type { BotSession } from "../session";
import type { ChatMessage } from "@/llm/client";
import { prisma } from "@/lib/prisma";
import { getPersona } from "../personas";
import { callLLM, callLLMStream } from "@/llm/client";
import { SYSTEM_PROMPTS } from "@/llm/prompts";
import { scanResponse } from "../safety";
import { setSession } from "../session";

const GRADE_LABELS: Record<string, string> = {
  SD_5: "SD Kelas 5",
  SMP_1: "SMP Kelas 1",
  SMA_2: "SMA Kelas 2",
};

function getGradeLabel(grade?: string | null): string {
  return GRADE_LABELS[grade ?? ""] ?? grade ?? "SD Kelas 5";
}

/** Timeout wrapper — rejects if the promise doesn't resolve in `ms` ms */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[tutor] ${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * LLM-powered tutor message handler.
 *
 * Replaces the old keyword-based intent detection with LLM chat.
 * The LLM detects intent AND generates a response.
 * If the LLM wraps a command in [QUIZ], [SCHEDULE], or [MATERIALS],
 * the response is returned and the caller routes accordingly.
 *
 * Supports streaming — returns the full response string for now,
 * callers can use the streaming variant separately.
 */
export async function handleMessage(
  ctx: Context,
  session: BotSession,
  student: Student,
): Promise<string | null> {
  const msg = ctx.message;
  if (!msg || !("text" in msg)) return null;

  const persona = getPersona(student.persona);
  const personaPrompt = persona.prompt ?? `${SYSTEM_PROMPTS.tutor}\n\nPersona: ${persona.displayName}`;

  const systemMessage = `${SYSTEM_PROMPTS.tutor}\n\nPersona: ${persona.displayName}\nTone: ${persona.toneRules.join(", ")}\n\n${personaPrompt}\n\nStudent name: ${student.name}\nStudent ID: ${student.studentId}\nGrade: ${getGradeLabel(student.gradeLevel)}\n\nCAPABILITIES — You can now do the following when the student asks:
1. [QUIZ] — Generate or start a quiz
2. [SCHEDULE] — Show today's study schedule. Available sub-commands:
   - [SCHEDULE:WEEK] — Show this week's full schedule
   - [SCHEDULE:SET:{"sessionsPerDay":N,"preferredTime":"HH:MM","excludeDays":["sunday"]}] — Set study preferences
   - [SCHEDULE:ASSIGN] — Generate sessions for upcoming days
   When the student says "Atur jadwal" or "Aku mau belajar jam 4 sore", ask their preference then use [SCHEDULE:SET].
3. [MATERIALS] — Show learning materials
4. [REMINDER:CREATE:{"title":"...","remindAt":"ISO_DATE","category":"exam|homework|event|study|general","description":"..."}] — Set a reminder
5. [REMINDER:LIST] — Show all reminders
6. [REMINDER:DELETE:{"all":true}] — Delete all reminders
7. [HOMEWORK:CREATE:{"subject":"...","description":"...","deadlineAt":"ISO_DATE"}] — Record a homework
8. [HOMEWORK:LIST] — Show pending homework
9. [HOMEWORK:SUBMIT:{"subject":"..."}] — Mark homework as done
10. [PASSWORD] — When the student asks to create or change their web login password, respond with their Student ID and ask them to type a new password (min 6 characters). Then call [PASSWORD:SET:{"password":"the_new_password"}] — This will update their password. Do NOT reveal existing passwords.
11. [YOUTUBE:VIDEO_ID] — When the student shares a YouTube link or asks you to explain a YouTube video, parse the video ID from the URL and use this command. You'll get the transcript and can explain it to them in your own words. Example: [YOUTUBE:dQw4w9WgXcQ]
12. [DASHBOARD] — When the student asks about their web dashboard, learning portal, or web login. Respond with their dashboard link: https://senangbelajar.web.id/student

When the student asks about reminders, homework, or deadlines, respond naturally AND append the appropriate command at the end.
Example: "Baik Andi, aku catat ulangan matematikanya ya! 😊 [REMINDER:CREATE:{"title":"Ulangan Matematika","remindAt":"2026-07-14T08:00:00","category":"exam"}]"
Respond in Indonesian, warm, friendly.`;

  // Build message history — last 10 from session context
  const chatHistory = (session.context?.chatHistory as Array<{ role: string; content: string }>) ?? [];
  const recentHistory = chatHistory.slice(-10);
  console.log("[tutor] chatHistory length:", chatHistory.length, "session mode:", session.currentMode);

  const messages: ChatMessage[] = [
    { role: "system", content: systemMessage },
    ...recentHistory.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
    { role: "user", content: msg.text },
  ];

  // Call LLM with 30s timeout
  let response: string | null;
  try {
    console.log("[tutor] Calling LLM...");
    response = await withTimeout(
      callLLM("tutor", messages, { studentId: student.id }),
      30_000,
      "LLM call",
    );
    console.log("[tutor] LLM response:", response?.substring(0, 100));
  } catch (err) {
    console.warn("[tutor] LLM call failed, using persona fallback:", err instanceof Error ? err.message : String(err));
    response = persona.greeting;
  }

  if (!response) return persona.greeting;

  // Safety scan before returning
  const safeResponse = await scanResponse(student.id, response);
  const finalResponse = safeResponse ?? response;

  // Log chat to ChatLog (fire-and-forget)
  Promise.all([
    prisma.chatLog.create({
      data: { studentId: student.id, role: "user", content: msg.text, source: "telegram" },
    }),
    prisma.chatLog.create({
      data: { studentId: student.id, role: "assistant", content: finalResponse, source: "telegram" },
    }),
  ]).catch((err) =>
    console.warn("[tutor] Failed to log chat:", err instanceof Error ? err.message : String(err)),
  );

  // Save to chat history in session
  const updatedHistory = [
    ...chatHistory,
    { role: "user", content: msg.text },
    { role: "assistant", content: finalResponse },
  ];

  await setSession(student.id, {
    currentMode: session.currentMode,
    context: {
      ...session.context,
      chatHistory: updatedHistory.slice(-50), // keep last 50
    },
  });

  return finalResponse;
}

/**
 * Stream an LLM response character by character (simulates typing).
 * Yields tokens as they arrive from the LLM.
 */
export async function* streamMessage(
  ctx: Context,
  session: BotSession,
  student: Student,
): AsyncGenerator<string> {
  const msg = ctx.message;
  if (!msg || !("text" in msg)) return;

  const persona = getPersona(student.persona);
  const personaPrompt = persona.prompt ?? `${SYSTEM_PROMPTS.tutor}\n\nPersona: ${persona.displayName}`;

  const systemMessage = `${SYSTEM_PROMPTS.tutor}\n\nPersona: ${persona.displayName}\nTone: ${persona.toneRules.join(", ")}\n\n${personaPrompt}\n\nStudent name: ${student.name}\nStudent ID: ${student.studentId}\nGrade: ${getGradeLabel(student.gradeLevel)}\n\nCAPABILITIES — You can now do the following when the student asks:
1. [QUIZ] — Generate or start a quiz
2. [SCHEDULE] — Show today's study schedule. Available sub-commands:
   - [SCHEDULE:WEEK] — Show this week's full schedule
   - [SCHEDULE:SET:{"sessionsPerDay":N,"preferredTime":"HH:MM","excludeDays":["sunday"]}] — Set study preferences
   - [SCHEDULE:ASSIGN] — Generate sessions for upcoming days
   When the student says "Atur jadwal" or "Aku mau belajar jam 4 sore", ask their preference then use [SCHEDULE:SET].
3. [MATERIALS] — Show learning materials
4. [REMINDER:CREATE:{"title":"...","remindAt":"ISO_DATE","category":"exam|homework|event|study|general","description":"..."}] — Set a reminder
5. [REMINDER:LIST] — Show all reminders
6. [REMINDER:DELETE:{"all":true}] — Delete all reminders
7. [HOMEWORK:CREATE:{"subject":"...","description":"...","deadlineAt":"ISO_DATE"}] — Record a homework
8. [HOMEWORK:LIST] — Show pending homework
9. [HOMEWORK:SUBMIT:{"subject":"..."}] — Mark homework as done
10. [PASSWORD] — When the student asks to create or change their web login password, respond with their Student ID and ask them to type a new password (min 6 characters). Then call [PASSWORD:SET:{"password":"the_new_password"}] — This will update their password. Do NOT reveal existing passwords.
11. [YOUTUBE:VIDEO_ID] — When the student shares a YouTube link or asks you to explain a YouTube video, parse the video ID from the URL and use this command. You'll get the transcript and can explain it to them in your own words. Example: [YOUTUBE:dQw4w9WgXcQ]
12. [DASHBOARD] — When the student asks about their web dashboard, learning portal, or web login. Respond with their dashboard link: https://senangbelajar.web.id/student

When the student asks about reminders, homework, or deadlines, respond naturally AND append the appropriate command at the end.
Example: "Baik Andi, aku catat ulangan matematikanya ya! 😊 [REMINDER:CREATE:{"title":"Ulangan Matematika","remindAt":"2026-07-14T08:00:00","category":"exam"}]"
Respond in Indonesian, warm, friendly.`;

  const chatHistory = (session.context?.chatHistory as Array<{ role: string; content: string }>) ?? [];
  const recentHistory = chatHistory.slice(-10);

  const messages: ChatMessage[] = [
    { role: "system", content: systemMessage },
    ...recentHistory.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
    { role: "user", content: msg.text },
  ];

  let fullResponse = "";

  try {
    for await (const token of callLLMStream("tutor", messages)) {
      fullResponse += token;
      yield token;
    }
  } catch (err) {
    console.error("[tutor] LLM stream failed:", err);
    yield persona.greeting;
    return;
  }

  // Safety scan the full assembled response
  const safeResponse = await scanResponse(student.id, fullResponse);
  if (safeResponse) {
    // If blocked, we can't undo yielded tokens — log and return
    // In practice, the caller should handle this by checking before streaming
    console.warn("[tutor] Blocked content detected in streamed response");
  }

  // Save to chat history
  const updatedHistory = [
    ...chatHistory,
    { role: "user", content: msg.text },
    { role: "assistant", content: safeResponse ?? fullResponse },
  ];

  await setSession(student.id, {
    currentMode: session.currentMode,
    context: {
      ...session.context,
      chatHistory: updatedHistory.slice(-50),
    },
  });
}
