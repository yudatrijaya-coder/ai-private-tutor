import { prisma } from "@/lib/prisma";
import type { Student, ExamSchedule } from "@/generated/prisma/client";

const DASHBOARD = "https://senangbelajar.web.id/student/exam";

/**
 * Weekly Exam Scheduler — enforce layer.
 *
 * Responsibilities:
 * 1. Pick the next subject for a student's weekly exam (rotation across subjects
 *    with existing WEEKLY exams, preferring the subject with the most recent exam).
 * 2. Create an ExamSchedule (PENDING) for the upcoming week.
 * 3. Send reminders: H-1 (09:00) and H-hour (15 min before).
 * 4. Chase un-attempted exams after the scheduled time.
 */

/** Default exam time: Sunday 19:00 WIB (UTC+7). */
export function defaultExamTime(from: Date = new Date()): Date {
  // Next Sunday at 19:00 local server time (WIB = UTC+7)
  const d = new Date(from);
  const day = d.getDay(); // 0 = Sunday
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + daysUntilSunday);
  d.setHours(19, 0, 0, 0);
  return d;
}

/** Subjects in rotation order (for deterministic pick when no history). */
const SUBJECT_ROTATION = ["Matematika", "IPA", "Bahasa Indonesia", "Bahasa Inggris", "IPS"];

/**
 * Pick the next subject for a student's weekly exam.
 * Strategy: subjects that already have WEEKLY exams for this grade, rotated so
 * the subject with the OLDEST last exam goes first.
 */
