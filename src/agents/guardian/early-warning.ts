/**
 * Guardian — Early Warning System
 *
 * Detect issues that require intervention:
 * - Missed 3+ consecutive sessions
 * - Score drop >30% from average
 * - Mastery stuck >1 week without improvement
 *
 * Creates Intervention records with appropriate severity.
 *
 * @module @/agents/guardian/early-warning
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EarlyWarningResult {
  studentId: string;
  checkedAt: string;
  interventionsCreated: number;
  issues: DetectedIssue[];
}

export interface DetectedIssue {
  issueType: IssueType;
  severity: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
  description: string;
  interventionId: string;
}

type IssueType =
  | "missed_sessions"
  | "low_score"
  | "mastery_stuck";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Consecutive missed sessions that trigger a warning. */
const CONSECUTIVE_MISSED_THRESHOLD = 3;

/** Percentage drop from student's average score (%) to trigger warning. */
const SCORE_DROP_THRESHOLD = 30;

/** Days without mastery improvement to consider it "stuck". */
const MASTERY_STUCK_DAYS = 7;

/** Mastery improvement needed to avoid "stuck" flag (>0 means any improvement). */
const MIN_MASTERY_IMPROVEMENT = 0.01;

/* ------------------------------------------------------------------ */
/*  Main checker                                                       */
/* ------------------------------------------------------------------ */

/**
 * Run all early-warning checks for a student.
 *
 * Checks:
 *  1. Missed 3+ consecutive sessions
 *  2. Score drop >30% from average
 *  3. Mastery stuck >1 week without improvement
 *
 * Creates an Intervention record for each issue found (only if no
 * matching OPEN intervention already exists).
 */
export async function checkEarlyWarnings(studentId: string): Promise<EarlyWarningResult> {
  const issues: DetectedIssue[] = [];
  const now = new Date();

  // Run all checks concurrently
  const [missedIssue, scoreIssue, masteryIssue] = await Promise.all([
    checkMissedSessions(studentId),
    checkScoreDrop(studentId),
    checkMasteryStuck(studentId),
  ]);

  for (const issue of [missedIssue, scoreIssue, masteryIssue].filter(Boolean)) {
    if (!issue) continue;

    // Deduplicate: skip if an OPEN intervention for the same issueType already exists
    const existing = await prisma.intervention.findFirst({
      where: {
        studentId,
        issueType: issue.issueType,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
    });

    if (existing) {
      console.log(
        `[guardian/early-warning] Open intervention already exists for ${issue.issueType} (student=${studentId}), skipping`,
      );
      continue;
    }

    // Create intervention record
    const intervention = await prisma.intervention.create({
      data: {
        studentId,
        issueType: issue.issueType,
        severity: issue.severity,
        description: issue.description,
        actions: [],
      },
    });

    issues.push({
      issueType: issue.issueType,
      severity: issue.severity,
      description: issue.description,
      interventionId: intervention.id,
    });
  }

  // Log the check to AgentLog
  if (issues.length > 0) {
    await prisma.agentLog.create({
      data: {
        agentType: "GUARDIAN",
        action: "early_warning",
        studentId,
        status: "COMPLETED",
        input: json({ studentId, checkedAt: now.toISOString() }),
        output: json({ issuesCreated: issues.length, issues }),
      },
    });
  }

  return {
    studentId,
    checkedAt: now.toISOString(),
    interventionsCreated: issues.length,
    issues,
  };
}

/* ------------------------------------------------------------------ */
/*  Individual checks                                                  */
/* ------------------------------------------------------------------ */

/**
 * Check for 3+ consecutive missed sessions.
 */
async function checkMissedSessions(studentId: string): Promise<DetectedIssue | null> {
  const recentSessions = await prisma.scheduleSession.findMany({
    where: { studentId },
    orderBy: { scheduledAt: "desc" },
    take: CONSECUTIVE_MISSED_THRESHOLD,
    select: { status: true, scheduledAt: true },
  });

  if (recentSessions.length < CONSECUTIVE_MISSED_THRESHOLD) return null;

  // Check the N most recent sessions are all MISSED
  const allMissed = recentSessions.every((s) => s.status === "MISSED");
  if (!allMissed) return null;

  const mostRecentMissed = recentSessions[0].scheduledAt.toISOString();

  return {
    issueType: "missed_sessions",
    severity: "HIGH",
    description: `Telah melewatkan ${CONSECUTIVE_MISSED_THRESHOLD} sesi berturut-turut. Sesi terakhir yang terlewat: ${mostRecentMissed}.`,
    interventionId: "",
  };
}

/**
 * Check for score drop >30% from the student's running average.
 *
 * Compares the most recent attempt score against the average of all
 * previous attempts across ALL quizzes.
 */
async function checkScoreDrop(studentId: string): Promise<DetectedIssue | null> {
  // Get the most recent attempt
  const latestAttempt = await prisma.attempt.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    select: { score: true, maxScore: true, createdAt: true },
  });

  if (!latestAttempt || latestAttempt.maxScore === 0) return null;

  const latestPct = (latestAttempt.score / latestAttempt.maxScore) * 100;

  // Get all earlier attempts for average
  const earlierAttempts = await prisma.attempt.findMany({
    where: {
      studentId,
      createdAt: { lt: latestAttempt.createdAt },
    },
    select: { score: true, maxScore: true },
  });

  if (earlierAttempts.length < 3) return null; // need enough baseline

  const totalPct = earlierAttempts.reduce(
    (sum, a) => sum + (a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0),
    0,
  );
  const avgPct = totalPct / earlierAttempts.length;

  const drop = avgPct - latestPct;
  if (drop <= SCORE_DROP_THRESHOLD) return null;

  return {
    issueType: "low_score",
    severity: drop > 50 ? "HIGH" : "MEDIUM",
    description: `Nilai turun drastis: rata-rata sebelumnya ${avgPct.toFixed(0)}%, terakhir ${latestPct.toFixed(0)}% (turun ${drop.toFixed(0)}%).`,
    interventionId: "",
  };
}

