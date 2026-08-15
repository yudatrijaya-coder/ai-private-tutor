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
import { buildCapabilitiesPrompt } from "./capabilities";
import {
  getStudentTimezone,
  getTimezoneLabel,
  formatLocal,
  hourIn,
  partOfDay,
  isOffHours,
} from "@/lib/student-time";

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
 * Build the tutor system prompt.
 *
 * Single source of truth — the capability list comes from `capabilities.ts`
 * so `handleMessage` and `streamMessage` can never drift apart.
 */
async function buildSystemPrompt(student: Student): Promise<string> {
  const persona = getPersona(student.persona);
  const personaPrompt =
    persona.prompt ?? `${SYSTEM_PROMPTS.tutor}\n\nPersona: ${persona.displayName}`;

  // Student-local time — timezone from Student.scheduleConfig, fallback WIB.
  const tz = getStudentTimezone(student);
  const tzLabel = getTimezoneLabel(tz);
  const localDate = formatLocal(tz);
  const localHour = hourIn(tz);
  const dayPart = partOfDay(localHour);

  // Night guard: don't narrate "you're still up at 1am" unless truly recent activity.
  const lastActivity = student.lastActivityDate
    ? new Date(student.lastActivityDate)
    : null;
  const hoursSinceActivity = lastActivity
    ? (Date.now() - lastActivity.getTime()) / 3_600_000
    : null;
  const isRecentlyActive = hoursSinceActivity !== null && hoursSinceActivity < 2;

  const offHoursNote = isOffHours(localHour)
    ? [
        "",
        "ATURAN JAM MALAM (penting):",
        `- Sekarang ${localHour}:00 ${tzLabel}, di luar jam belajar normal (06:00–22:00).`,
        isRecentlyActive
          ? `- Siswa baru aktif ${hoursSinceActivity!.toFixed(1)} jam lalu, jadi wajar dia masih online. Jawab hangat dan normal.`
          : `- Siswa TIDAK sedang online terus-menerus${hoursSinceActivity !== null ? ` (terakhir aktif ${hoursSinceActivity.toFixed(1)} jam lalu)` : ""}. JANGAN menulis narasi seperti "masih di sini?", "semua anak udah bobo", atau ASCII/emoji art suasana malam.`,
        "- Jangan pernah menebak jam sendiri. Pakai jam yang tertulis di atas.",
        localHour >= 23 || localHour < 5
          ? "- Jawab pertanyaannya dulu dengan singkat, baru tutup dengan satu kalimat ajakan tidur. Maksimal satu kalimat."
          : "- Jawab pertanyaannya seperti biasa, tanpa ceramah soal jam.",
      ].join("\n")
    : "";

  const masterySummary = await buildMasterySummary(student);
  return [
    SYSTEM_PROMPTS.tutor,
    "",
    `Waktu sekarang: ${localDate} ${tzLabel} (bagian ${dayPart} hari). Gunakan waktu ini jika siswa bertanya soal jam/hari.`,
    offHoursNote,
    "",
    `Persona: ${persona.displayName}`,
    `Tone: ${persona.toneRules.join(", ")}`,
    "",
    personaPrompt,
    "",
    `Student name: ${student.name}`,
    `Student ID: ${student.studentId}`,
    `Grade: ${getGradeLabel(student.gradeLevel)}`,
    "",
    masterySummary,
    "",
    buildCapabilitiesPrompt(),
    "",
    "Respond in Indonesian, warm, friendly.",
  ].join("\n");
}

/**
 * Build a compact quantitative summary of the student's progress so the LLM
 * can personalise answers (weak topics, streak, subject averages).
 */
async function buildMasterySummary(student: Student): Promise<string> {
  try {
    const topics = await prisma.topicMastery.findMany({
      where: { studentId: student.id },
      orderBy: { mastery: "asc" },
      take: 12,
    });
    if (topics.length === 0) return "";

    const bySubject = new Map<string, { sum: number; count: number }>();
    for (const t of topics) {
      const cur = bySubject.get(t.subject) ?? { sum: 0, count: 0 };
      cur.sum += t.mastery;
      cur.count += 1;
      bySubject.set(t.subject, cur);
    }
    const subjectLine = Array.from(bySubject.entries())
      .map(([s2, d]) => s2 + " " + Math.round(d.sum / d.count) + "%")
      .join(", ");

    const weak = topics
      .filter((t) => t.weaknessLevel !== "none")
      .slice(0, 6)
      .map(
        (t) =>
          "• " + t.topic + " (" + t.subject + "): " + Math.round(t.mastery) + "% — " + t.weaknessLevel,
      )
      .join("\n");

    return [
      "📊 DATA PERKEMBANGAN SISWA (pakai ini untuk personalisasi jawaban, jangan menebak-nebak):",
      "- Streak: " + student.currentStreak + " hari | XP: " + student.xp + " | Mastery per mapel: " + subjectLine,
      weak
        ? "- Topik yang masih lemah (bantu siswa fokus di sini):\n" + weak
        : "- Belum ada data mastery yang cukup.",
    ].join("\n");
  } catch (err) {
    console.warn(
      "[tutor] buildMasterySummary failed:",
      err instanceof Error ? err.message : String(err),
    );
    return "";
  }
}

