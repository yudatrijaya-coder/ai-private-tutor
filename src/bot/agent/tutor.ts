import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import type { BotSession } from "../session";
import type { ChatMessage } from "@/llm/client";
import { getPersona } from "../personas";
import { callLLM, callLLMStream } from "@/llm/client";
import { SYSTEM_PROMPTS } from "@/llm/prompts";
import { scanResponse } from "../safety";
import { setSession } from "../session";

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

  const systemMessage = `${SYSTEM_PROMPTS.tutor}\n\nPersona: ${persona.displayName}\nTone: ${persona.toneRules.join(", ")}\n\n${personaPrompt}\n\nStudent name: ${student.name}\nGrade: ${student.gradeLevel}\n\nIf student asks for quiz, schedule, or materials, respond with the appropriate command wrapped in square brackets like [QUIZ], [SCHEDULE], [MATERIALS] at the end of your message.`;

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

  // Call LLM
  let response: string | null;
  try {
    console.log("[tutor] Calling LLM...");
    response = await callLLM("tutor", messages);
    console.log("[tutor] LLM response:", response?.substring(0, 100));
  } catch (err) {
    console.warn("[tutor] LLM call failed, using persona fallback:", err instanceof Error ? err.message : String(err));
    response = persona.greeting;
  }

  if (!response) return persona.greeting;

  // Safety scan before returning
  const safeResponse = await scanResponse(student.id, response);
  const finalResponse = safeResponse ?? response;

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

  const systemMessage = `${SYSTEM_PROMPTS.tutor}\n\nPersona: ${persona.displayName}\nTone: ${persona.toneRules.join(", ")}\n\n${personaPrompt}\n\nStudent name: ${student.name}\nGrade: ${student.gradeLevel}\n\nIf student asks for quiz, schedule, or materials, respond with the appropriate command wrapped in square brackets like [QUIZ], [SCHEDULE], [MATERIALS] at the end of your message.`;

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
