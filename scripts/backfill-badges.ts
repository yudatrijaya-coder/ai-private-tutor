/**
 * Backfill badges for existing attempts.
 * Run once after gamification deployment to award badges retroactively.
 * Does NOT trigger handleActivity (no duplicate XP for activity log).
 * Only runs checkBadges() which awards badges + badge XP reward.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  database: "ai_private_tutor",
  user: "tutor",
  password: "tutor123",
});
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const students = await db.student.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  console.log(`Backfilling badges for ${students.length} students...`);

  let totalBadges = 0;

  for (const student of students) {
    const existingBadges = await db.studentBadge.count({
      where: { studentId: student.id },
    });
    if (existingBadges > 0) {
      console.log(`  ${student.name}: already has ${existingBadges} badges, skipping`);
      continue;
    }

    const allBadges = await db.badge.findMany({ orderBy: { category: "asc" } });
    const attemptCount = await db.attempt.count({ where: { studentId: student.id, type: "QUIZ" } });
    const examCount = await db.attempt.count({ where: { studentId: student.id, type: "EXAM" } });
    const allAttempts = await db.attempt.findMany({
      where: { studentId: student.id },
      select: { score: true, maxScore: true },
    });
    const perfectScores = allAttempts.filter((a) => a.score === a.maxScore).length;
    const slidesRead = await db.studentActivity.count({ where: { studentId: student.id, type: "slide_view" } });
    const mindmapsOpen = await db.studentActivity.count({ where: { studentId: student.id, type: "mindmap_view" } });
    const videosWatched = await db.studentActivity.count({ where: { studentId: student.id, type: "video_click" } });
    const studentData = await db.student.findUnique({ where: { id: student.id } });
    const currentStreak = studentData?.currentStreak ?? 0;

    // Mock student object for checkBadges compatibility
    const mockStudent = {
      id: student.id,
      currentStreak,
      badges: [] as any[],
    };

    let earned = 0;
    for (const badge of allBadges) {
      const existing = await db.studentBadge.findUnique({
        where: { studentId_badgeId: { studentId: student.id, badgeId: badge.id } },
      });
      if (existing) continue;

      let qualifies = false;
      switch (badge.code) {
        case "first_quiz": qualifies = attemptCount >= 1; break;
        case "quiz_10": qualifies = attemptCount >= 10; break;
        case "quiz_50": qualifies = attemptCount >= 50; break;
        case "streak_3": qualifies = currentStreak >= 3; break;
        case "streak_7": qualifies = currentStreak >= 7; break;
        case "streak_30": qualifies = currentStreak >= 30; break;
        case "score_100": qualifies = perfectScores >= 1; break;
        case "exam_complete": qualifies = examCount >= 1; break;
        case "slides_10": qualifies = slidesRead >= 10; break;
        case "videos_5": qualifies = videosWatched >= 5; break;
        case "mindmap_5": qualifies = mindmapsOpen >= 5; break;
        default: break;
      }

      if (qualifies) {
        await db.studentBadge.create({ data: { studentId: student.id, badgeId: badge.id } });
        await db.student.update({
          where: { id: student.id },
          data: { xp: { increment: badge.xpReward } },
        });
        earned++;
        totalBadges++;
      }
    }

    console.log(`  ${student.name}: ${earned} badges awarded (${attemptCount} attempts, ${perfectScores} perfect, streak: ${currentStreak})`);
  }

  console.log(`\nDone. ${totalBadges} badges backfilled total.`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});