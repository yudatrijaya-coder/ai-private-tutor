/**
 * SM-2 spaced repetition algorithm for ReviewQueue.
 * Based on the SuperMemo SM-2 algorithm.
 */
import { prisma } from "@/lib/prisma";

interface SM2Result {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  mastered: boolean;
}

/**
 * Process a review attempt and return updated SM-2 state.
 * quality: 0-5 (0=complete blackout, 5=perfect response)
 */
export function computeSM2(
  quality: number,
  prevEase: number,
  prevInterval: number,
  prevReps: number,
  prevLapses: number,
): SM2Result {
  const q = Math.max(0, Math.min(5, quality));

  let ease = prevEase;
  let interval = 1;
  let reps = 0;
  let lapses = prevLapses;

  if (q >= 3) {
    // Correct response
    if (prevReps === 0) {
      interval = 1;
    } else if (prevReps === 1) {
      interval = 6;
    } else {
      interval = Math.round(prevInterval * ease);
    }
    reps = prevReps + 1;
  } else {
    // Incorrect response — reset
    reps = 0;
    interval = 1;
    lapses += 1;
  }

  // Update ease factor
  ease = Math.max(
    1.3,
    prevEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  const mastered = q >= 4 && reps >= 3;

  return { easeFactor: ease, intervalDays: interval, repetitions: reps, lapses, mastered };
}

/**
 * Add a wrong answer to the review queue (or update existing entry).
 */
export async function addToReviewQueue(
  studentId: string,
  quizId: string,
  questionIdx: number,
  subject: string,
  topic?: string,
) {
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 1); // due tomorrow

  await prisma.reviewQueue.upsert({
    where: { studentId_quizId_questionIdx: { studentId, quizId, questionIdx } },
    update: {
      dueAt,
      mastered: false,
      lapses: { increment: 1 },
      repetitions: 0,
      intervalDays: 1,
    },
    create: { studentId, quizId, questionIdx, subject, topic, dueAt },
  });
}

/**
 * Grade a review queue item and update SM-2 state.
 */
export async function gradeReviewItem(
  reviewId: string,
  quality: number,
) {
  const item = await prisma.reviewQueue.findUnique({ where: { id: reviewId } });
  if (!item) throw new Error("Review item not found");

  const result = computeSM2(
    quality,
    item.easeFactor,
    item.intervalDays,
    item.repetitions,
    item.lapses,
  );

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + result.intervalDays);

  await prisma.reviewQueue.update({
    where: { id: reviewId },
    data: {
      easeFactor: result.easeFactor,
      intervalDays: result.intervalDays,
      repetitions: result.repetitions,
      lapses: result.lapses,
      dueAt,
      lastReviewAt: new Date(),
      mastered: result.mastered,
    },
  });

  return result;
}

/**
 * Get due review items for a student.
 */
export async function getDueReviews(studentId: string, limit = 10) {
  return prisma.reviewQueue.findMany({
    where: { studentId, mastered: false, dueAt: { lte: new Date() } },
    orderBy: { dueAt: "asc" },
    take: limit,
    include: { quiz: { select: { questions: true } } },
  });
}