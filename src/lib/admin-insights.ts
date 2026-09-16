/**
 * Admin overview queries — the data behind `/dashboard`.
 *
 * Kept out of the page component so the numbers have one definition. The page
 * previously computed some of these inline (studied minutes, missed sessions)
 * but never surfaced the operational tables (interventions, agent logs, API
 * usage) that already hold the most actionable information.
 *
 * Every query here reads persisted rows. No estimates.
 *
 * @module @/lib/admin-insights
 */

import { cache } from "react";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface AttentionItem {
  /** "INTERVENTION" | "INACTIVE" | "WEAK_TOPIC" | "REVIEW_DUE" */
  kind: string;
  severity: "critical" | "warning" | "info";
  studentName: string;
  studentId: string;
  /** Student UUID, for linking to the detail page. */
  id: string;
  title: string;
  detail: string;
  since: string;
}

export interface UpcomingExamItem {
  scheduleId: string;
  studentName: string;
  studentCode: string;
  studentUuid: string;
  title: string;
  subject: string;
  type: string;
  scheduledAt: string;
  status: string;
  daysAway: number;
}

export interface AdminOverview {
  totals: {
    students: number;
    active: number;
    pending: number;
    newToday: number;
    activeLast7d: number;
  };
  sessions: {
    total: number;
    scheduled: number;
    completed: number;
    missed: number;
    /** 0-100, completed / (completed + missed). */
    completionRate: number;
  };
  attention: AttentionItem[];
  upcomingExams: UpcomingExamItem[];
  /** Last 7 days of student activity, oldest first. */
  activityTrend: { date: string; label: string; count: number }[];
  content: {
    materials: number;
    quizzes: number;
    exams: number;
    curriculums: number;
  };
  system: {
    agentCompleted: number;
    agentFailed: number;
    agentFailed7d: number;
    apiCalls7d: number;
    tokens7d: number;
    cost7d: number;
    avgLatencyMs: number | null;
    suspiciousLatency: boolean;
    improvementPlansApplied: number;
    /** Spaced-repetition questions due across all students. */
    dueReviews: number;
  };
}

/**
 * Assemble the whole admin overview in one pass. Called from a Suspense-wrapped
 * server component, so latency here does not block the page shell.
 *
 * Wrapped in React `cache` so the five dashboard sections that each need a
 * slice of this data share one execution per request instead of firing the
 * same dozen aggregates five times over.
 */
