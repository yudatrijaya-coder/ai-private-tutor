/**
 * Post-quiz feedback — the bot reacts to a finished quiz.
 *
 * WHAT THIS IS
 * When a student finishes a quiz the bot sends one message that
 *   1. appreciates the result (score, XP, streak),
 *   2. walks through the questions they got wrong (answer + explanation), and
 *   3. suggests what to do next (due reviews, or a retry).
 *
 * WHY IT IS A SERVICE AND NOT INLINE IN A ROUTE
 * Two entry points finish a quiz — the web grade route (via `gradeAttempt`)
 * and the bot's own quiz handler — and they must produce the same message.
 * The feedback is also deliberately fire-and-forget: a student's submit must
 * not wait on, or fail because of, a Telegram call.
 *
 * IDEMPOTENCY
 * One message per attempt, keyed on the attempt id. `claimOnce` is taken
 * *before* the send, so a retried request cannot produce a second message. A
 * failed send releases the claim so a later retry still gets through.
 */

import { prisma } from "@/lib/prisma";
import { claimOnce, releaseClaim } from "@/lib/cron/idempotency";
import { parseQuestions, parseAnswers, isAnswerCorrect, FEEDBACK_QUESTION_LIMIT } from "@/lib/quiz-grading";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/** Telegram hard limit is 4096; stay well under it. */
const MAX_MESSAGE_CHARS = 3500;

export interface QuizFeedbackResult {
  /** "sent" | "skipped" | "failed" */
  status: "sent" | "skipped" | "failed";
  /** Why it was skipped, when it was. */
  reason?: string;
}

/** Injectable transport + clock so the regression test never hits Telegram. */
export interface QuizFeedbackDeps {
  sendMessage?: (chatId: string, text: string) => Promise<boolean>;
  now?: Date;
}

/** Score bands, phrased as a tutor would say them. */
function appreciation(score: number, maxScore: number): string {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  if (maxScore > 0 && score === maxScore) return "Sempurna! Semua jawaban benar. 🎯";
  if (pct >= 80) return "Bagus sekali! Pemahamanmu sudah kuat. 👏";
  if (pct >= 60) return "Kerja bagus, sudah lewat separuh jalan. 👍";
  if (pct >= 40) return "Semangat! Sebagian sudah kamu kuasai. 💪";
  return "Tidak apa-apa, ini titik awal yang bagus untuk belajar. 🌱";
}

/** Trim a line of quiz text so one question cannot blow the message budget. */
function clip(text: string, max = 180): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Escape the characters Telegram's Markdown parser treats as syntax. */
function esc(text: string): string {
  return (text ?? "").replace(/([_*`\[\]])/g, "\\$1");
}

/**
 * Send post-quiz feedback for one attempt.
 *
 * Never throws: it is called fire-and-forget from request handlers, so a
 * failure here must not surface as a failed quiz submission.
 */
export async function sendQuizFeedback(
  attemptId: string,
  deps: QuizFeedbackDeps = {},
): Promise<QuizFeedbackResult> {
  try {
    const send =
      deps.sendMessage ??
      (async (chatId: string, text: string) => {
        if (!BOT_TOKEN) return false;
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
        });
        return res.ok;
      });

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: { include: { material: true } },
        student: {
          select: {
            id: true,
            name: true,
            telegramId: true,
            xp: true,
            currentStreak: true,
          },
        },
      },
    });

    if (!attempt) return { status: "skipped", reason: "attempt not found" };
    if (!attempt.student.telegramId) {
      // No chat to talk to. Silent by design — not an error.
      return { status: "skipped", reason: "no telegramId" };
    }

    const claimKey = `quiz-feedback:${attemptId}`;
    if (!(await claimOnce(claimKey, { studentId: attempt.studentId, attemptId }))) {
      return { status: "skipped", reason: "already sent" };
    }

    // ── Build the message ──────────────────────────────────────────────
    const questions = parseQuestions(attempt.quiz?.questions);
    const answers = parseAnswers(attempt.answers);
    const score = attempt.score ?? 0;
    const maxScore = attempt.maxScore ?? questions.length;

    const wrong: number[] = [];
    for (const a of answers) {
      const idx = a.questionIndex;
      if (typeof idx !== "number" || idx < 0 || idx >= questions.length) continue;
      if (!isAnswerCorrect(questions[idx], a)) wrong.push(idx);
    }

    const subject = attempt.quiz?.material?.subject ?? "";
    const topic = attempt.quiz?.material?.topic || subject;
    const lines: string[] = [];

    lines.push(`📝 *Quiz selesai* — ${esc(topic || "Quiz")}`);
    lines.push("");
    lines.push(
      `Skor: *${score}/${maxScore}* (${maxScore > 0 ? Math.round((score / maxScore) * 100) : 0}%)`,
    );
    lines.push(appreciation(score, maxScore));

    if (attempt.student.currentStreak > 0) {
      lines.push(`🔥 Streak: *${attempt.student.currentStreak} hari*`);
    }

    // Wrong answers, with the explanation the quiz already carries.
    if (wrong.length > 0) {
      lines.push("");
      lines.push(`*Yang perlu dibahas* (${wrong.length} soal):`);
      for (const idx of wrong.slice(0, FEEDBACK_QUESTION_LIMIT)) {
        const q = questions[idx];
        lines.push("");
        lines.push(`${idx + 1}. ${esc(clip(q?.question ?? `Soal ${idx + 1}`))}`);
        const correctText =
          typeof q?.correctIndex === "number" && Array.isArray(q?.options)
            ? q.options[q.correctIndex]
            : undefined;
        if (correctText) lines.push(`   ✅ Jawaban: ${esc(clip(correctText, 90))}`);
        if (q?.explanation) lines.push(`   💡 ${esc(clip(q.explanation, 300))}`);
      }
      if (wrong.length > FEEDBACK_QUESTION_LIMIT) {
        lines.push("");
        lines.push(`…dan ${wrong.length - FEEDBACK_QUESTION_LIMIT} soal lain lagi.`);
      }
    } else if (answers.length > 0) {
      lines.push("");
      lines.push("Semua soal yang kamu jawab sudah benar. 🎉");
    }

    // What to do next — driven by the real review queue, not a guess.
    const due = await prisma.reviewQueue.count({
      where: { studentId: attempt.studentId, mastered: false, dueAt: { lte: deps.now ?? new Date() } },
    });

    lines.push("");
    if (due > 0) {
      lines.push(`📚 Ada *${due} soal* yang siap kamu ulang. Ketik /review untuk membahasnya.`);
    } else if (wrong.length > 0) {
      lines.push("Mau bahas soal yang salah? Ketik /review atau tanya aku langsung di sini.");
    } else {
      lines.push(`Materi ${esc(subject || topic)} sudah kamu kuasai — lanjut ke materi berikutnya!`);
    }

    let text = lines.join("\n");
    if (text.length > MAX_MESSAGE_CHARS) {
      text = `${text.slice(0, MAX_MESSAGE_CHARS - 20)}\n\n…(pesan dipotong)`;
    }

    const ok = await send(attempt.student.telegramId, text);
    if (!ok) {
      await releaseClaim(claimKey);
      return { status: "failed", reason: "transport rejected" };
    }
    return { status: "sent" };
  } catch (err) {
    console.warn("[quiz-feedback] failed:", err);
    return { status: "failed", reason: err instanceof Error ? err.message : "unknown" };
  }
}
