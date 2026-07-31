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

  const rows = students.map((s, i) => ({
    rank: i + 1,
    name: s.name,
    xp: s.xp,
    currentStreak: s.currentStreak,
    longestStreak: s.longestStreak,
    badgeCount: s._count.badges,
    isMe: s.id === session.studentId,
  }));

  const me = rows.find((r) => r.isMe) ?? null;

  return NextResponse.json({
    total: rows.length,
    myRank: me?.rank ?? null,
    rows,
  });
}
