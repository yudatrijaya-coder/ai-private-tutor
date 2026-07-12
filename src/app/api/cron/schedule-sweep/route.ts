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

const CRON_SECRET = process.env.CRON_SECRET || "local-cron";

/* ── Helpers ─────────────────────────────────────────────────── */

function studentHasScheduleConfig(
  config: unknown,
): config is {
  sessionsPerDay?: number;
  excludeDays?: string[];
  customTimes?: Record<string, string>;
  preferredTime?: string;
} {
  if (!config || typeof config !== "object") return false;
  const c = config as Record<string, unknown>;
  return (
    c.sessionsPerDay !== undefined ||
    c.excludeDays !== undefined ||
    c.customTimes !== undefined ||
    c.preferredTime !== undefined
  );
}

/* ── Daily Brief ─────────────────────────────────────────────── */

async function sendDailyBrief(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

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
    const timeStr = s.scheduledAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
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
    const hasConfig = studentHasScheduleConfig(student.scheduleConfig);
    if (!hasConfig) continue;

    // Check if they already have upcoming sessions
    const existingCount = await prisma.scheduleSession.count({
      where: {
        studentId: student.id,
        status: "SCHEDULED",
        scheduledAt: { gte: now },
      },
    });

    if (existingCount > 0) continue; // already has sessions — skip

    // Auto-assign one day's worth of sessions (today or tomorrow)
    const { assignWeeklyTopics } = await import("@/agents/scheduler/assigner");
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);

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
  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, scheduleConfig: true },
  });

  const defaults = {
    sessionsPerDay: 1,
    preferredTime: "16:00",
    excludeDays: ["sunday"],
  };

  let updated = 0;
  for (const s of students) {
    if (!s.scheduleConfig) {
      await prisma.student.update({
        where: { id: s.id },
        data: { scheduleConfig: defaults },
      });
      updated++;
    }
  }

  if (updated > 0) {
    console.log(`[schedule-sweep] Set default scheduleConfig for ${updated} student(s)`);
  }

  return updated;
}

/* ── Cron handler ────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result: Record<string, unknown> = {};

  try {
    // 1. Set defaults for students without config (runs rarely)
    result.defaultsSet = await setDefaultConfigIfMissing();

    // 2. Run reminder sweep (H-1, T-30, missed)
    const sweep = await runReminderSweep();
    result.reminderSweep = {
      h1Sent: sweep.h1Sent,
      t30Sent: sweep.t30Sent,
      missedMarked: sweep.missedMarked,
      errors: sweep.errors.length,
    };

    if (sweep.errors.length > 0) {
      result.reminderErrors = sweep.errors.slice(0, 5);
    }

    // 3. Auto-assign sessions if needed
    result.sessionsAssigned = await assignSessionsIfNeeded();

    // 4. Daily brief (only at 6-9 AM)
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 10) {
      result.dailyBriefSent = await sendDailyBrief();
    } else {
      result.dailyBriefSent = 0;
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[schedule-sweep] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error", ...result },
      { status: 500 },
    );
  }
}
