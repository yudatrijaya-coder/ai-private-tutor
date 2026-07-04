/**
 * Grading Engine — grades attempts, calculates mastery with recency
 * weighting, and updates ProgressSnap records.
 *
 * @module @/agents/assessment/grader
 */

import { prisma } from "@/lib/prisma";
import type {
  QuestionData,
  StudentAnswer,
  AttemptResult,
  QuestionResult,
} from "./types";
import { RECENCY_WEIGHTS } from "./types";

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Grade a set of student answers against a quiz and persist the attempt.
 *
 * Steps:
 *   1. Fetch the quiz + its questions
 *   2. Compare each answer against the correct answer
 *   3. Calculate raw score and recency-weighted mastery
 *   4. Save the Attempt record
 *   5. Update/upsert ProgressSnap for the topic
 */
export async function gradeAttempt(params: {
  quizId: string;
  studentId: string;
  answers: StudentAnswer[];
  timeSpent?: number;
}): Promise<AttemptResult> {
  const { quizId, studentId, answers, timeSpent } = params;

  // 1. Load quiz
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
  });

  if (!quiz) {
    throw new Error(`Quiz not found: ${quizId}`);
  }

  const questions = (quiz.questions as unknown as QuestionData[]) ?? [];

  // 2. Grade each question
  const details: QuestionResult[] = [];
  let correctCount = 0;

  for (const answer of answers) {
    const q = questions[answer.questionIndex];
    if (!q) continue;

    const correct = answer.selectedIndex === q.correctIndex;
    if (correct) correctCount++;

    details.push({
      questionIndex: answer.questionIndex,
      question: q.question,
      correct,
      selectedIndex: answer.selectedIndex,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    });
  }

  const score = correctCount;
  const maxScore = questions.length;

  // 3. Calculate recency-weighted mastery
  const masteryAfter = await calculateMastery(
    studentId,
    quiz.materialId,
    score,
    maxScore,
  );

  // 4. Save the attempt
  const attempt = await prisma.attempt.create({
    data: {
      quizId,
      studentId,
      type: quiz.type,
      answers: answers as any,
      score,
      maxScore,
      masteryAfter,
      timeSpent: timeSpent ?? null,
    },
  });

  // 5. Update ProgressSnap
  await upsertProgressSnap(studentId, quiz.materialId, score, maxScore, masteryAfter);

  return {
    attemptId: attempt.id,
    quizId,
    studentId,
    score,
    maxScore,
    masteryAfter,
    timeSpent: timeSpent ?? null,
    answers,
    correctCount,
    incorrectCount: questions.length - correctCount,
    details,
  };
}

/* ------------------------------------------------------------------ */
/*  Mastery Calculation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Calculate recency-weighted mastery across all attempts for a
 * material-student combination.
 *
 * The latest attempt gets the highest weight; older attempts decay.
 * This prevents a single bad day from tanking the score, while still
 * reflecting genuine improvement over time.
 */
export async function calculateMastery(
  studentId: string,
  materialId: string,
  currentScore: number,
  currentMax: number,
): Promise<number> {
  // Fetch recent attempts ordered newest-first
  const recentAttempts = await prisma.attempt.findMany({
    where: {
      studentId,
      quiz: { materialId },
    },
    orderBy: { createdAt: "desc" },
    take: 4, // Max 4 attempts weighted
    select: { score: true, maxScore: true },
  });

  const currentRatio = currentMax > 0 ? currentScore / currentMax : 0;
  const weights = [RECENCY_WEIGHTS.newest];

  let weightedSum = currentRatio * weights[0];
  let totalWeight = weights[0];

  for (let i = 0; i < recentAttempts.length; i++) {
    const ratio =
      recentAttempts[i].maxScore > 0
        ? recentAttempts[i].score / recentAttempts[i].maxScore
        : 0;

    const w = getRecencyWeight(i + 1); // +1 because index 0 = current
    weightedSum += ratio * w;
    totalWeight += w;
  }

  return totalWeight > 0
    ? Math.round((weightedSum / totalWeight) * 100) / 100
    : currentRatio;
}

function getRecencyWeight(distance: number): number {
  switch (distance) {
    case 1:
      return RECENCY_WEIGHTS.recent;
    case 2:
      return RECENCY_WEIGHTS.older;
    default:
      return RECENCY_WEIGHTS.oldest;
  }
}

/* ------------------------------------------------------------------ */
/*  ProgressSnap upsert                                                  */
/* ------------------------------------------------------------------ */

/**
 * Upsert a ProgressSnap for the student + subject derived from the
 * material.  This creates or updates the daily snapshot of progress.
 */
async function upsertProgressSnap(
  studentId: string,
  materialId: string,
  score: number,
  maxScore: number,
  mastery: number,
): Promise<void> {
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { subject: true, topic: true },
  });

  if (!material) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Try to find today's snap for this subject
  const existing = await prisma.progressSnap.findFirst({
    where: {
      studentId,
      subject: material.subject,
      snapDate: {
        gte: today,
        lt: new Date(today.getTime() + 86_400_000),
      },
    },
  });

  if (existing) {
    await prisma.progressSnap.update({
      where: { id: existing.id },
      data: {
        totalScore: { increment: score },
        totalMax: { increment: maxScore },
        quizCount: { increment: 1 },
        mastery,
      },
    });
  } else {
    await prisma.progressSnap.create({
      data: {
        studentId,
        subject: material.subject,
        topic: material.topic,
        mastery,
        quizCount: 1,
        totalScore: score,
        totalMax: maxScore,
        snapDate: today,
        studyMinutes: 0,
      },
    });
  }
}
