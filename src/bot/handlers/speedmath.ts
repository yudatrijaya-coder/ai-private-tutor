/**
 * Speed Math Handler — /speedmath
 *
 * Interactive timed drill: bot sends 1 soal at a time, siswa ketik angka
 * jawabannya (free-text, no buttons). Bot catat response time, beri feedback
 * trik cepat, lanjut soal berikutnya. Sesi 5 soal per round.
 *
 * Session state: stored in BotSession.context.speedmath
 * Shape:
 *   { active: true, queue: SpeedMathProblem[], current: SpeedMathProblem,
 *     sentAt: number, score: number, round: number, totalTime: number }
 */

import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { getPersona } from "@/bot/personas";
import { getSession, setSession } from "@/bot/session";
import { SPEED_MATH_BANK } from "@/data/math-enhancement-smp7";
import { awardXp } from "@/lib/gamification";
import { escapeMd } from "@/lib/telegram-format";

const ROUND_SIZE = 5;
const SLOW_THRESHOLD_SEC = 8;
const FAST_THRESHOLD_SEC = 4;
const XP_FAST = 25;
const XP_CORRECT = 10;

/** Pull random non-repeating problems for a round. */
function pickRound(exclude: string[]): import("@/data/math-enhancement-smp7").SpeedMathProblem[] {
  const pool = SPEED_MATH_BANK.filter((p) => !exclude.includes(p.id));
  const src = pool.length >= ROUND_SIZE ? pool : SPEED_MATH_BANK;
  const shuffled = [...src].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, ROUND_SIZE);
}

/** Send a single speed math question. */
async function sendQuestion(
  ctx: Context,
  problem: import("@/data/math-enhancement-smp7").SpeedMathProblem,
  idx: number,
  total: number,
  persona: ReturnType<typeof getPersona>,
) {
  const lines = [
    `${persona.emoji} *⚡ Soal ${idx}/${total} — Hitung Cepat!*`,
    `_Kategori: ${problem.category}_`,
    ``,
    `*${escapeMd(problem.question)} = ?*`,
    ``,
    `⏱ Target: ≤ ${problem.targetSeconds} detik`,
    `_Ketik jawaban angkanya langsung ya!_`,
  ];
  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
}

/** Start a new Speed Math session. */
export async function handleSpeedMathStart(ctx: Context, student: Student): Promise<void> {
  const persona = getPersona(student.persona);
  const session = await getSession(student.id);

  const queue = pickRound([]);
  const first = queue[0];

  await setSession(student.id, {
    currentMode: "quiz_active",
    context: {
      ...session.context,
      speedmath: {
        active: true,
        queue: queue.slice(1),
        current: first,
        sentAt: Date.now(),
        score: 0,
        round: 1,
        totalTime: 0,
        usedIds: [first.id],
      },
    },
  });

  await ctx.reply(
    `${persona.emoji} *Mode: ⚡ HITUNG CEPAT!*\n\n` +
      `Aturan main:\n` +
      `• Ketik langsung *angka jawabannya* saja.\n` +
      `• Jawab secepat mungkin — bot catat waktunya! 🕐\n` +
      `• ${ROUND_SIZE} soal per sesi, tanpa pilihan ganda.\n\n` +
      `Siap? Soal pertama:`,
    { parse_mode: "Markdown" },
  );

  await sendQuestion(ctx, first, 1, ROUND_SIZE, persona);
}

