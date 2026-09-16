/**
 * Student dashboard snapshot — the single query surface behind every
 * student-facing and parent-facing progress view.
 *
 * Why one module
 * --------------
 * The student home page, `/student/progress`, the admin student detail and the
 * new parent monitor link all answer the same question ("what has this child
 * actually done, and what needs attention?") from the same tables. Before this
 * module each page issued its own ad-hoc queries, which is how "days studied",
 * "weak topics" and "next exam" drifted into three different definitions.
 *
 * Everything returned here is derived from persisted rows — no estimates, no
 * generated text. A metric that has no data returns an empty list or null
 * rather than a plausible-looking default.
 *
 * @module @/lib/student-snapshot
 */

import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SubjectProgress {
  subject: string;
  /** 0-100. */
  mastery: number;
  quizCount: number;
  /** 0-100, null when the student has not answered any quiz yet. */
  quizAccuracy: number | null;
  examCount: number;
  /** 0-100, null when no exam has been graded. */
  examAccuracy: number | null;
  slidesRead: number;
  videosWatched: number;
  /** ISO date of the last recorded activity in this subject. */
  lastActiveAt: string;
}

export interface WeakTopic {
  subject: string;
  topic: string;
  /** 0-100. */
  mastery: number;
  weaknessLevel: string;
  quizAttempts: number;
  examAttempts: number;
  lastAttemptAt: string;
}

export interface UpcomingExam {
  id: string;
  title: string;
  subject: string;
  type: string;
  scheduledAt: string;
  /** "PENDING" | "CONFIRMED" */
  status: string;
  /** Whole days from today; 0 = today, negative never returned. */
  daysAway: number;
}

export interface StudyDay {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  minutes: number;
  activities: number;
}

export interface RecentActivity {
  type: string;
  subject: string | null;
  topic: string | null;
  at: string;
  detail: string;
}

export interface GuardianAlert {
  issueType: string;
  severity: string;
  description: string;
  createdAt: string;
}