async function getAdminOverviewUncached(): Promise<AdminOverview> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * DAY_MS);
  const weekAhead = new Date(todayStart.getTime() + 7 * DAY_MS);

  const [
    students,
    sessionGroups,
    interventions,
    upcoming,
    activityRows,
    materials,
    quizzes,
    exams,
    curriculums,
    agentGroups,
    agentFailed7d,
    usage,
    plansApplied,
    dueReviews,
    severeTopics,
  ] = await Promise.all([
    prisma.student.findMany({
      select: { id: true, name: true, studentId: true, status: true, createdAt: true, lastActivityDate: true },
    }),
    prisma.scheduleSession.groupBy({ by: ["status"], _count: true }),
    prisma.intervention.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 20,
      include: {
        student: { select: { id: true, name: true, studentId: true } },
      },
    }),
    prisma.examSchedule.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledAt: { gte: todayStart, lte: weekAhead },
      },
      orderBy: { scheduledAt: "asc" },
      take: 12,
      include: {
        exam: { select: { title: true, subject: true, type: true } },
        student: { select: { id: true, name: true, studentId: true } },
      },
    }),
    prisma.studentActivity.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, studentId: true },
    }),
    prisma.material.count(),
    prisma.quiz.count(),
    prisma.exam.count(),
    prisma.curriculum.count(),
    prisma.agentLog.groupBy({ by: ["status"], _count: true }),
    prisma.agentLog.count({
      where: { status: "FAILED", createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.apiUsage.aggregate({
      where: { createdAt: { gte: sevenDaysAgo } },
      _sum: { totalTokens: true, costUsd: true },
      _count: true,
      _avg: { latencyMs: true },
    }),
    prisma.improvementPlan.count({ where: { status: "APPLIED" } }),
    prisma.reviewQueue.count({ where: { mastered: false, dueAt: { lte: now } } }),
    prisma.topicMastery.findMany({
      where: { weaknessLevel: "severe" },
      orderBy: { mastery: "asc" },
      take: 10,
      include: {
        student: { select: { id: true, name: true, studentId: true } },
      },
    }),
  ]);

  /* ---- totals ---- */
  const active = students.filter((s) => s.status === "ACTIVE");
  const pending = students.filter((s) => s.status === "PENDING");
  const newToday = students.filter(
    (s) => isoDate(s.createdAt) === isoDate(now),
  ).length;

  const activeIds7d = new Set(
    activityRows
      .filter((a) => a.createdAt >= sevenDaysAgo)
      .map((a) => a.studentId),
  );

  /* ---- sessions ---- */
  const sessionCount = (status: string) =>
    sessionGroups.find((g) => g.status === status)?._count ?? 0;
  const completed = sessionCount("COMPLETED");
  const missed = sessionCount("MISSED");
  const graded = completed + missed;

  /* ---- attention list ---- */
  const attention: AttentionItem[] = [];

  const SEVERITY_MAP: Record<string, AttentionItem["severity"]> = {
    EMERGENCY: "critical",
    HIGH: "critical",
    MEDIUM: "warning",
    LOW: "info",
  };

  for (const i of interventions) {
    attention.push({
      kind: "Intervention",
      severity: SEVERITY_MAP[i.severity] ?? "warning",
      studentName: i.student.name,
      studentId: i.student.studentId,
      id: i.student.id,
      title: i.issueType.replace(/_/g, " "),
      detail: i.description,
      since: i.createdAt.toISOString(),
    });
  }

  // A student with no recorded activity for 3+ days is the earliest signal
  // before sessions start being missed.
  const staleCutoff = new Date(todayStart.getTime() - 3 * DAY_MS);
  for (const s of active) {
    if (!s.lastActivityDate) continue;
    if (s.lastActivityDate < staleCutoff) {
      const days = Math.round(
        (todayStart.getTime() - startOfDay(s.lastActivityDate).getTime()) / DAY_MS,
      );
      attention.push({
        kind: "Tidak Aktif",
        severity: days >= 7 ? "critical" : "warning",
        studentName: s.name,
        studentId: s.studentId,
        id: s.id,
        title: `Tidak belajar ${days} hari`,
        detail: `Aktivitas terakhir ${s.lastActivityDate.toLocaleDateString("id-ID")}.`,
        since: s.lastActivityDate.toISOString(),
      });
    }
  }

  for (const t of severeTopics) {
    attention.push({
      kind: "Topik Lemah",
      severity: "warning",
      studentName: t.student.name,
      studentId: t.student.studentId,
      id: t.student.id,
      title: `${t.subject} — ${t.topic}`,
      detail: `Penguasaan ${Math.round(t.mastery)}% setelah ${t.quizAttempts + t.examAttempts}× dikerjakan.`,
      since: t.lastAttemptAt.toISOString(),
    });
  }

  attention.sort((a, b) => {
    const rank = { critical: 0, warning: 1, info: 2 };
    const diff = rank[a.severity] - rank[b.severity];
    if (diff !== 0) return diff;
    return new Date(b.since).getTime() - new Date(a.since).getTime();
  });

  /* ---- upcoming exams ---- */
  const upcomingExams: UpcomingExamItem[] = upcoming.map((s) => ({
    scheduleId: s.id,
    studentName: s.student.name,
    studentCode: s.student.studentId,
    studentUuid: s.student.id,
    title: s.exam.title,
    subject: s.exam.subject,
    type: s.exam.type,
    scheduledAt: s.scheduledAt.toISOString(),
    status: s.status,
    daysAway: Math.max(
      0,
      Math.round(
        (startOfDay(s.scheduledAt).getTime() - todayStart.getTime()) / DAY_MS,
      ),
    ),
  }));

  /* ---- 7-day activity trend ---- */
  const activityTrend: { date: string; label: string; count: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo.getTime() + i * DAY_MS);
    activityTrend.push({
      date: isoDate(d),
      label: d.toLocaleDateString("id-ID", { weekday: "short" }),
      count: activityRows.filter((a) => isoDate(a.createdAt) === isoDate(d)).length,
    });
  }

  /* ---- system health ---- */
  const agentCount = (status: string) =>
    agentGroups.find((g) => g.status === status)?._count ?? 0;
  const avgLatency = usage._avg.latencyMs ?? null;

  return {
    totals: {
      students: students.length,
      active: active.length,
      pending: pending.length,
      newToday,
      activeLast7d: activeIds7d.size,
    },
    sessions: {
      total: sessionGroups.reduce((sum, g) => sum + g._count, 0),
      scheduled: sessionCount("SCHEDULED"),
      completed,
      missed,
      completionRate: graded ? Math.round((completed / graded) * 100) : 0,
    },
    attention,
    upcomingExams,
    activityTrend,
    content: {
      materials,
      quizzes,
      exams,
      curriculums,
    },
    system: {
      agentCompleted: agentCount("COMPLETED"),
      agentFailed: agentCount("FAILED"),
      agentFailed7d,
      apiCalls7d: usage._count,
      tokens7d: usage._sum.totalTokens ?? 0,
      cost7d: usage._sum.costUsd ?? 0,
      avgLatencyMs: avgLatency,
      // Anything above 20s end-to-end is worth investigating — the tutor bot
      // should answer in a couple of seconds.
      suspiciousLatency: avgLatency !== null && avgLatency > 20_000,
      improvementPlansApplied: plansApplied,
      dueReviews,
    },
  };
}

/**
 * Request-scoped memoised admin overview.
 *
 * Every dashboard section imports this. React dedupes the call within a single
 * render pass, so the aggregates run once even though five components ask for
 * them.
 */
export const getAdminOverview = cache(getAdminOverviewUncached);
