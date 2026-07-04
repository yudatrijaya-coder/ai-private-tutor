/**
 * Exam Generator — produces a comprehensive exam (20–30 questions)
 * drawn from all materials available to a student.
 *
 * When the LLM is available it uses the model to generate fresh questions.
 * Otherwise it selects and reuses questions from existing quizzes.
 *
 * @module @/agents/assessment/exam
 */

import { prisma } from "@/lib/prisma";
import type { QuestionData, QuizData } from "./types";

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Generate an exam for a student covering all their materials.
 *
 * @param studentId  - The student to generate the exam for.
 * @param topicFilter - Optional topic to restrict to (e.g. "Matematika").
 * @param count       - Number of questions (default 20, min 15, max 40).
 */
export async function generateExam(
  studentId: string,
  topicFilter?: string,
  count: number = 20,
): Promise<QuizData> {
  const questionCount = Math.max(15, Math.min(40, count));

  // 1. Locate all materials for this student
  const materials = await prisma.material.findMany({
    where: {
      curriculum: { studentId },
      processedContent: { not: null },
      ...(topicFilter ? { subject: topicFilter } : {}),
    },
    orderBy: { weekOrder: "asc" },
  });

  if (materials.length === 0) {
    throw new Error(
      `No processed materials found for student=${studentId}${topicFilter ? ` topic=${topicFilter}` : ""}`,
    );
  }

  // 2. Try LLM-first for fresh exam questions
  try {
    const llmQuestions = await tryLLMExam(materials, questionCount);
    if (llmQuestions.length >= questionCount * 0.5) {
      return await saveExam(
        materials[0].id,
        studentId,
        llmQuestions.slice(0, questionCount),
      );
    }
  } catch {
    // fallback below
  }

  // 3. Fallback: aggregate questions from existing quizzes
  const examQuestions = await aggregateFromQuizzes(
    materials.map((m) => m.id),
    questionCount,
  );

  return await saveExam(materials[0].id, studentId, examQuestions);
}

/* ------------------------------------------------------------------ */
/*  LLM Path                                                            */
/* ------------------------------------------------------------------ */

async function tryLLMExam(
  materials: { topic: string; subject: string; processedContent: string | null }[],
  count: number,
): Promise<QuestionData[]> {
  const { callLLM } = await import("@/llm/client");
  const { SYSTEM_PROMPTS } = await import("@/llm/prompts");

  // Build a concise summary of all topics covered
  const topicSummary = materials
    .map((m) => `- ${m.subject}: ${m.topic}`)
    .join("\n");

  const contentSamples = materials
    .slice(0, 3)
    .map((m) => m.processedContent?.slice(0, 1000) ?? "")
    .filter(Boolean)
    .join("\n\n---\n\n");

  const questionsText = await callLLM("assessment", [
    {
      role: "system",
      content: SYSTEM_PROMPTS.assessment,
    },
    {
      role: "user",
      content: [
        `Generate ${count} multiple choice exam questions in Indonesian covering all these topics:`,
        topicSummary,
        "",
        "Return a JSON array with objects containing: question, options (4 items), correctIndex (0-3), explanation.",
        "Distribute questions evenly across topics.",
        "",
        "Sample content for reference:",
        contentSamples.slice(0, 5000),
      ].join("\n"),
    },
  ]);

  if (!questionsText) return [];

  return parseLLMExamQuestions(questionsText);
}

function parseLLMExamQuestions(text: string): QuestionData[] {
  try {
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    const items = Array.isArray(parsed) ? parsed : (parsed as any)?.questions ?? [];

    return items
      .map((q: any) => ({
        question: String(q.question ?? ""),
        options: normalizeOptions(q.options),
        correctIndex: resolveCorrectIndex(q),
        explanation: String(q.explanation ?? ""),
      }))
      .filter((q: QuestionData) => q.question && q.options.length === 4);
  } catch {
    return [];
  }
}

function normalizeOptions(
  options: string[] | Record<string, string> | undefined,
): string[] {
  if (!options) return ["A", "B", "C", "D"];
  if (Array.isArray(options)) return options;
  return Object.values(options).slice(0, 4);
}

function resolveCorrectIndex(q: {
  correctIndex?: number;
  answer?: string;
}): number {
  if (q.correctIndex !== undefined) return q.correctIndex;
  if (q.answer) {
    const idx = "ABCD".indexOf(q.answer.toUpperCase().trim());
    if (idx >= 0) return idx;
  }
  return 0;
}

/* ------------------------------------------------------------------ */
/*  Fallback: aggregate from existing quizzes                           */
/* ------------------------------------------------------------------ */

async function aggregateFromQuizzes(
  materialIds: string[],
  targetCount: number,
): Promise<QuestionData[]> {
  const quizzes = await prisma.quiz.findMany({
    where: {
      materialId: { in: materialIds },
      type: "QUIZ" as any,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const pool: QuestionData[] = [];

  for (const quiz of quizzes) {
    const questions = (quiz.questions as unknown as QuestionData[]) ?? [];
    pool.push(...questions);
  }

  // Shuffle and take what we need
  shuffleArray(pool);

  return pool.slice(0, targetCount);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function saveExam(
  materialId: string,
  studentId: string,
  questions: QuestionData[],
): Promise<QuizData> {
  const quiz = await prisma.quiz.create({
    data: {
      materialId,
      studentId,
      type: "EXAM" as any,
      questions: questions as any,
      maxScore: questions.length,
      timeLimit: 60, // exams get 60 minutes
    },
  });

  return {
    id: quiz.id,
    materialId: quiz.materialId,
    studentId: quiz.studentId,
    type: quiz.type as "QUIZ" | "EXAM",
    questions: (quiz.questions as unknown as QuestionData[]) ?? [],
    maxScore: quiz.maxScore,
    timeLimit: quiz.timeLimit,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
  };
}
