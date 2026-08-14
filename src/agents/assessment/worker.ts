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
import { gradeAttempt } from "./grader";
import { analyzeExamAttempt } from "@/services/improvement-analysis";
import { prisma } from "@/lib/prisma";

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
  const { studentId, materialId, topic, questionCount } = job.data;

  // Try to find a material matching this topic
  const { prisma } = await import("@/lib/prisma");

  let material = null;
  if (materialId) {
    material = await prisma.material.findUnique({ where: { id: materialId } });
  }
  if (!material) {
    material = await prisma.material.findFirst({
      where: {
        curriculum: { studentId },
        OR: [
          { topic },
          { subject: topic },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  if (material) {
    // Single-material quiz
    const quiz = await generateQuiz(material.id);
    console.log(
      `[assessment/worker] Generated quiz=${quiz.id} for material=${material.id}`,
    );
    job.updateProgress(100);
    return;
  }

  // Cross-material exam — coming in v2
  /* console.log(
    `[assessment/worker] Cross-material exam generation coming in v2`,
  ); */
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

/* ------------------------------------------------------------------ */
/*  improvement:analyze — runs AI analysis for an exam attempt         */
/* ------------------------------------------------------------------ */

/**
 * Process an improvement analysis job.
 *
 * Payload:
 *   - attemptId — the completed exam attempt
 */
export async function processImprovementAnalysis(
  job: Job<any, unknown, string>,
): Promise<void> {
  const { attemptId } = job.data;

  console.log(`[assessment/worker] Analyzing attempt=${attemptId}`);
  await analyzeExamAttempt(attemptId);
  console.log(`[assessment/worker] Analysis complete for attempt=${attemptId}`);

  // ── Weekly exam recap: notify student (and parent) once analysis is done ──
  try {
    const { sendExamRecap, enforceImprovementPlan } = await import(
      "@/services/exam-scheduler"
    );
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: { exam: { select: { type: true } } },
    });
    if (attempt?.exam?.type === "WEEKLY") {
      // 1. Turn the plan's recommended topics into INTENSIVE sessions
      const created = await enforceImprovementPlan(attemptId);
      if (created > 0) {
        console.log(
          `[assessment/worker] Enforced improvement plan: ${created} INTENSIVE session(s) scheduled`,
        );
      }
      // 2. Send recap to student + parent
      await sendExamRecap(attemptId);
    }
  } catch (err) {
    console.error("[assessment/worker] sendExamRecap error:", err);
  }
}
