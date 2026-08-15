import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";

/**
 * GET /api/students/self-compare
 * Weekly deltas vs the previous 7 days: study minutes, quizzes taken,
 * XP earned from activities. Powers the "vs minggu lalu" card.
 * Auth: student JWT cookie.
 */
export async function GET() {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const thisWeekStart = now - 7 * 86400000;
  const lastWeekStart = now - 14 * 86400000;

  // Study minutes (StudySession with durationMinutes)
  const [thisMinutes, lastMinutes] = await Promise.all([
    prisma.studySession.aggregate({
      where: { studentId: session.studentId, startTime: { gte: new Date(thisWeekStart) } },
      _sum: { durationMinutes: true },
    }),
    prisma.studySession.aggregate({
      where: {
        studentId: session.studentId,
        startTime: { gte: new Date(lastWeekStart), lt: new Date(thisWeekStart) },
      },
      _sum: { durationMinutes: true },
    }),
  ]);

  // Quiz attempts
  const [thisQuizzes, lastQuizzes] = await Promise.all([
    prisma.attempt.count({ where: { studentId: session.studentId, createdAt: { gte: new Date(thisWeekStart) } } }),
    prisma.attempt.count({
      where: { studentId: session.studentId, createdAt: { gte: new Date(lastWeekStart), lt: new Date(thisWeekStart) } },
    }),
  ]);

  // XP earned from tracked activities (StudentActivity)
  const xpByType: Record<string, number> = {
    quiz_complete: 25,
    quiz_perfect: 50,
    slide_view: 5,
    mindmap_view: 5,
    video_click: 5,
    exam_complete: 100,
    mission_complete: 10,
  };
  const sumXp = async (from: Date, to: Date): Promise<number> => {
    const rows = await prisma.studentActivity.findMany({
      where: { studentId: session.studentId, type: { in: Object.keys(xpByType) }, createdAt: { gte: from, lt: to } },
      select: { type: true, metadata: true },
    });
    let total = 0;
    for (const r of rows) {
      if (r.type === "quiz_complete") {
        const md = r.metadata as { score?: number; maxScore?: number } | null;
        const perfect = md && typeof md.score === "number" && typeof md.maxScore === "number" && md.score === md.maxScore;
        total += perfect ? xpByType.quiz_perfect : xpByType.quiz_complete;
      } else {
        total += xpByType[r.type] ?? 0;
      }
    }
    return total;
  };
  const [thisXp, lastXp] = await Promise.all([
    sumXp(new Date(thisWeekStart), new Date()),
    sumXp(new Date(lastWeekStart), new Date(thisWeekStart)),
  ]);

  const pct = (cur: number, prev: number): number | null => {
    if (prev === 0) return cur === 0 ? null : null; // no baseline → no percentage
    return Math.round(((cur - prev) / prev) * 100);
  };

  return NextResponse.json({
    studyMinutes: { current: thisMinutes._sum.durationMinutes ?? 0, previous: lastMinutes._sum.durationMinutes ?? 0, deltaPct: pct(thisMinutes._sum.durationMinutes ?? 0, lastMinutes._sum.durationMinutes ?? 0) },
    quizzes: { current: thisQuizzes, previous: lastQuizzes, deltaPct: pct(thisQuizzes, lastQuizzes) },
    xp: { current: thisXp, previous: lastXp, deltaPct: pct(thisXp, lastXp) },
  });
}
