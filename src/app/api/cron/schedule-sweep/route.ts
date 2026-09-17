/**
 * Schedule Sweep — cron endpoint for study schedule reminders + daily brief.
 *
 * Called every 2-5 minutes to:
 *   1. runReminderSweep() — check H-1 / T-30 reminders + missed detection
 *   2. sendDailyBrief() — send each active student their schedule for today
 *   3. assignSessionsIfNeeded() — auto-generate sessions for the coming days
 *
 * GET /api/cron/schedule-sweep?token=<CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { runReminderSweep } from "@/agents/scheduler/reminder";
import { prisma } from "@/lib/prisma";
import { bot } from "@/bot/bot";
import { checkCronSecret, logCronRun } from "@/lib/cron/guard";
import { revalidateOpenInterventions } from "@/lib/intervention-health";
import { hasScheduleConfig } from "@/lib/schedule/schedule-config";

// The cron secret is verified by the shared `checkCronSecret()` guard, which
// fails closed when `CRON_SECRET` is unset. The old `process.env.CRON_SECRET ||
// "local-cron"` default was guessable — anyone could trigger the sweep if the
// env var were ever unset. Each run is recorded in `AgentLog` (ledger C-05).

/* ── Helpers ─────────────────────────────────────────────────── */

/* `studentHasScheduleConfig` moved to `@/lib/schedule/schedule-config` as
   `hasScheduleConfig`. It only accepted the flat config shape, so every student
   whose config came from onboarding (`{ days: {...} }`) was skipped here and no
   curriculum session was ever assigned. See that module for the full story. */

/* ── Daily Brief (with dedup) ─────────────────────────────────── */

async function sendDailyBrief(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const now = new Date();

  // Only run between 6-9 AM once per process restart
  const hour = now.getHours();
  if (hour < 6 || hour > 9) return 0;

  // In-memory dedup: reset every time today changes
  const todayKey = today.toISOString().slice(0, 10);
  if ((global as any).__DAILY_BRIEF_DATE === todayKey) return 0;
  (global as any).__DAILY_BRIEF_DATE = todayKey;

  if ((global as any).__DAILY_BRIEF_SENT) return 0;
  (global as any).__DAILY_BRIEF_SENT = true;

  const sessions = await prisma.scheduleSession.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { gte: today, lt: tomorrow },
    },
    include: {
      student: { select: { id: true, name: true, telegramId: true, scheduleConfig: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  // Group by student
  const byStudent = new Map<
    string,
    {
      name: string;
      telegramId: string | null;
      sessions: { time: string; topic: string; subject: string | null; duration: number; type: string }[];
    }
  >();

  for (const s of sessions) {
    if (!s.student.telegramId) continue;
    const key = s.student.id;
    if (!byStudent.has(key)) {
      byStudent.set(key, { name: s.student.name, telegramId: s.student.telegramId, sessions: [] });
    }
    const timeStr = s.scheduledAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    byStudent.get(key)!.sessions.push({
      time: timeStr,
      topic: s.topic ?? "Belajar Mandiri",
      subject: s.subject ?? undefined as any,
      duration: s.durationMin,
      type: s.type,
    });
  }

  let sent = 0;
  for (const [, data] of byStudent) {
    if (!data.telegramId) continue;
    const brief = data.sessions
      .map(
        (s, i) =>
          `${i + 1}. ${s.time} — *${s.topic}*${s.subject ? ` (${s.subject})` : ""} · ${s.duration} mnt`,
      )
      .join("\n");

    const emoji = data.sessions.length > 2 ? "🔥" : data.sessions.length > 0 ? "📚" : "🌟";

    const text =
      `☀️ *Selamat Pagi, ${data.name}!*${data.sessions.length > 0
        ? `\n\nHari ini kamu ada *${data.sessions.length} sesi belajar*:\n\n${brief}\n\nJangan lupa persiapkan buku catatan ya! Semangat! 💪${emoji}`
        : `\n\nHari ini tidak ada sesi belajar terjadwal. Tapi kapan aja bisa chat aku buat latihan soal atau bahas materi! 😊`
      }`;

    try {
      await bot!.telegram.sendMessage(data.telegramId, text, { parse_mode: "Markdown" });
      sent++;
    } catch (err) {
      console.error(`[schedule-sweep] Daily brief failed for ${data.telegramId}:`, err);
    }
  }

  return sent;
}

/* ── Auto-assign sessions ────────────────────────────────────── */

async function assignSessionsIfNeeded(): Promise<number> {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  // Find active students who have NO scheduled sessions from now onward
  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      gradeLevel: true,
      scheduleConfig: true,
    },
  });

  let created = 0;

  for (const student of students) {
    // Skip if no schedule config — can't know when they want to study
    const hasConfig = hasScheduleConfig(student.scheduleConfig);
    if (!hasConfig) continue;

    const { assignWeeklyTopics, computeWeeklySlots } = await import(
      "@/agents/scheduler/assigner"
    );

    // The week the sweep is filling. `assignWeeklyTopics` filters its own
    // "taken" slots over this same window, so the two must agree.
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // How many sessions does this config actually ask for this week? Zero for
    // a config whose weekdays are all excluded or empty.
    const expectedSlots = computeWeeklySlots(student.scheduleConfig, weekStart).length;
    if (expectedSlots === 0) continue;

    /*
     * Count only sessions that fall inside the week being filled.
     *
     * The old guard was `count(all upcoming) > 0`. That conflated the exam
     * system's INTENSIVE sessions with the curriculum slots this function
     * assigns, so a student holding a single exam-driven session — Raihan, one
     * INTENSIVE on 2026-09-18 — was treated as "already scheduled" and never
     * got the rest of their week. Comparing against `expectedSlots` lets a
     * partially-filled week be topped up, while a fully-booked week still
     * short-circuits cheaply on every one of the ~145 sweeps per day.
     */
    const bookedThisWeek = await prisma.scheduleSession.count({
      where: {
        studentId: student.id,
        status: "SCHEDULED",
        scheduledAt: { gte: now, lt: weekEnd },
      },
    });

    if (bookedThisWeek >= expectedSlots) continue; // week already full

    // Assign for the rest of the week
    const result = await assignWeeklyTopics(student.id, weekStart.toISOString());
    created += result.sessionsCreated;

    if (result.sessionsCreated > 0) {
      console.log(
        `[schedule-sweep] Auto-assigned ${result.sessionsCreated} sessions for ${student.name} (${student.id})`,
      );
    }
  }

  return created;
}

