/**
 * API routes for study session tracking
 * 
 * POST /api/study/session-heartbeat — client pings every 30s
 * POST /api/study/session-start — called on page load / login
 * POST /api/study/session-end — called on page unload / logout
 * GET  /api/study/stats — weekly / monthly stats per student
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";

/* ------------------------------------------------------------------ */
/*  Heartbeat (keeps session alive + tracks time)                      */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { source, subject, topic } = body;

    // studentId comes from the signed session cookie, never from the client.
    // The old code trusted body.studentId which StudyTracker derived from the
    // URL path (e.g. "quiz" from /student/quiz), so every insert failed the
    // Student FK and was silently swallowed.
    const authSession = await getStudentSession();
    if (!authSession?.studentId) {
      return NextResponse.json({ error: "not authenticated" }, { status: 401 });
    }
    const studentId = authSession.studentId;

    // Find active session (started in last 2 hours, no endTime)
    const activeSession = await prisma.studySession.findFirst({
      where: {
        studentId,
        endTime: null,
        startTime: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      },
      orderBy: { startTime: "desc" },
    });

    if (activeSession) {
      const durationMinutes = Math.round(
        (Date.now() - new Date(activeSession.startTime).getTime()) / 60000
      );
      await prisma.studySession.update({
        where: { id: activeSession.id },
        data: {
          durationMinutes,
          subject: subject || activeSession.subject,
          topic: topic || activeSession.topic,
        },
      });
      return NextResponse.json({ ok: true, sessionId: activeSession.id, minutes: durationMinutes });
    }

    // No active session — start a new one (first heartbeat acts as session-start)
    const session = await prisma.studySession.create({
      data: {
        studentId,
        source: source || "web",
        subject: subject || null,
        topic: topic || null,
        durationMinutes: 0,
      },
    });

    return NextResponse.json({ ok: true, sessionId: session.id, minutes: 0 });
  } catch (err) {
    console.error("[study] heartbeat error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  GET — weekly/monthly stats for dashboard                          */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const days = parseInt(searchParams.get("days") || "7");
    const period = searchParams.get("period") || "daily"; // daily | weekly | monthly

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // If no studentId, return all active students summary
    if (!studentId) {
      const students = await prisma.student.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, gradeLevel: true },
      });

      const stats = await Promise.all(
        students.map(async (s) => {
          const sessions = await prisma.studySession.findMany({
            where: {
              studentId: s.id,
              startTime: { gte: since },
            },
            select: { durationMinutes: true, startTime: true },
          });

          const totalMinutes = sessions.reduce((sum, sess) => sum + (sess.durationMinutes || 0), 0);
          const totalSessions = sessions.length;
          const activeDays = new Set(
            sessions.map((s) => s.startTime.toISOString().slice(0, 10))
          ).size;

          // Activity counts
          const activities = await prisma.studentActivity.count({
            where: { studentId: s.id, createdAt: { gte: since } },
          });
          const quizComplete = await prisma.studentActivity.count({
            where: { studentId: s.id, type: "quiz_complete", createdAt: { gte: since } },
          });

          return {
            name: s.name,
            grade: s.gradeLevel,
            totalMinutes,
            totalSessions,
            activeDays,
            activities,
            quizComplete,
          };
        })
      );

      return NextResponse.json({ ok: true, period: `${days}d`, since: since.toISOString(), students: stats });
    }

    // Single student detailed stats
    const sessions = await prisma.studySession.findMany({
      where: { studentId, startTime: { gte: since } },
      orderBy: { startTime: "desc" },
      take: 100,
    });

    const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const totalSessions = sessions.length;
    const activeDays = new Set(sessions.map((s) => s.startTime.toISOString().slice(0, 10))).size;

    // Per-subject breakdown
    const bySubject: Record<string, number> = {};
    for (const s of sessions) {
      if (s.subject) {
        bySubject[s.subject] = (bySubject[s.subject] || 0) + (s.durationMinutes || 0);
      }
    }

    // Activity summary
    const activities = await prisma.studentActivity.findMany({
      where: { studentId, createdAt: { gte: since } },
      select: { type: true, createdAt: true, timeSpent: true },
      orderBy: { createdAt: "desc" },
    });

    const activityCounts: Record<string, number> = {};
    for (const a of activities) {
      activityCounts[a.type] = (activityCounts[a.type] || 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      student: { id: studentId },
      period: `${days}d`,
      total: {
        minutes: totalMinutes,
        hours: Math.round(totalMinutes / 60 * 10) / 10,
        sessions: totalSessions,
        activeDays,
        avgMinutesPerDay: activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0,
      },
      bySubject,
      activities: activityCounts,
    });
  } catch (err) {
    console.error("[study] GET error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
