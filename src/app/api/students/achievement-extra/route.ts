import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";

/**
 * GET /api/students/achievement-extra
 * Extra data for the achievement page: weekly deltas (self-compare),
 * weak topics with drill quiz ids, and 30-day mastery trend.
 * Auth: student JWT cookie.
 */
export async function GET() {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const weekAgo = new Date(now - 7 * 86400000);
  const twoWeeksAgo = new Date(now - 14 * 86400000);
  const monthAgo = new Date(now - 30 * 86400000);

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
    sumXp(weekAgo, new Date()),
    sumXp(twoWeeksAgo, weekAgo),
  ]);

  const [quizzesThisWeek, quizzesLastWeek, weakTopics, snaps] = await Promise.all([
    prisma.attempt.count({ where: { studentId: session.studentId, createdAt: { gte: weekAgo } } }),
    prisma.attempt.count({ where: { studentId: session.studentId, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.topicMastery.findMany({
      where: { studentId: session.studentId, weaknessLevel: { not: "none" } },
      orderBy: { mastery: "asc" },
      take: 5,
      select: { topic: true, subject: true, mastery: true, weaknessLevel: true },
    }),
    prisma.progressSnap.findMany({
      where: { studentId: session.studentId, snapDate: { gte: monthAgo } },
      orderBy: { snapDate: "asc" },
      select: { subject: true, mastery: true, snapDate: true },
    }),
  ]);

  // quiz id per topic untuk tombol drill
  const quizzes = await prisma.quiz.findMany({
    where: { studentId: session.studentId },
    select: { id: true, material: { select: { topic: true } } },
  });
  const quizByTopic = new Map<string, string>();
  for (const q of quizzes) {
    const t = q.material?.topic;
    if (t && !quizByTopic.has(t)) quizByTopic.set(t, q.id);
  }

  const weakRows = weakTopics.map((w) => ({
    topic: w.topic,
    subject: w.subject,
    mastery: Math.round(w.mastery), // TopicMastery 0-100
    weaknessLevel: w.weaknessLevel,
    quizId: quizByTopic.get(w.topic) ?? null,
  }));

  // Tren 30 hari: poin per hari per subject (ProgressSnap mastery 0-1 -> persen)
  const bySubject = new Map<string, { date: string; mastery: number }[]>();
  for (const s of snaps) {
    const date = s.snapDate.toISOString().slice(0, 10);
    const arr = bySubject.get(s.subject) ?? [];
    const existing = arr.find((a) => a.date === date);
    if (existing) existing.mastery = Math.round(s.mastery * 100);
    else arr.push({ date, mastery: Math.round(s.mastery * 100) });
    bySubject.set(s.subject, arr);
  }
  const trend = Array.from(bySubject.entries())
    .map(([subject, points]) => ({ subject, points }))
    .filter((t) => t.points.length >= 2)
    .sort((a, b) => b.points[b.points.length - 1].mastery - a.points[a.points.length - 1].mastery)
    .slice(0, 4);

  return NextResponse.json({
    selfCompare: {
      xpThisWeek: thisXp,
      xpDelta: thisXp - lastXp,
      quizzesThisWeek,
      quizzesDelta: quizzesThisWeek - quizzesLastWeek,
    },
    weakTopics: weakRows,
    trend,
  });
}