function getRecentHistory(session: BotSession) {
  const chatHistory =
    (session.context?.chatHistory as Array<{ role: string; content: string }>) ?? [];
  return { chatHistory, recentHistory: chatHistory.slice(-10) };
}

async function buildMessages(
  student: Student,
  recentHistory: Array<{ role: string; content: string }>,
  userText: string,
): Promise<ChatMessage[]> {
  return [
    { role: "system", content: await buildSystemPrompt(student) },
    ...recentHistory.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
    { role: "user", content: userText },
  ];
}

async function persistHistory(
  session: BotSession,
  studentId: string,
  chatHistory: Array<{ role: string; content: string }>,
  userText: string,
  reply: string,
): Promise<void> {
  const updatedHistory = [
    ...chatHistory,
    { role: "user", content: userText },
    { role: "assistant", content: reply },
  ];

  await setSession(studentId, {
    currentMode: session.currentMode,
    context: {
      ...session.context,
      chatHistory: updatedHistory.slice(-50), // keep last 50
    },
  });
}

/**
 * LLM-powered tutor message handler.
 *
 * The LLM detects intent AND generates a response. If it wraps a command in
 * [QUIZ], [SCHEDULE], [MATERIALS], etc., the response is returned and the
 * caller (handlers/message.ts) routes accordingly.
 */
export async function handleMessage(
  ctx: Context,
  session: BotSession,
  student: Student,
): Promise<string | null> {
  const msg = ctx.message;
  if (!msg || !("text" in msg)) return null;

  const persona = getPersona(student.persona);
  const { chatHistory, recentHistory } = getRecentHistory(session);
  console.log(
    "[tutor] chatHistory length:",
    chatHistory.length,
    "session mode:",
    session.currentMode,
  );

  const messages = await buildMessages(student, recentHistory, msg.text);

  // ── Off-hours observability (tutor-session-time-limit rule) ──
  const localHour = hourIn(getStudentTimezone(student));
  if (isOffHours(localHour)) {
    console.log(`[tutor] Off-hours request (local ${localHour}:00) for ${student.name}`);
  }

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
    console.warn(
      "[tutor] LLM call failed, using persona fallback:",
      err instanceof Error ? err.message : String(err),
    );
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
      data: {
        studentId: student.id,
        role: "assistant",
        content: finalResponse,
        source: "telegram",
      },
    }),
  ]).catch((err) =>
    console.warn(
      "[tutor] Failed to log chat:",
      err instanceof Error ? err.message : String(err),
    ),
  );

  await persistHistory(session, student.id, chatHistory, msg.text, finalResponse);

  return finalResponse;
}

/** Paragraph/sentence boundary used to decide when a buffered chunk can be released. */
const FLUSH_BOUNDARY = /(\n\n|[.!?…]\s|\n)$/;
/** Hard cap so a run-on response still gets flushed periodically. */
const MAX_BUFFER_CHARS = 400;

/**
 * Stream an LLM response in safety-scanned chunks.
 *
 * SAFETY: tokens are buffered until a sentence/paragraph boundary and each chunk
 * is scanned by `scanResponse` BEFORE it is yielded. Raw tokens are never
 * forwarded to a child unscanned. If any chunk trips the safety filter the
 * generator yields the safe fallback and stops immediately.
 */
export async function* streamMessage(
  ctx: Context,
  session: BotSession,
  student: Student,
): AsyncGenerator<string> {
  const msg = ctx.message;
  if (!msg || !("text" in msg)) return;

  const persona = getPersona(student.persona);
  const { chatHistory, recentHistory } = getRecentHistory(session);
  const messages = await buildMessages(student, recentHistory, msg.text);

  let buffer = "";
  let emitted = "";
  let blocked = false;

  /** Scan a completed chunk and yield it only when safe. */
  async function* flush(chunk: string): AsyncGenerator<string> {
    if (!chunk) return;
    const verdict = await scanResponse(student.id, chunk);
    if (verdict) {
      // Blocked — emit the safe fallback instead of the offending chunk.
      blocked = true;
      emitted = verdict;
      yield verdict;
      return;
    }
    emitted += chunk;
    yield chunk;
  }

  try {
    for await (const token of callLLMStream("tutor", messages, { studentId: student.id })) {
      buffer += token;

      if (FLUSH_BOUNDARY.test(buffer) || buffer.length >= MAX_BUFFER_CHARS) {
        yield* flush(buffer);
        buffer = "";
        if (blocked) break;
      }
    }

    // Flush whatever is left in the buffer.
    if (!blocked && buffer) {
      yield* flush(buffer);
      buffer = "";
    }
  } catch (err) {
    console.error("[tutor] LLM stream failed:", err);
    yield persona.greeting;
    return;
  }

  if (blocked) {
    console.warn("[tutor] Blocked content detected mid-stream — stream truncated");
  }

  await persistHistory(session, student.id, chatHistory, msg.text, emitted);
}
