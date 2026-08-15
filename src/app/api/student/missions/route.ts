import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";
import { handleActivity } from "@/lib/gamification";

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function GET() {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const student = await prisma.student.findUnique({
      where: { id: session.studentId },
      include: {
        topicMasteries: {
          where: { weaknessLevel: { not: "none" } },
          orderBy: { mastery: "asc" },
          take: 3,
        },
        improvementPlans: { orderBy: { createdAt: "desc" }, take: 1 },
        scheduleSessions: {
          where: {
            scheduledAt: { gte: new Date() },
            status: { in: ["SCHEDULED", "RESCHEDULED"] },
          },
          orderBy: { scheduledAt: "asc" },
          take: 3,
        },
      },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const missions: { key: string; title: string; icon: string; href: string }[] = [];
    const today = new Date();

    // 1. Sesi belajar terjadwal hari ini
    for (const s of student.scheduleSessions) {
      if (s.scheduledAt.toDateString() !== today.toDateString()) continue;
      missions.push({
        key: "session:" + s.id,
        icon: "🗓️",
        title: "Sesi belajar hari ini" + (s.subject ? ": " + s.subject : ""),
        href: "/student/quiz",
      });
      break;
    }

    // 2. Topik lemah (maks 2)
    for (const t of student.topicMasteries.slice(0, 2)) {
      missions.push({
        key: "weak:" + t.id,
        icon: "🎯",
        title: "Perkuat: " + t.topic + " (" + t.subject + ")",
        href: "/student/subject/" + encodeURIComponent(t.subject),
      });
    }

    // 3. Improvement plan terbaru
    if (student.improvementPlans.length > 0) {
      missions.push({
        key: "plan",
        icon: "🔧",
        title: "Lanjutkan rencana perbaikan exam",
        href: "/student/exam",
      });
    }

    // 4. Fallback kalau belum ada data
    if (missions.length === 0) {
      missions.push({
        key: "quiz",
        icon: "📝",
        title: "Kerjakan 1 quiz hari ini",
        href: "/student/quiz",
      });
    }

    // ── Target harian kuantitatif ──
    const dayStart = utcDayStart(today);
    const [studySessionsToday, quizzesToday, actsToday] = await Promise.all([
      prisma.studySession.aggregate({
        where: { studentId: student.id, startTime: { gte: dayStart } },
        _sum: { durationMinutes: true },
      }),
      prisma.attempt.count({ where: { studentId: student.id, createdAt: { gte: dayStart } } }),
      prisma.studentActivity.findMany({
        where: { studentId: student.id, type: "quiz_complete", createdAt: { gte: dayStart } },
        select: { metadata: true },
      }),
    ]);
    let quizMinutes = 0;
    for (const a of actsToday) {
      const md = a.metadata as { timeSpent?: number } | null;
      if (md && typeof md.timeSpent === "number") quizMinutes += md.timeSpent;
    }
    const studyMinutes = Math.round((studySessionsToday._sum.durationMinutes ?? 0) + quizMinutes / 60);
    const DAILY_TARGET_MIN = 20;
    const DAILY_TARGET_QUIZ = 1;
    const dailyProgress = {
      minutes: Math.min(studyMinutes, DAILY_TARGET_MIN),
      minutesTarget: DAILY_TARGET_MIN,
      quizzes: quizzesToday,
      quizzesTarget: DAILY_TARGET_QUIZ,
      done: studyMinutes >= DAILY_TARGET_MIN && quizzesToday >= DAILY_TARGET_QUIZ,
    };

    // Misi yang sudah diselesaikan hari ini (dedup per hari)
    const done = await prisma.studentActivity.findMany({
      where: {
        studentId: student.id,
        type: "mission_complete",
        createdAt: { gte: utcDayStart(today) },
      },
      select: { metadata: true },
    });
    const completedKeys = done
      .map((a) => (a.metadata as { key?: string } | null)?.key)
      .filter((k): k is string => !!k);

    return NextResponse.json({
      missions: missions.slice(0, 5),
      completedKeys,
      streak: student.currentStreak,
      xp: student.xp,
      dailyProgress,
    });
  } catch (err) {
    console.error("[missions] GET error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const key = typeof body.key === "string" ? body.key : null;
    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    const todayStart = utcDayStart(new Date());
    const done = await prisma.studentActivity.findMany({
      where: {
        studentId: session.studentId,
        type: "mission_complete",
        createdAt: { gte: todayStart },
      },
      select: { metadata: true },
    });
    const alreadyDone = done.some(
      (a) => (a.metadata as { key?: string } | null)?.key === key,
    );
    if (alreadyDone) {
      return NextResponse.json({ ok: true, alreadyDone: true, xp: 0 });
    }

    const { xpAwarded } = await handleActivity({
      studentId: session.studentId,
      type: "mission_complete",
      metadata: { key },
    });

    return NextResponse.json({ ok: true, alreadyDone: false, xp: xpAwarded });
  } catch (err) {
    console.error("[missions] POST error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