/**
 * Check if mastery is stuck >1 week without improvement.
 *
 * For each subject, look at ProgressSnap records. If the latest snapshot
 * is >7 days old and mastery hasn't improved by at least MIN_MASTERY_IMPROVEMENT,
 * flag it.
 */
async function checkMasteryStuck(studentId: string): Promise<DetectedIssue | null> {
  const subjects = await prisma.progressSnap.groupBy({
    by: ["subject"],
    where: { studentId },
    _max: { snapDate: true },
  });

  const now = Date.now();

  for (const group of subjects) {
    const subject = group.subject;
    const latestSnapDate = group._max.snapDate;
    if (!latestSnapDate) continue;

    const daysSinceUpdate =
      (now - latestSnapDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < MASTERY_STUCK_DAYS) continue;

    // Get the two most recent snaps for this subject
    const snaps = await prisma.progressSnap.findMany({
      where: {
        studentId,
        subject,
      },
      orderBy: { snapDate: "desc" },
      take: 2,
      select: { mastery: true, snapDate: true },
    });

    if (snaps.length < 2) continue;

    const latestMastery = snaps[0].mastery;
    const previousMastery = snaps[1].mastery;
    const improvement = latestMastery - previousMastery;

    if (improvement < MIN_MASTERY_IMPROVEMENT) {
      return {
        issueType: "mastery_stuck",
        severity: "MEDIUM",
        description: `Mastery ${subject} stagnan selama ${Math.round(daysSinceUpdate)} hari (${(previousMastery * 100).toFixed(0)}% → ${(latestMastery * 100).toFixed(0)}%). Perlu intervensi belajar tambahan.`,
        interventionId: "",
      };
    }
  }

  return null;
}