/* ── Set default schedule config for students without one ────── */

async function setDefaultConfigIfMissing(): Promise<number> {
  // ⛔ Disabled: this was pushing generic "Belajar Mandiri" sessions
  // to all students who never configured their schedule,
  // causing spam. Only students who explicitly ask for study
  // schedule via the bot will get sessions.
  return 0;
}

/* ── Cron handler ────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const denied = checkCronSecret(request);
  if (denied) return denied;

  const result: Record<string, unknown> = {};
  let sweepErrors = 0;

  try {
    // 1. Set defaults for students without config (runs rarely)
    result.defaultsSet = await setDefaultConfigIfMissing();

    // 2. Run reminder sweep (H-1, T-30, missed)
    const sweep = await runReminderSweep();
    sweepErrors = sweep.errors.length;
    result.reminderSweep = {
      h1Sent: sweep.h1Sent,
      t30Sent: sweep.t30Sent,
      completedMarked: sweep.completedMarked,
      missedMarked: sweep.missedMarked,
      errors: sweep.errors.length,
    };

    if (sweep.errors.length > 0) {
      result.reminderErrors = sweep.errors.slice(0, 5);
    }

    // 3. Auto-assign sessions if needed
    result.sessionsAssigned = await assignSessionsIfNeeded();

    // 4. Close interventions whose trigger condition no longer holds.
    //    Without this, an alert raised in July stays "OPEN" on the dashboard
    //    forever — the admin sees a false alarm and the genuinely struggling
    //    student gets lost in the noise.
    const verdicts = await revalidateOpenInterventions({ apply: true });
    result.interventionsResolved = verdicts.filter((v) => !v.stillValid).length;
    result.interventionsOpen = verdicts.filter((v) => v.stillValid).length;

    // 5. Daily brief (only at 6-9 AM)
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 10) {
      result.dailyBriefSent = await sendDailyBrief();
    } else {
      result.dailyBriefSent = 0;
    }

    await logCronRun({
      agentType: "SCHEDULER",
      action: "schedule-sweep",
      status: sweepErrors > 0 ? "FAILED" : "COMPLETED",
      output: result,
      error: sweepErrors > 0 ? `${sweepErrors} reminder(s) failed` : undefined,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[schedule-sweep] Error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    await logCronRun({
      agentType: "SCHEDULER",
      action: "schedule-sweep",
      status: "FAILED",
      output: result,
      error: message,
    });
    return NextResponse.json(
      { error: message, ...result },
      { status: 500 },
    );
  }
}
