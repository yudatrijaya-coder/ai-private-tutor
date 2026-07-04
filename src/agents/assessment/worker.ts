/**
 * Assessment Worker — BullMQ processors for assessment:generate and
 * assessment:evaluate queues.
 *
 * @module @/agents/assessment/worker
 */

import type { Job } from "bullmq";
import type {
  AssessmentGenerateJobPayload,
  AssessmentEvaluateJobPayload,
} from "@/queue/definitions";

import { generateQuiz } from "./generator";
import { generateExam } from "./exam";
import { gradeAttempt } from "./grader";

/* ------------------------------------------------------------------ */
/*  assessment:generate — creates a quiz or exam for a student          */
/* ------------------------------------------------------------------ */

/**
 * Process an assessment generation job.
 *
 * Payload:
 *   - studentId  — target student
 *   - topic      — specific topic (used as materialId when type=quiz)
 *   - gradeLevel — educational level
 *   - questionCount — optional, for exams
 *
 * Behavior:
 *   - If the topic maps to a material ID, generates a single-material quiz.
 *   - Otherwise generates a cross-material exam (when type is exam or
 *     no single material found).
 */
export async function processAssessmentGenerate(
  job: Job<AssessmentGenerateJobPayload, unknown, string>,
): Promise<void> {
  const { studentId, topic, questionCount } = job.data;

  // Try to find a material matching this topic
  const { prisma } = await import("@/lib/prisma");

  const material = await prisma.material.findFirst({
    where: {
      curriculum: { studentId },
      OR: [
        { id: topic },
        { topic },
        { subject: topic },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (material) {
    // Single-material quiz
    const quiz = await generateQuiz(material.id);
    console.log(
      `[assessment/worker] Generated quiz=${quiz.id} for material=${material.id}`,
    );
    job.updateProgress(100);
    return;
  }

  // Cross-material exam
  const exam = await generateExam(studentId, undefined, questionCount);
  console.log(
    `[assessment/worker] Generated exam=${exam.id} for student=${studentId}`,
  );
}

/* ------------------------------------------------------------------ */
/*  assessment:evaluate — grades an attempt and persists results        */
/* ------------------------------------------------------------------ */

/**
 * Process an assessment evaluation job.
 *
 * Payload:
 *   - studentId    — target student
 *   - assessmentId — the quiz/exam ID
 *   - answers      — Record of questionIndex → selectedIndex
 */
export async function processAssessmentEvaluate(
  job: Job<AssessmentEvaluateJobPayload, unknown, string>,
): Promise<void> {
  const { studentId, assessmentId, answers } = job.data;

  // Convert { "0": 2, "1": 0, ... } → [{ questionIndex: 0, selectedIndex: 2 }, ...]
  const answerArray = Object.entries(answers).map(([key, value]) => ({
    questionIndex: parseInt(key, 10),
    selectedIndex: Number(value),
  }));

  const result = await gradeAttempt({
    quizId: assessmentId,
    studentId,
    answers: answerArray,
  });

  console.log(
    `[assessment/worker] Graded attempt=${result.attemptId} ` +
      `score=${result.score}/${result.maxScore} ` +
      `mastery=${result.masteryAfter?.toFixed(2) ?? "N/A"}`,
  );
}