export interface StudentSnapshot {
  student: {
    id: string;
    studentId: string;
    name: string;
    /** First name only — used by the parent-facing view. */
    firstName: string;
    gradeLevel: string;
    xp: number;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
    createdAt: string;
  };
  today: {
    studyMinutes: number;
    activities: number;
    quizzes: number;
    slidesRead: number;
    /** True when the student has done anything at all today. */
    active: boolean;
  };
  week: {
    studyMinutes: number;
    /** Consecutive days with at least one recorded study session, ending today. */
    activeDays: number;
    quizzes: number;
    exams: number;
    xpGained: number;
  };
  totals: {
    studyMinutes: number;
    quizAttempts: number;
    examAttempts: number;
    slidesRead: number;
    videosWatched: number;
    badges: number;
  };
  subjects: SubjectProgress[];
  weakTopics: WeakTopic[];
  upcomingExams: UpcomingExam[];
  /** Last 14 days, oldest first. Always 14 entries (zero-filled). */
  studyDays: StudyDay[];
  recentActivities: RecentActivity[];
  alerts: GuardianAlert[];
  badges: { name: string; icon: string; unlockedAt: string }[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Local-midnight of `d`, so "today" means the server's calendar day. */
function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function pct(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 100);
}

function firstNameOf(fullName: string): string {
  const cleaned = fullName.trim().replace(/^kak\s+/i, "");
  return cleaned.split(/\s+/)[0] || cleaned;
}

/** Turn a raw activity type into a human phrase for the parent view. */
function describeActivity(
  type: string,
  subject: string | null,
  topic: string | null,
): string {
  const where = topic ? `${subject ?? ""} — ${topic}` : subject ?? "";
  const tail = where ? ` (${where})` : "";
  switch (type) {
    case "slide_view":
      return `Membaca materi${tail}`;
    case "mindmap_view":
      return `Membuka mindmap${tail}`;
    case "video_click":
      return `Menonton video${tail}`;
    case "quiz_start":
      return `Memulai kuis${tail}`;
    case "quiz_complete":
      return `Menyelesaikan kuis${tail}`;
    case "exam_start":
      return `Memulai ujian${tail}`;
    case "exam_complete":
      return `Menyelesaikan ujian${tail}`;
    case "mission_complete":
      return `Menyelesaikan misi harian`;
    default:
      return where ? `${type}${tail}` : type;
  }
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

/**
 * Build the full snapshot for one student. Returns null when the student does
 * not exist, so callers can `notFound()` instead of rendering empty cards.
 *
 * @param options.days How many trailing days of history to include (7 or 14).
 */
export async function getStudentSnapshot(
  studentId: string,
  options: { days?: number } = {},
): Promise<StudentSnapshot | null> {
  const days = options.days ?? 14;
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS);
  const windowStart = new Date(todayStart.getTime() - (days - 1) * DAY_MS);

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      studentId: true,
      name: true,
      gradeLevel: true,
      xp: true,
      currentStreak: true,
      longestStreak: true,
      lastActivityDate: true,
      createdAt: true,
    },
  });
  if (!student) return null;

  const [
    studySessions,
    activities,
    subjectMastery,
    topicMasteries,
    examSchedules,
    attempts,
    examAttempts,
    studentBadges,
    interventions,
    reviewDue,
  ] = await Promise.all([
    prisma.studySession.findMany({
      where: { studentId, startTime: { gte: windowStart } },
      select: { startTime: true, durationMinutes: true },
      orderBy: { startTime: "desc" },
    }),
    prisma.studentActivity.findMany({
      where: { studentId, createdAt: { gte: windowStart } },
      select: { type: true, createdAt: true, metadata: true, materialId: true },
      orderBy: { createdAt: "desc" },
      take: 400,
    }),
    prisma.studentSubjectMastery.findMany({
      // "general" is a placeholder bucket DashboardTracker writes when it
      // cannot detect a subject — not a real subject, so keep it out.
      where: { studentId, subject: { notIn: ["general", ""] } },
      orderBy: { mastery: "desc" },
    }),
    prisma.topicMastery.findMany({
      where: {
        studentId,
        subject: { notIn: ["general", ""] },
        weaknessLevel: { in: ["mild", "moderate", "severe"] },
      },
      orderBy: [{ weaknessLevel: "desc" }, { mastery: "asc" }],
      take: 8,
    }),
    prisma.examSchedule.findMany({
      where: {
        studentId,
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledAt: { gte: todayStart },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { exam: { select: { title: true, subject: true, type: true } } },
    }),
    prisma.attempt.findMany({
      where: { studentId },
      select: { score: true, maxScore: true, createdAt: true },
    }),
    prisma.examAttempt.findMany({
      where: { studentId },
      select: { score: true, maxScore: true, createdAt: true },
    }),
    prisma.studentBadge.findMany({
      where: { studentId },
      orderBy: { unlockedAt: "desc" },
      take: 6,
      include: { badge: { select: { name: true, icon: true } } },
    }),
    prisma.intervention.findMany({
      where: { studentId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.reviewQueue.count({
      where: { studentId, mastered: false, dueAt: { lte: now } },
    }),
  ]);

  /* ---- aggregate the activity window into per-day buckets ---- */
  const dayMap = new Map<string, { minutes: number; activities: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(windowStart.getTime() + i * DAY_MS);
    dayMap.set(isoDate(d), { minutes: 0, activities: 0 });
  }
  for (const a of activities) {
    const key = isoDate(a.createdAt);
    const bucket = dayMap.get(key);
    if (bucket) bucket.activities += 1;
  }
  for (const s of studySessions) {
    const key = isoDate(s.startTime);
    const bucket = dayMap.get(key);
    if (bucket) bucket.minutes += s.durationMinutes ?? 0;
  }

  const studyDays: StudyDay[] = Array.from(dayMap.entries()).map(
    ([date, v]) => ({ date, minutes: v.minutes, activities: v.activities }),
  );

  /* ---- window totals ---- */
  const todayKey = isoDate(now);
  const todayBucket = dayMap.get(todayKey) ?? { minutes: 0, activities: 0 };
  const todayActivities = activities.filter((a) => isoDate(a.createdAt) === todayKey);
  const weekDays = studyDays.slice(-7);
  const weekActivities = activities.filter((a) => a.createdAt >= weekStart);
  const weekStudy = studySessions.filter((s) => s.startTime >= weekStart);

  const countType = (list: { type: string }[], type: string) =>
    list.filter((a) => a.type === type).length;

  /* ---- per-subject accuracy from raw attempts ---- */
  const subjectAgg = new Map<
    string,
    { quizScore: number; quizMax: number; examScore: number; examMax: number }
  >();
  const bump = (
    subject: string,
    field: "quizScore" | "quizMax" | "examScore" | "examMax",
    value: number,
  ) => {
    const cur = subjectAgg.get(subject) ?? {
      quizScore: 0,
      quizMax: 0,
      examScore: 0,
      examMax: 0,
    };
    cur[field] += value;
    subjectAgg.set(subject, cur);
  };

  // Attempt rows carry no subject of their own; join through quiz -> material.
  if (attempts.length) {
    const quizRows = await prisma.quiz.findMany({
      where: { studentId },
      select: { id: true, material: { select: { subject: true } } },
    });
    const subjectByQuiz = new Map<string, string>(
      quizRows.map((q) => [q.id, q.material.subject] as const),
    );
    const attemptSubjects = await prisma.attempt.findMany({
      where: { studentId },
      select: { quizId: true, score: true, maxScore: true },
    });
    for (const a of attemptSubjects) {
      const subject = subjectByQuiz.get(a.quizId);
      if (!subject) continue;
      bump(subject, "quizScore", a.score);
      bump(subject, "quizMax", a.maxScore);
    }
  }
  if (examAttempts.length) {
    const examRows = await prisma.exam.findMany({
      where: { attempts: { some: { studentId } } },
      select: { id: true, subject: true },
    });
    const subjectByExam = new Map<string, string>(
      examRows.map((e) => [e.id, e.subject] as const),
    );
    const attemptRows = await prisma.examAttempt.findMany({
      where: { studentId },
      select: { examId: true, score: true, maxScore: true },
    });
    for (const a of attemptRows) {
      const subject = subjectByExam.get(a.examId);
      if (!subject) continue;
      bump(subject, "examScore", a.score);
      bump(subject, "examMax", a.maxScore);
    }
  }

  const subjects: SubjectProgress[] = subjectMastery.map((m) => {
    const agg = subjectAgg.get(m.subject);
    return {
      subject: m.subject,
      mastery: Math.round(m.mastery),
      quizCount: m.quizCount,
      // Fall back to the cached mastery row when the join found no attempts.
      quizAccuracy: agg
        ? pct(agg.quizScore, agg.quizMax)
        : pct(m.quizTotalScore, m.quizTotalMax),
      examCount: m.examCount,
      examAccuracy: agg
        ? pct(agg.examScore, agg.examMax)
        : pct(m.examBestScore, m.examBestMax),
      slidesRead: m.slidesRead,
      videosWatched: m.videosWatched,
      lastActiveAt: m.lastActiveAt.toISOString(),
    };
  });

  const weakTopics: WeakTopic[] = topicMasteries.map((t) => ({
    subject: t.subject,
    topic: t.topic,
    mastery: Math.round(t.mastery),
    weaknessLevel: t.weaknessLevel,
    quizAttempts: t.quizAttempts,
    examAttempts: t.examAttempts,
    lastAttemptAt: t.lastAttemptAt.toISOString(),
  }));

  const upcomingExams: UpcomingExam[] = examSchedules.map((s) => ({
    id: s.id,
    title: s.exam.title,
    subject: s.exam.subject,
    type: s.exam.type,
    scheduledAt: s.scheduledAt.toISOString(),
    status: s.status,
    daysAway: Math.max(
      0,
      Math.round((startOfDay(s.scheduledAt).getTime() - todayStart.getTime()) / DAY_MS),
    ),
  }));

  const recentActivities: RecentActivity[] = activities.slice(0, 12).map((a) => {
    const meta = (a.metadata ?? {}) as {
      subject?: string;
      topic?: string;
      score?: number;
      maxScore?: number;
    };
    const subject = meta.subject ?? null;
    const topic = meta.topic ?? null;
    let detail = describeActivity(a.type, subject, topic);
    if (
      (a.type === "quiz_complete" || a.type === "exam_complete") &&
      typeof meta.score === "number" &&
      typeof meta.maxScore === "number" &&
      meta.maxScore > 0
    ) {
      detail += ` — nilai ${meta.score}/${meta.maxScore}`;
    }
    return { type: a.type, subject, topic, at: a.createdAt.toISOString(), detail };
  });

  const alerts: GuardianAlert[] = interventions.map((i) => ({
    issueType: i.issueType,
    severity: i.severity,
    description: i.description,
    createdAt: i.createdAt.toISOString(),
  }));

  // A due spaced-repetition item is a nudge the parent can act on.
  if (reviewDue > 0) {
    alerts.push({
      issueType: "ULANGAN_MATERI",
      severity: "LOW",
      description: `${reviewDue} soal perlu diulang untuk memperkuat ingatan.`,
      createdAt: now.toISOString(),
    });
  }

  return {
    student: {
      id: student.id,
      studentId: student.studentId,
      name: student.name,
      firstName: firstNameOf(student.name),
      gradeLevel: student.gradeLevel,
      xp: student.xp,
      currentStreak: student.currentStreak,
      longestStreak: student.longestStreak,
      lastActivityDate: student.lastActivityDate?.toISOString() ?? null,
      createdAt: student.createdAt.toISOString(),
    },
    today: {
      studyMinutes: todayBucket.minutes,
      activities: todayBucket.activities,
      quizzes: countType(todayActivities, "quiz_complete"),
      slidesRead: countType(todayActivities, "slide_view"),
      active: todayBucket.activities > 0 || todayBucket.minutes > 0,
    },
    week: {
      studyMinutes: weekStudy.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0),
      activeDays: weekDays.filter((d) => d.minutes > 0 || d.activities > 0).length,
      quizzes: countType(weekActivities, "quiz_complete"),
      exams: countType(weekActivities, "exam_complete"),
      xpGained: 0, // not derivable: XP is a running total, no per-day ledger
    },
    totals: {
      studyMinutes: studySessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0),
      quizAttempts: attempts.length,
      examAttempts: examAttempts.length,
      slidesRead: countType(activities, "slide_view"),
      videosWatched: countType(activities, "video_click"),
      badges: studentBadges.length,
    },
    subjects,
    weakTopics,
    upcomingExams,
    studyDays,
    recentActivities,
    alerts,
    badges: studentBadges.map((b) => ({
      name: b.badge.name,
      icon: b.badge.icon,
      unlockedAt: b.unlockedAt.toISOString(),
    })),
  };
}

/**
 * Rolling per-day study totals for one student, used by the sparkline.
 * Returns `days` entries, oldest first, zero-filled.
 */
export async function getStudyTrend(
  studentId: string,
  days = 14,
): Promise<StudyDay[]> {
  const todayStart = startOfDay(new Date());
  const start = new Date(todayStart.getTime() - (days - 1) * DAY_MS);

  const sessions = await prisma.studySession.findMany({
    where: { studentId, startTime: { gte: start } },
    select: { startTime: true, durationMinutes: true },
  });
  const activities = await prisma.studentActivity.findMany({
    where: { studentId, createdAt: { gte: start } },
    select: { createdAt: true },
  });

  const out: StudyDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const key = isoDate(d);
    out.push({
      date: key,
      minutes: sessions
        .filter((s) => isoDate(s.startTime) === key)
        .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0),
      activities: activities.filter((a) => isoDate(a.createdAt) === key).length,
    });
  }
  return out;
}
