/**
 * Proactive weekly motivation nudge (student request: "ambient lebih
 * proaktif, regularly give motivation").
 *
 * DISTINCT FROM daily-nudge: daily-nudge targets students who have been
 * INACTIVE for 2+ days. This service reaches every active student on a
 * schedule (Mon = start-of-week plan, Fri = week-end encouragement) with a
 * deterministic, prosem-aware motivational message.
 *
 * Facts (week number, this-week materials, lagging topics, progress ratio)
 * come from `buildProsemContext` — same DB queries the web "Materi Minggu
 * Ini" section uses. The motivational LINE is template rotation keyed on the
 * ISO week — deliberately NOT LLM: zero cost, zero hallucination, stable
 * tone. Rules: self-comparison only (never student-vs-student), no guilt
 * framing for lagging topics, one message per student per slot.
 *
 * Idempotency: `CronClaim` key `motivation-<type>:<studentId>:<ISO-week>` —
 * same pattern as daily-nudge (ledger C-13b). A failed send releases its
 * claim so the next run retries only the failures.
 */

import { prisma } from "@/lib/prisma";
import { claimOnce, releaseClaim, isoWeekKey } from "@/lib/cron/idempotency";
import { buildProsemContext } from "@/lib/prosem-context";
import { getPersona } from "@/bot/personas";

export type MotivationType = "monday" | "friday";

export interface MotivationNudgeResult {
  sent: number;
  failed: number;
  skipped: number;
  results: string[];
}

export interface MotivationNudgeDeps {
  sendMessage?: (chatId: string, text: string, replyMarkup?: unknown) => Promise<boolean>;
  now?: Date;
  claimPrefix?: string;
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const DASHBOARD = "https://senangbelajar.web.id/student";

/** Rotating motivational closers — index picked from the ISO week number. */
const MOTIVATION_MONDAY = [
  "Minggu baru, kesempatan baru. Satu topik kecil hari ini lebih baik daripada nol.",
  "Konsisten itu kunci — bahkan 15 menit hari Senin mengubah ritme seminggumu.",
  "Mulai minggu dengan satu kemenangan kecil: selesaikan satu materi.",
  "Kamu tidak harus cepat, kamu hanya harus jalan terus minggu ini.",
];
const MOTIVATION_FRIDAY = [
  "Akhiri minggu dengan bangga pada usahamu, bukan pada sisa materinya.",
  "Apa yang kamu pelajari minggu ini adalah versi dirimu minggu depan.",
  "Sedikit tapi rutin mengalahkan banyak tapi sekali. Pertahankan!",
  "Rehat juga bagian dari belajar. Isi weekend dengan hal yang bikin kamu happy!",
];

function pickMotivation(type: MotivationType, weekKey: string): string {
  const pool = type === "monday" ? MOTIVATION_MONDAY : MOTIVATION_FRIDAY;
  // Deterministic rotation: sum of char codes keeps it stable per week.
  const idx =
    weekKey.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % pool.length;
  return pool[idx];
}

export async function runMotivationNudge(
  type: MotivationType,
  deps: MotivationNudgeDeps = {}
): Promise<MotivationNudgeResult> {
  const now = deps.now ?? new Date();
  const claimPrefix = deps.claimPrefix ?? "";
  const weekKey = isoWeekKey(now);
  const send =
    deps.sendMessage ??
    (async (chatId: string, text: string, replyMarkup?: unknown) => {
      if (!BOT_TOKEN) return false;
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup: replyMarkup }),
      });
      return res.ok;
    });

  const students = await prisma.student.findMany({
    where: { status: "ACTIVE", telegramId: { not: null } },
    select: { id: true, name: true, telegramId: true, gradeLevel: true, persona: true },
  });

  const results: string[] = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const student of students) {
    if (!student.telegramId) {
      skipped++;
      continue;
    }

    const claimKey = `${claimPrefix}motivation-${type}:${student.id}:${weekKey}`;
    if (!(await claimOnce(claimKey, { studentId: student.id, type, weekKey }))) {
      skipped++;
      continue;
    }

    const ctx = await buildProsemContext({ id: student.id, gradeLevel: student.gradeLevel });
    const persona = getPersona(student.persona);

    // Compose from DB facts only.
    const lines: string[] = [];
    if (type === "monday") {
      lines.push(`📅 <b>Plan minggu ke-${ctx?.week ?? "?"}</b>`);
    } else {
      lines.push(`🏁 <b>Weekend check-in</b>`);
    }

    if (ctx) {
      let totalDone = 0;
      let totalAll = 0;
      const laggingAll: string[] = [];
      for (const s of ctx.subjects) {
        totalDone += s.scheduledDone;
        totalAll += s.scheduledTotal;
        for (const l of s.lagging) {
          laggingAll.push(`${l.topic} (${s.subject})`);
        }
      }
      if (totalAll > 0) {
        const pct = Math.round((totalDone / totalAll) * 100);
        lines.push(
          `Progres jadwal: <b>${totalDone}/${totalAll} topik (${pct}%)</b>`
        );
      }
      // Cap the subject list — a full curriculum dump (12+ subjects) reads
      // like a report, not a nudge.
      const weekSubjects = ctx.subjects.filter((s) => s.thisWeek.length > 0);
      const shown = weekSubjects.slice(0, 4);
      const weekLine = shown
        .map((s) => `• <b>${s.subject}</b>: ${s.thisWeek.map((m) => m.topic).join(", ")}`)
        .join("\n");
      if (weekLine) {
        lines.push(
          `Materi minggu ini:\n${weekLine}${
            weekSubjects.length > shown.length
              ? `\n<i>…+${weekSubjects.length - shown.length} mapel lainnya</i>`
              : ""
          }`
        );
      }
      if (laggingAll.length > 0) {
        lines.push(
          `⏳ Masih bisa dikejar: <b>${laggingAll.slice(0, 3).join(", ")}</b>${
            laggingAll.length > 3 ? " + lainnya" : ""
          }`
        );
      }
    }

    lines.push(`💬 ${pickMotivation(type, weekKey)}`);

    const greeting =
      type === "monday"
        ? `Hai ${student.name}! Semangat awal minggu! ${persona.emoji}`
        : `Hai ${student.name}! Kamu sudah kerja keras minggu ini. ${persona.emoji}`;

    const message =
      `${greeting}\n\n${lines.join("\n\n")}\n\n` +
      `🧠 <a href="${DASHBOARD}/quiz">Mulai Quiz</a>\n` +
      `📖 <a href="${DASHBOARD}/slides">Baca Materi</a>`;

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: "🧠 Mulai Quiz", url: `${DASHBOARD}/quiz` },
          { text: "📖 Baca Materi", url: `${DASHBOARD}/slides` },
        ],
      ],
    };

    try {
      const ok = await send(student.telegramId, message, replyMarkup);
      if (ok) {
        sent++;
        results.push(`motivated ${student.name}`);
      } else {
        failed++;
        results.push(`failed ${student.name}: Telegram rejected the message`);
        await releaseClaim(claimKey);
      }
    } catch (err) {
      failed++;
      results.push(`failed ${student.name}: ${(err as Error).message?.slice(0, 80)}`);
      await releaseClaim(claimKey);
    }
  }

  return { sent, failed, skipped, results };
}
