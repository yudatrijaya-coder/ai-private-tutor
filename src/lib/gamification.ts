import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const XP_RULES: Record<string, number> = {
  quiz_complete: 25,
  quiz_perfect: 50,
  slide_view: 5,
  mindmap_view: 5,
  video_click: 5,
  exam_complete: 100,
  streak_day: 10,
};

export function getXpFor(type: string, isPerfect = false): number {
  if (type === "quiz_complete" && isPerfect) return XP_RULES.quiz_perfect;
  return XP_RULES[type] ?? 0;
}

export async function awardXp(studentId: string, amount: number): Promise<void> {
  await prisma.student.update({
    where: { id: studentId },
    data: { xp: { increment: amount } },
  });
}

/**
 * Update streak based on lastActivityDate.
 * Called once per day per student (on first activity of the day).
 */
export async function updateStreak(studentId: string, activityDate: Date): Promise<void> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return;

  const today = new Date(activityDate);
  today.setHours(0, 0, 0, 0);

  // If lastActivityDate is today, no streak update needed
  if (student.lastActivityDate) {
    const lastDay = new Date(student.lastActivityDate);
    lastDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - lastDay.getTime()) / 86400000);

    if (diffDays === 0) return; // same day, no change

    if (diffDays === 1) {
      // consecutive day
      const newStreak = student.currentStreak + 1;
      await prisma.student.update({
        where: { id: studentId },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, student.longestStreak),
          lastActivityDate: today,
        },
      });
      // Award streak XP every day
      await awardXp(studentId, XP_RULES.streak_day);
    } else {
      // streak broken
      await prisma.student.update({
        where: { id: studentId },
        data: {
          currentStreak: 1,
          lastActivityDate: today,
        },
      });
    }
  } else {
    // First activity ever
    await prisma.student.update({
      where: { id: studentId },
      data: {
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
      },
    });
    await awardXp(studentId, XP_RULES.streak_day);
  }
}

/**
 * Check and award badges if thresholds are met. Returns newly unlocked badge codes.
 */
export async function checkBadges(studentId: string): Promise<string[]> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      badges: { include: { badge: true } },
    },
  });
  if (!student) return [];

  const existingCodes = new Set(student.badges.map((b) => b.badge.code));
  const allBadges = await prisma.badge.findMany({ orderBy: { category: "asc" } });
  const justUnlocked: string[] = [];

  // Gather stats
  const attemptCount = await prisma.attempt.count({ where: { studentId, type: "QUIZ" } });
  const examCount = await prisma.attempt.count({ where: { studentId, type: "EXAM" } });

  // Perfect scores: find attempts where score === maxScore
  const allAttempts = await prisma.attempt.findMany({
    where: { studentId },
    select: { score: true, maxScore: true },
  });
  const perfectScores = allAttempts.filter(a => a.score === a.maxScore).length;

  const slidesRead = await prisma.studentActivity.count({ where: { studentId, type: "slide_view" } });
  const mindmapsOpen = await prisma.studentActivity.count({ where: { studentId, type: "mindmap_view" } });
  const videosWatched = await prisma.studentActivity.count({ where: { studentId, type: "video_click" } });

  for (const badge of allBadges) {
    if (existingCodes.has(badge.code)) continue;

    let earned = false;
    switch (badge.code) {
      case "first_quiz":
        earned = attemptCount >= 1;
        break;
      case "quiz_10":
        earned = attemptCount >= 10;
        break;
      case "quiz_50":
        earned = attemptCount >= 50;
        break;
      case "streak_3":
        earned = student.currentStreak >= 3;
        break;
      case "streak_7":
        earned = student.currentStreak >= 7;
        break;
      case "streak_30":
        earned = student.currentStreak >= 30;
        break;
      case "score_100":
        earned = perfectScores >= 1;
        break;
      case "exam_complete":
        earned = examCount >= 1;
        break;
      case "slides_10":
        earned = slidesRead >= 10;
        break;
      case "videos_5":
        earned = videosWatched >= 5;
        break;
      case "mindmap_5":
        earned = mindmapsOpen >= 5;
        break;
      case "mastery_matematika":
      case "mastery_ipa":
      case "mastery_ips": {
        // Check if all topics in that subject have mastery >= 0.8
        const subject = badge.code.replace("mastery_", "");
        const subjectLabel = subject === "matematika" ? "Matematika" : subject === "ipa" ? "IPA" : "IPS";
        const masteryRows = await prisma.studentSubjectMastery.findMany({
          where: { studentId, subject: { startsWith: subjectLabel } },
        });
        const allMastered = masteryRows.length > 0 && masteryRows.every((r) => r.mastery >= 0.8);
        earned = allMastered;
        break;
      }
      default:
        if (badge.threshold !== null) {
          // Generic fallback: check threshold against attempt count
          earned = attemptCount >= badge.threshold;
        }
    }

    if (earned) {
      await prisma.studentBadge.create({ data: { studentId, badgeId: badge.id } });
      await awardXp(studentId, badge.xpReward);
      justUnlocked.push(badge.code);
    }
  }

  return justUnlocked;
}

/**
 * Handle activity event: log, award XP, update streak, check badges.
 */
export async function handleActivity(params: {
  studentId: string;
  materialId?: string;
  type: string;
  timeSpent?: number;
  metadata?: Prisma.InputJsonValue;
}): Promise<{ xpAwarded: number; newBadges: string[] }> {
  const { studentId, materialId, type, timeSpent, metadata } = params;

  const activity = await prisma.studentActivity.create({
    data: { studentId, materialId, type, timeSpent, metadata },
  });

  const isPerfect = type === "quiz_complete" && metadata && typeof metadata === "object" && "score" in metadata && "maxScore" in metadata
    ? (metadata as Record<string, number>).score === (metadata as Record<string, number>).maxScore
    : false;

  const xp = getXpFor(type, isPerfect);
  if (xp > 0) await awardXp(studentId, xp);

  // Update streak on first activity of the day
  const lastDate = await prisma.student.findUnique({ where: { id: studentId } }).then(s => s?.lastActivityDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (!lastDate || lastDate.getTime() < today.getTime()) {
    await updateStreak(studentId, new Date());
  }

  const newBadges = await checkBadges(studentId);

  return { xpAwarded: xp, newBadges };
}