export async function pickNextSubject(student: Student): Promise<string | null> {
  // All WEEKLY exams available for this grade
  const exams = await prisma.exam.findMany({
    where: { type: "WEEKLY", gradeLevel: student.gradeLevel, isActive: true },
    select: { id: true, subject: true, weekNumber: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (exams.length === 0) return null;

  // Which subjects has this student ALREADY done this week (any WEEKLY exam)?
  const doneSubjectSet = new Set<string>();
  const recentSchedules = await prisma.examSchedule.findMany({
    where: { studentId: student.id, status: { in: ["CONFIRMED", "COMPLETED"] } },
    select: { exam: { select: { subject: true } } },
    orderBy: { scheduledAt: "desc" },
    take: 20,
  });
  for (const s of recentSchedules) {
    if (s.exam?.subject) doneSubjectSet.add(s.exam.subject);
  }

  // Candidate subjects (have a WEEKLY exam, not done this week already)
  const subjects = [...new Set(exams.map((e) => e.subject))].filter(
    (s) => !doneSubjectSet.has(s),
  );

  if (subjects.length === 0) {
    // All subjects done → rotate back to the least-recently-done one
    const lastSubject = recentSchedules[0]?.exam?.subject ?? null;
    const pool = [...new Set(exams.map((e) => e.subject))];
    if (lastSubject) {
      const idx = pool.indexOf(lastSubject);
      if (idx >= 0) return pool[(idx + 1) % pool.length];
    }
    return pool[0] ?? null;
  }

  // Prefer rotation order for determinism
  for (const s of SUBJECT_ROTATION) {
    if (subjects.includes(s)) return s;
  }
  return subjects[0];
}

/** Pick the actual WEEKLY exam for a subject + week number. */
export async function pickExamForSubject(
  subject: string,
  gradeLevel: string,
): Promise<{ id: string; title: string } | null> {
  const exam = await prisma.exam.findFirst({
    where: { type: "WEEKLY", subject, gradeLevel: gradeLevel as any, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  });
  return exam ? { id: exam.id, title: exam.title } : null;
}

/**
 * Create a PENDING ExamSchedule for a student next week (idempotent:
 * won't create a second schedule if one is already PENDING/CONFIRMED for
 * the same week window).
 */
export async function scheduleNextWeeklyExam(student: Student): Promise<ExamSchedule | null> {
  // Already scheduled for this week?
  const now = new Date();
  const weekStart = startOfWeekUtc(now);
  const existing = await prisma.examSchedule.findFirst({
    where: {
      studentId: student.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledAt: { gte: weekStart },
    },
  });
  if (existing) return existing;

  const subject = await pickNextSubject(student);
  if (!subject) return null;

  const exam = await pickExamForSubject(subject, student.gradeLevel);
  if (!exam) return null;

  const scheduledAt = defaultExamTime(now);

  return prisma.examSchedule.create({
    data: {
      studentId: student.id,
      examId: exam.id,
      scheduledAt,
      status: "PENDING",
    },
  });
}

/** Monday 00:00 local (UTC+7) of the current week. */
function startOfWeekUtc(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday = 0
  copy.setDate(copy.getDate() + diff);
  return copy;
}

/** Send a reminder via the bot (webhook mode: POST to Bot API directly). */
export async function sendTelegramMessage(telegramId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !telegramId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: "Markdown",
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[exam-scheduler] sendTelegramMessage error:", err);
    return false;
  }
}

/** Format a Telegram inline keyboard. */
function inlineKeyboard(rows: { text: string; callback_data: string }[][]): string {
  return JSON.stringify({ inline_keyboard: rows });
}

/**
 * Run the weekly exam scheduler sweep.
 * Called by the cron endpoint every 30 minutes.
 */
export async function runExamSchedulerSweep(): Promise<{
  remindersH1: number;
  remindersH0: number;
  chased: number;
  schedulesCreated: number;
}> {
  const now = new Date();
  const result = { remindersH1: 0, remindersH0: 0, chased: 0, schedulesCreated: 0 };

  // 1. Ensure every active student has a schedule for the coming week
  const students = await prisma.student.findMany({
    where: { status: "ACTIVE", telegramId: { not: null } },
  });
  for (const s of students) {
    try {
      const created = await scheduleNextWeeklyExam(s);
      if (created) result.schedulesCreated++;
    } catch (err) {
      console.error(`[exam-scheduler] schedule for ${s.studentId}:`, err);
    }
  }

  // 2. Reminders — fetch schedules needing them
  const h1WindowStart = new Date(now.getTime() - 36e5); // sent sometime in last 1h
  const h1WindowEnd = new Date(now.getTime() + 36e5);

  const dueH1 = await prisma.examSchedule.findMany({
    where: {
      status: "PENDING",
      remindedH1: false,
      scheduledAt: {
        gte: new Date(now.getTime() + 24 * 36e5 - 36e5),
        lte: new Date(now.getTime() + 24 * 36e5 + 36e5),
      },
    },
    include: { student: true, exam: true },
  });

  for (const sch of dueH1) {
    const tgId = sch.student.telegramId;
    if (!tgId) continue;
    const timeLabel = formatTime(sch.scheduledAt);
    const ok = await sendTelegramMessage(
      tgId,
      `📝 *Weekly Exam Besok!*\n\n` +
        `${sch.exam.title}\n` +
        `⏰ *${timeLabel} WIB*\n\n` +
        `Jangan lupa ya, ${sch.student.name}! 💪`,
    );
    if (ok) {
      await prisma.examSchedule.update({
        where: { id: sch.id },
        data: { remindedH1: true },
      });
      result.remindersH1++;
    }
  }

  // H-hour reminder — 15 min before scheduledAt
  const dueH0 = await prisma.examSchedule.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      remindedH0: false,
      scheduledAt: {
        gte: new Date(now.getTime() - 36e5),
        lte: new Date(now.getTime() + 36e5),
      },
    },
    include: { student: true, exam: true },
  });

  for (const sch of dueH0) {
    const tgId = sch.student.telegramId;
    if (!tgId) continue;
    const link = DASHBOARD;
    const ok = await sendTelegramMessage(
      tgId,
      `🧠 *Waktunya Weekly Exam!*\n\n` +
        `${sch.exam.title}\n\n` +
        `Klik di bawah untuk mulai:\n` +
        `[➡️ Kerjakan Sekarang](${link})\n\n` +
        `Jawaban terkunci selama exam. Kerjakan sampai selesai ya! 🔒`,
    );
    if (ok) {
      await prisma.examSchedule.update({
        where: { id: sch.id },
        data: { remindedH0: true },
      });
      result.remindersH0++;
    }
  }

  // 3. Chase — scheduledAt passed, status still PENDING, no attempt made
  const overdue = await prisma.examSchedule.findMany({
    where: {
      status: "PENDING",
      scheduledAt: { lt: now },
    },
    include: { student: true, exam: true },
  });

  for (const sch of overdue) {
    // Skip if student already has a COMPLETED attempt on this exam
    const attempt = await prisma.examAttempt.findFirst({
      where: {
        studentId: sch.studentId,
        examId: sch.examId,
        status: { in: ["COMPLETED", "ANALYZED"] },
      },
    });
    if (attempt) {
      await prisma.examSchedule.update({
        where: { id: sch.id },
        data: { status: "COMPLETED" },
      });
      continue;
    }

    const tgId = sch.student.telegramId;
    if (tgId) {
      const link = DASHBOARD;
      await sendTelegramMessage(
        tgId,
        `⏰ *Weekly Exam belum dikerjakan!*\n\n` +
          `${sch.exam.title} sudah lewat jadwalnya (${formatTime(sch.scheduledAt)} WIB).\n\n` +
          `Kamu masih bisa kerjakan sekarang:\n` +
          `[➡️ Kerjakan Sekarang](${link})\n\n` +
          `Jangan ditunda-tunda ya, ${sch.student.name}! 🔥`,
      );
    }
    await prisma.examSchedule.update({
      where: { id: sch.id },
      data: { status: "MISSED" },
    });
    result.chased++;
  }

  return result;
}

