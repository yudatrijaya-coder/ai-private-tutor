/**
 * Motivation Trigger — check if a student deserves a motivation video.
 *
 * Triggers when a milestone is reached:
 * - 7-day study streak
 * - Mastery jump (≥ 20% improvement in a subject)
 * - First perfect quiz score
 * - Completed 10 sessions
 *
 * Milestone state is stored in Student.scheduleConfig.motivationMilestonesSent[].
 *
 * @module @/agents/scheduler/motivation
 */

import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type MilestoneType =
  | "7_day_streak"
  | "mastery_jump"
  | "first_perfect_score"
  | "10_sessions_completed";

export interface MilestoneCheck {
  earned: MilestoneType[];
  studentId: string;
}

export interface MotivationTrigger {
  studentId: string;
  milestone: MilestoneType;
  /** Human-readable reason (Bahasa Indonesia) */
  message: string;
  /** URL or identifier to a pre-recorded motivation video to send */
  videoUrl?: string;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Check if a student has earned any motivation milestones.
 * Returns a list of newly-earned milestones that should trigger a video.
 */
export async function checkMilestones(studentId: string): Promise<MotivationTrigger[]> {
  const triggers: MotivationTrigger[] = [];

  const [streak, masteryJump, perfectScore, completedCount] = await Promise.all([
    checkStreakMilestone(studentId),
    checkMasteryJumpMilestone(studentId),
    checkPerfectScoreMilestone(studentId),
    checkCompletedSessionsMilestone(studentId),
  ]);

  if (streak) triggers.push(streak);
  if (masteryJump) triggers.push(masteryJump);
  if (perfectScore) triggers.push(perfectScore);
  if (completedCount) triggers.push(completedCount);

  return triggers;
}

/**
 * Record a motivation video as sent (prevents re-sending).
 * Milestones are tracked in the student's scheduleConfig JSON field.
 */
export async function markMotivationSent(
  studentId: string,
  milestone: MilestoneType,
): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { scheduleConfig: true },
  });

  const config = ((student?.scheduleConfig ?? {}) as Record<string, unknown>) ?? {};
  const milestonesSent = (config.motivationMilestonesSent as string[]) ?? [];

  if (!milestonesSent.includes(milestone)) {
    milestonesSent.push(milestone);
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      scheduleConfig: { ...config, motivationMilestonesSent: milestonesSent },
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function getMilestonesSent(studentId: string): Promise<string[]> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { scheduleConfig: true },
  });
  const config = ((student?.scheduleConfig ?? {}) as Record<string, unknown>) ?? {};
  return (config.motivationMilestonesSent as string[]) ?? [];
}

/* ------------------------------------------------------------------ */
/*  Milestone checkers                                                 */
/* ------------------------------------------------------------------ */

/**
 * 7-day study streak — 7 consecutive days with at least one COMPLETED session.
 */
async function checkStreakMilestone(
  studentId: string,
): Promise<MotivationTrigger | null> {
  const milestonesSent = await getMilestonesSent(studentId);
  if (milestonesSent.includes("7_day_streak")) return null;

  const completedSessions = await prisma.scheduleSession.findMany({
    where: { studentId, status: "COMPLETED" },
    select: { completedAt: true },
    orderBy: { completedAt: "desc" },
  });

  if (completedSessions.length === 0) return null;

  const seenDays = new Set<string>();
  for (const s of completedSessions) {
    if (!s.completedAt) continue;
    seenDays.add(s.completedAt.toISOString().slice(0, 10));
  }

  const sortedDays = Array.from(seenDays).sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  let consecutive = 0;

  for (let i = 0; i < sortedDays.length; i++) {
    const expectedDay = new Date(
      new Date(today).getTime() - i * 86_400_000,
    ).toISOString().slice(0, 10);
    if (sortedDays[i] === expectedDay) {
      consecutive++;
    } else {
      break;
    }
  }

  if (consecutive >= 7) {
    return {
      studentId,
      milestone: "7_day_streak",
      message: `Selamat! Kamu sudah belajar 7 hari berturut-turut! 🎉 Pertahankan semangat belajarnya! 🔥`,
      videoUrl: process.env.MOTIVATION_VIDEO_STREAK_7,
    };
  }

  return null;
}

/**
 * Mastery jump — ≥20% improvement in any subject between the two latest snaps.
 */
async function checkMasteryJumpMilestone(
  studentId: string,
): Promise<MotivationTrigger | null> {
  const milestonesSent = await getMilestonesSent(studentId);
  if (milestonesSent.includes("mastery_jump")) return null;

  const snaps = await prisma.progressSnap.findMany({
    where: { studentId },
    orderBy: { snapDate: "desc" },
  });

  // Group snaps by subject
  const snapBySubject = new Map<string, typeof snaps>();
  for (const snap of snaps) {
    const existing = snapBySubject.get(snap.subject) ?? [];
    existing.push(snap);
    snapBySubject.set(snap.subject, existing);
  }

  const entries = Array.from(snapBySubject.entries());
  for (const [subject, subjectSnaps] of entries) {
    if (subjectSnaps.length < 2) continue;

    const latest = subjectSnaps[0].mastery;
    const previous = subjectSnaps[1].mastery;
    const jump = latest - previous;

    if (jump >= 0.2) {
      return {
        studentId,
        milestone: "mastery_jump",
        message:
          `Keren! Nilai ${subject} kamu naik ${Math.round(jump * 100)}%! 🚀` +
          ` Terus belajar dan kamu pasti makin jago! 💪`,
        videoUrl: process.env.MOTIVATION_VIDEO_MASTERY_JUMP,
      };
    }
  }

  return null;
}

/**
 * First perfect quiz score — student scored 100% on a quiz attempt.
 */
async function checkPerfectScoreMilestone(
  studentId: string,
): Promise<MotivationTrigger | null> {
  const milestonesSent = await getMilestonesSent(studentId);
  if (milestonesSent.includes("first_perfect_score")) return null;

  const perfectAttempt = await prisma.attempt.findFirst({
    where: { studentId, score: { gt: 0 } },
    orderBy: { createdAt: "desc" },
    select: { score: true, maxScore: true },
  });

  if (perfectAttempt && perfectAttempt.score === perfectAttempt.maxScore) {
    return {
      studentId,
      milestone: "first_perfect_score",
      message: `Wow, nilai sempurna! 🎯 Kamu berhasil menjawab semua soal dengan benar! Luar biasa! 🌟`,
      videoUrl: process.env.MOTIVATION_VIDEO_PERFECT_SCORE,
    };
  }

  return null;
}

/**
 * 10 sessions completed milestone.
 */
async function checkCompletedSessionsMilestone(
  studentId: string,
): Promise<MotivationTrigger | null> {
  const milestonesSent = await getMilestonesSent(studentId);
  if (milestonesSent.includes("10_sessions_completed")) return null;

  const count = await prisma.scheduleSession.count({
    where: { studentId, status: "COMPLETED" },
  });

  if (count >= 10) {
    return {
      studentId,
      milestone: "10_sessions_completed",
      message:
        `🎉 Hebat! Kamu sudah menyelesaikan 10 sesi belajar! ` +
        `Terus semangat, kamu pasti bisa jadi juara kelas! 🏆`,
      videoUrl: process.env.MOTIVATION_VIDEO_10_SESSIONS,
    };
  }

  return null;
}
