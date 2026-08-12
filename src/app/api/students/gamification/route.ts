import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";

/**
 * GET /api/students/gamification
 *
 * Returns the logged-in student's gamification state:
 * - xp, currentStreak, longestStreak, lastActivityDate
 * - unlocked badges (with unlockedAt) and still-locked badges
 * - XP rank among all ACTIVE students
 * - count of review items currently due
 *
 * Auth: student JWT cookie. No studentId query param — a student can only ever
 * read their own gamification state.
 */
export async function GET() {
  const session = await getStudentSession();
  if (!session) {
    console.error("[Gamification] No session:", { cookies: "received" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
    select: {
      id: true,
      name: true,
      xp: true,
      currentStreak: true,
      longestStreak: true,
      lastActivityDate: true,
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const [ownedRows, allBadges, higherXpCount, totalStudents, dueReviews] =
    await Promise.all([
      prisma.studentBadge.findMany({
        where: { studentId: student.id },
        include: { badge: true },
        orderBy: { unlockedAt: "desc" },
      }),
      prisma.badge.findMany({ orderBy: [{ category: "asc" }, { xpReward: "asc" }] }),
      prisma.student.count({
        where: { status: "ACTIVE", xp: { gt: student.xp } },
      }),
      prisma.student.count({ where: { status: "ACTIVE" } }),
      prisma.reviewQueue.count({
        where: { studentId: student.id, mastered: false, dueAt: { lte: new Date() } },
      }),
    ]);

  const ownedCodes = new Set(ownedRows.map((r) => r.badge.code));

  const unlocked = ownedRows.map((r) => ({
    code: r.badge.code,
    name: r.badge.name,
    description: r.badge.description,
    icon: r.badge.icon,
    category: r.badge.category,
    xpReward: r.badge.xpReward,
    unlockedAt: r.unlockedAt,
  }));

  const locked = allBadges
    .filter((b) => !ownedCodes.has(b.code))
    .map((b) => ({
      code: b.code,
      name: b.name,
      description: b.description,
      icon: b.icon,
      category: b.category,
      xpReward: b.xpReward,
    }));

  return NextResponse.json({
    xp: student.xp,
    currentStreak: student.currentStreak,
    longestStreak: student.longestStreak,
    lastActivityDate: student.lastActivityDate,
    rank: higherXpCount + 1,
    totalStudents,
    dueReviews,
    badges: {
      unlocked,
      locked,
      unlockedCount: unlocked.length,
      totalCount: allBadges.length,
    },
  });
}
