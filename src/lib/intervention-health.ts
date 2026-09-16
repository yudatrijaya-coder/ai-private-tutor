/**
 * Intervention health — closes alerts whose trigger condition no longer holds.
 *
 * Why this exists
 * ---------------
 * Interventions are raised by the scheduler when a condition holds (3 sessions
 * missed in a row, a score drop, a stuck topic). Nothing ever closed them when
 * the condition stopped holding, so the admin dashboard accumulated stale
 * alarms: measured 2026-09-16, all four OPEN interventions were raised
 * 2026-07-28, one student now had zero trailing misses and another just one.
 *
 * The dashboard reads these rows to build "Perlu Perhatian", so a stale row is
 * a false alarm shown to the admin — and it hides the genuinely struggling
 * student in the noise.
 *
 * Called from the schedule-sweep cron so it stays current without a human
 * running a script.
 *
 * @module @/lib/intervention-health
 */

import { prisma } from "@/lib/prisma";

/** Consecutive recent missed sessions needed to keep a `missed_sessions` alert. */
export const MISSED_STREAK_THRESHOLD = 3;

/** Fraction of maxScore a recent attempt must reach to clear a `low_score` alert. */
export const SCORE_RECOVERY_RATIO = 0.7;

/** How many trailing sessions to inspect when counting a miss streak. */
const STREAK_LOOKBACK = 6;

export interface InterventionVerdict {
  id: string;
  studentName: string;
  issueType: string;
  severity: string;
  stillValid: boolean;
  reason: string;
}

/**
 * Decide whether an intervention still describes reality.
 *
 * Only conditions with a deterministic rule are evaluated. Anything else is
 * kept open — an unknown issue type needs a human, and silently closing it
 * would lose the alert.
 */
export async function evaluateIntervention(iv: {
  studentId: string;
  issueType: string;
}): Promise<{ stillValid: boolean; reason: string }> {
  switch (iv.issueType) {
    case "missed_sessions": {
      const sessions = await prisma.scheduleSession.findMany({
        where: { studentId: iv.studentId, scheduledAt: { lt: new Date() } },
        orderBy: { scheduledAt: "desc" },
        take: STREAK_LOOKBACK,
        select: { status: true },
      });

      let streak = 0;
      for (const s of sessions) {
        if (s.status === "MISSED") streak++;
        else break;
      }

      return {
        stillValid: streak >= MISSED_STREAK_THRESHOLD,
        reason: `${streak} sesi terlewat berturut-turut (ambang ${MISSED_STREAK_THRESHOLD})`,
      };
    }

    case "low_score": {
      const attempt = await prisma.examAttempt.findFirst({
        where: { studentId: iv.studentId },
        orderBy: { createdAt: "desc" },
        select: { score: true, exam: { select: { maxScore: true } } },
      });

      if (!attempt) return { stillValid: false, reason: "tidak ada ujian tercatat" };

      const max = attempt.exam?.maxScore || 100;
      const ratio = attempt.score / max;
      return {
        stillValid: ratio < SCORE_RECOVERY_RATIO,
        reason: `nilai terakhir ${Math.round(ratio * 100)}% (pulih di ${Math.round(
          SCORE_RECOVERY_RATIO * 100,
        )}%)`,
      };
    }

    case "mastery_stuck": {
      const severe = await prisma.topicMastery.count({
        where: { studentId: iv.studentId, weaknessLevel: "severe" },
      });
      return { stillValid: severe > 0, reason: `${severe} topik masih lemah berat` };
    }

    default:
      return { stillValid: true, reason: "tidak ada aturan otomatis — perlu tinjauan manusia" };
  }
}

/**
 * Re-check every open intervention and resolve the ones whose condition is gone.
 *
 * Returns the verdicts so a caller (cron log or CLI) can report what changed.
 */
export async function revalidateOpenInterventions(options?: {
  apply?: boolean;
}): Promise<InterventionVerdict[]> {
  const apply = options?.apply ?? true;

  const open = await prisma.intervention.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    include: { student: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const verdicts: InterventionVerdict[] = [];

  for (const iv of open) {
    const { stillValid, reason } = await evaluateIntervention(iv);

    verdicts.push({
      id: iv.id,
      studentName: iv.student.name,
      issueType: iv.issueType,
      severity: iv.severity,
      stillValid,
      reason,
    });

    if (!stillValid && apply) {
      await prisma.intervention.update({
        where: { id: iv.id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          // Keep the original description; append why it closed so the history
          // stays auditable after the fact.
          description: `${iv.description}\n\n[ditutup otomatis ${new Date()
            .toISOString()
            .slice(0, 10)}: ${reason}]`,
        },
      });
    }
  }

  return verdicts;
}