/** Handle free-text answer during Speed Math session. Returns true if handled. */
export async function handleSpeedMathAnswer(
  ctx: Context,
  student: Student,
  text: string,
): Promise<boolean> {
  const session = await getSession(student.id);
  const sm = session.context?.speedmath as any;

  if (!sm?.active || !sm.current) return false;

  const persona = getPersona(student.persona);
  const elapsed = Math.round((Date.now() - sm.sentAt) / 1000);
  const userNum = parseFloat(text.replace(/[^0-9.\-]/g, ""));
  const correct = Math.abs(userNum - sm.current.answer) < 0.01;
  const isLightning = correct && elapsed <= sm.current.targetSeconds;
  const isSlow = elapsed > SLOW_THRESHOLD_SEC;

  // XP
  let xpEarned = 0;
  if (correct) {
    xpEarned = isLightning ? XP_FAST : XP_CORRECT;
    await awardXp(student.id, xpEarned).catch(() => {});
  }

  // Feedback lines
  const feedbackLines: string[] = [];
  if (correct) {
    if (isLightning) {
      feedbackLines.push(`⚡ *KILAT!* ${elapsed} detik — Benar! +${xpEarned} XP 🎉`);
    } else if (elapsed <= SLOW_THRESHOLD_SEC) {
      feedbackLines.push(`✅ Benar! ${elapsed} detik (+${xpEarned} XP)`);
    } else {
      feedbackLines.push(`✅ Benar! Tapi ${elapsed} detik — agak lama ya 😅`);
    }
  } else {
    const answerStr = Number.isInteger(sm.current.answer)
      ? sm.current.answer.toString()
      : sm.current.answer.toFixed(2);
    feedbackLines.push(`❌ Salah. Jawaban yang benar: *${escapeMd(answerStr)}*`);
  }

  if (!correct || isSlow) {
    feedbackLines.push(``, `💡 *Trik Cepat:*`, `_${escapeMd(sm.current.shortcut)}_`);
  }

  await ctx.reply(feedbackLines.join("\n"), { parse_mode: "Markdown" });

  // Advance round
  const newScore = sm.score + (correct ? 1 : 0);
  const newTotalTime = sm.totalTime + elapsed;
  const roundIdx = sm.round + 1; // next question number

  if (sm.queue.length === 0) {
    // Session complete
    await setSession(student.id, {
      currentMode: "chat",
      context: { ...session.context, speedmath: undefined },
    });

    const avgTime = Math.round(newTotalTime / ROUND_SIZE);
    const perfect = newScore === ROUND_SIZE;
    const summaryLines = [
      ``,
      `🏁 *Sesi Selesai!*`,
      ``,
      `🎯 Benar: *${newScore}/${ROUND_SIZE}*`,
      `⏱ Rata-rata waktu: *${avgTime} detik/soal*`,
      `⭐ Total XP earned: *${perfect ? XP_FAST * ROUND_SIZE : newScore * XP_CORRECT}*`,
      ``,
    ];

    if (perfect && avgTime <= FAST_THRESHOLD_SEC) {
      summaryLines.push(`🏅 *SEMPURNA + KILAT!* Reflek angka kamu luar biasa! ⚡`);
    } else if (perfect) {
      summaryLines.push(`💪 Semua benar! Latih kecepatan untuk jadi *Lightning Brain*!`);
    } else if (newScore >= 3) {
      summaryLines.push(`Good job! Latihan terus ya — ketik /speedmath lagi kapan aja.`);
    } else {
      summaryLines.push(`Jangan menyerah! Baca trik-triknya dulu di /materi lalu coba lagi. 💡`);
    }

    summaryLines.push(``, `Ketik /speedmath untuk ronde berikutnya, atau /quiz untuk kuis reguler.`);

    await ctx.reply(summaryLines.join("\n"), { parse_mode: "Markdown" });
    return true;
  }

  // Next question
  const next = sm.queue[0];
  const remainingQueue = sm.queue.slice(1);

  await setSession(student.id, {
    currentMode: "quiz_active",
    context: {
      ...session.context,
      speedmath: {
        active: true,
        queue: remainingQueue,
        current: next,
        sentAt: Date.now(),
        score: newScore,
        round: roundIdx,
        totalTime: newTotalTime,
        usedIds: [...(sm.usedIds ?? []), next.id],
      },
    },
  });

  await sendQuestion(ctx, next, roundIdx, ROUND_SIZE, persona);
  return true;
}

/** /speedmath exit — quit session early. */
export async function handleSpeedMathExit(ctx: Context, student: Student): Promise<boolean> {
  const session = await getSession(student.id);
  const sm = session.context?.speedmath as any;
  if (!sm?.active) return false;

  await setSession(student.id, {
    currentMode: "chat",
    context: { ...session.context, speedmath: undefined },
  });

  const persona = getPersona(student.persona);
  await ctx.reply(
    `${persona.emoji} Sesi Speed Math dihentikan. Ketik /speedmath kapan aja untuk mulai lagi ya!`,
  );
  return true;
}
