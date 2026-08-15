import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";

/**
 * GET /api/students/leaderboard
 *
 * XP ranking across all ACTIVE students. Deliberately minimal: first name only,
 * XP, streak and badge count — no contact details, no grade, no scores. The
 * caller's own row is flagged with `isMe` so the client can highlight it.
 *
 * Auth: student JWT cookie.
 */
export async function GET() {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      xp: true,
      currentStreak: true,
      longestStreak: true,
      _count: { select: { badges: true } },
    },
    orderBy: [{ xp: "desc" }, { currentStreak: "desc" }, { name: "asc" }],
  });

  // Weekly XP delta (aktivitas 7 hari terakhir vs 7 hari sebelumnya)
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);
  const xpByType: Record<string, number> = {
    quiz_complete: 25,
    quiz_perfect: 50,
    slide_view: 5,
    mindmap_view: 5,
    video_click: 5,
    exam_complete: 100,
    mission_complete: 10,
  };
  const [thisWeekActs, lastWeekActs] = await Promise.all([
    prisma.studentActivity.findMany({
      where: { type: { in: Object.keys(xpByType) }, createdAt: { gte: weekAgo } },
      select: { studentId: true, type: true, metadata: true },
    }),
    prisma.studentActivity.findMany({
      where: { type: { in: Object.keys(xpByType) }, createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
      select: { studentId: true, type: true, metadata: true },
    }),
  ]);
  const sumXp = (rows: { studentId: string; type: string; metadata: unknown }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.type === "quiz_complete") {
        const md = r.metadata as { score?: number; maxScore?: number } | null;
        const perfect = md && typeof md.score === "number" && typeof md.maxScore === "number" && md.score === md.maxScore;
        m.set(r.studentId, (m.get(r.studentId) ?? 0) + (perfect ? xpByType.quiz_perfect : xpByType.quiz_complete));
      } else {
        m.set(r.studentId, (m.get(r.studentId) ?? 0) + (xpByType[r.type] ?? 0));
      }
    }
    return m;
  };
  const thisXp = sumXp(thisWeekActs);
  const lastXp = sumXp(lastWeekActs);

  const rows = students.map((s, i) => ({
    rank: i + 1,
    name: s.name,
    xp: s.xp,
    currentStreak: s.currentStreak,
    longestStreak: s.longestStreak,
    badgeCount: s._count.badges,
    weeklyXpDelta: (thisXp.get(s.id) ?? 0) - (lastXp.get(s.id) ?? 0),
    isMe: s.id === session.studentId,
  }));

  const me = rows.find((r) => r.isMe) ?? null;

  return NextResponse.json({
    total: rows.length,
    myRank: me?.rank ?? null,
    rows,
  });
}