/** Format "Minggu, 19:00". */
function formatTime(d: Date): string {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const day = days[d.getDay()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day}, ${hh}:${mm}`;
}

/** Unused import guard (kept for tree-shaking clarity). */
export type { ExamSchedule };

/**
 * Enforce an improvement plan: turn the plan's recommended topics into
 * INTENSIVE ScheduleSessions starting tomorrow, one per weekday, and mark
 * the plan APPLIED so it isn't re-applied on the next sweep.
 */
export async function enforceImprovementPlan(attemptId: string): Promise<number> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { student: true, improvementPlan: true, exam: true },
  });
  if (!attempt || !attempt.improvementPlan) return 0;
  if (attempt.improvementPlan.status === "APPLIED") return 0;

  const plan = attempt.improvementPlan;
  const recs = (plan.recommendedSch as any[]) || [];
  if (recs.length === 0) return 0;

  // Sort: high priority first
  const ordered = [...recs].sort(
    (a, b) => prioRank(a.priority) - prioRank(b.priority),
  );

  // Skip already-created sessions for the same topic+subject within 7 days
  const existing = await prisma.scheduleSession.findMany({
    where: {
      studentId: attempt.studentId,
      scheduledAt: { gte: new Date() },
    },
    select: { topic: true, subject: true },
  });
  const existingKeys = new Set(
    existing.map((e) => `${e.topic}|${e.subject}`),
  );

  let created = 0;
  for (let i = 0; i < ordered.length; i++) {
    const rec = ordered[i];
    const topic = String(rec.topic ?? "").trim();
    const subject = String(rec.subject ?? attempt.exam?.subject ?? "Matematika").trim();
    if (!topic) continue;
    const key = `${topic}|${subject}`;
    if (existingKeys.has(key)) continue;

    await prisma.scheduleSession.create({
      data: {
        studentId: attempt.studentId,
        type: "INTENSIVE",
        topic,
        subject,
        scheduledAt: nextWeekday(new Date(), i),
        durationMin: Number(rec.durationMin) || 60,
        status: "SCHEDULED",
        metadata: { source: "improvement-plan", attemptId: attempt.id },
      },
    });
    existingKeys.add(key);
    created++;
  }

  await prisma.improvementPlan.update({
    where: { id: plan.id },
    data: { status: "APPLIED" },
  });

  return created;
}

function prioRank(p: string | undefined): number {
  switch (p) {
    case "high": return 0;
    case "medium": return 1;
    default: return 2;
  }
}

/** Date i weekdays from today (skips weekend), at 19:00 local time. */
function nextWeekday(from: Date, i: number): Date {
  const d = new Date(from);
  d.setHours(19, 0, 0, 0);
  let added = 0;
  while (added < i + 1) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

/**
 * Send exam recap to student (and parent if linked) after attempt is ANALYZED.
 * Called by the improvement-analysis queue worker after analysis completes.
 */
export async function sendExamRecap(
  attemptId: string,
  options?: { notifyParent?: boolean },
): Promise<boolean> {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        student: true,
        exam: { include: { questions: true } },
        improvementPlan: true,
      },
    });
    if (!attempt) return false;

    const { student, exam } = attempt;
    const pct = Math.round((attempt.score / Math.max(1, attempt.maxScore)) * 100);
    const totalQ = exam.questions.length;
    const correct = Math.round((attempt.score / Math.max(1, attempt.maxScore)) * totalQ);

    const emoji = pct >= 70 ? "🎉" : pct >= 50 ? "💪" : "📚";
    const message =
      `${emoji} *Hasil Weekly Exam Kamu*\n\n` +
      `📋 ${exam.title}\n` +
      `✅ Benar: ${correct} dari ${totalQ}\n` +
      `📊 Nilai: *${pct}%*\n\n` +
      (attempt.improvementPlan
        ? `💡 ${attempt.improvementPlan.aiNarrative.slice(0, 300)}\n\n`
        : ``) +
      `[📝 Lihat Pembahasan](${DASHBOARD})\n\n` +
      (pct >= 70
        ? `Luar biasa, ${student.name}! Pertahankan! 🔥`
        : `Semangat, ${student.name}! Ayo tingkatkan minggu depan! 💪`);

    let sentStudent = false;
    if (student.telegramId) {
      sentStudent = await sendTelegramMessage(student.telegramId, message);
    }

    if (options?.notifyParent !== false && student.parentTelegramId) {
      const parentMsg =
        `📊 *Laporan Weekly Exam — ${student.name}*\n\n` +
        `📋 ${exam.title}\n` +
        `📊 Nilai: *${pct}%* (${correct}/${totalQ} benar)\n\n` +
        (attempt.improvementPlan
          ? `💡 Catatan tutor: ${attempt.improvementPlan.aiNarrative.slice(0, 200)}\n\n`
          : ``) +
        `Lihat detail di dashboard: ${DASHBOARD}`;
      await sendTelegramMessage(student.parentTelegramId, parentMsg);
    }

    return sentStudent;
  } catch (err) {
    console.error("[exam-scheduler] sendExamRecap error:", err);
    return false;
  }
}
