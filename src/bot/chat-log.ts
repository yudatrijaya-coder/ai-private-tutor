import type { Context } from "telegraf";
import { prisma } from "@/lib/prisma";

/** ChatLog.content is an unbounded text column; cap it so one huge reply
 *  (e.g. a 20-question dump) cannot bloat the dashboard payload. */
const MAX_CONTENT = 4000;

/**
 * Persist one chat turn to ChatLog — fire-and-forget.
 *
 * The tutor LLM (agent/tutor.ts) is the only other writer of ChatLog. Every
 * deterministic path that answers WITHOUT the LLM (quiz intent, command
 * handlers, …) therefore leaves no trace in the dashboard history, so a
 * student's quiz requests looked like they never happened.
 *
 * Never throws: logging must not be able to break a reply.
 */
export function logChat(
  studentId: string,
  role: "user" | "assistant" | "system",
  content: string,
  source = "telegram",
  metadata?: Record<string, unknown>,
): void {
  const text = (content ?? "").trim();
  if (!text) return;

  prisma.chatLog
    .create({
      data: {
        studentId,
        role,
        content: text.slice(0, MAX_CONTENT),
        source,
        ...(metadata ? { metadata: metadata as never } : {}),
      },
    })
    .catch((err) =>
      console.warn(
        "[chat-log] Failed to log chat:",
        err instanceof Error ? err.message : String(err),
      ),
    );
}

/**
 * Mirror every outbound reply on this ctx into ChatLog.
 *
 * The quiz flow sends its replies straight from the handler (mapel picker,
 * question + buttons, result), so wrapping `reply` here captures the whole
 * exchange for the dashboard without touching quiz.ts at all.
 *
 * `editMessageText` is mirrored too: the subject picker edits the message the
 * button was attached to, and that edit is the only place its text appears.
 *
 * Returns the same ctx so callers can chain.
 */
export function mirrorRepliesToChatLog(
  ctx: Context,
  studentId: string,
  source = "telegram",
): Context {
  const target = ctx as unknown as Record<string, (...args: unknown[]) => unknown>;

  const wrap = (name: "reply" | "editMessageText") => {
    const original = target[name];
    if (typeof original !== "function") return;
    const bound = original.bind(ctx);
    target[name] = (...args: unknown[]) => {
      const first = args[0];
      if (typeof first === "string") logChat(studentId, "assistant", first, source);
      return bound(...args);
    };
  };

  wrap("reply");
  wrap("editMessageText");

  return ctx;
}

/**
 * Human-readable label for a quiz callback, so the dashboard history shows what
 * the student did ("Jawaban: C (soal 2)") instead of a raw `quiz:ans:1:2`.
 *
 * Returns null for callbacks that are not part of the quiz flow.
 */
export function describeQuizCallback(data: string): string | null {
  if (data.startsWith("quiz:ans:")) {
    const [, , idxRaw, optRaw] = data.split(":");
    const letter = Number.isFinite(Number(optRaw))
      ? String.fromCharCode(65 + Number(optRaw))
      : optRaw;
    const n = Number(idxRaw);
    return `Jawaban: ${letter}${Number.isFinite(n) ? ` (soal ${n + 1})` : ""}`;
  }
  if (data === "quiz:exit") return "Keluar dari kuis";
  if (data.startsWith("quiz:redo:")) {
    return data.endsWith(":hard") ? "Ulang kuis (versi lebih sulit)" : "Ulang kuis";
  }
  if (data.startsWith("quiz:explain:")) return "Minta penjelasan topik";
  if (data.startsWith("quiz:subject:")) {
    return `Pilih mapel: ${data.slice("quiz:subject:".length)}`;
  }
  if (data.startsWith("quiz:pick:")) return "Pilih kuis";
  if (data === "quiz:back:subjects") return "Kembali ke daftar mapel";
  return null;
}
