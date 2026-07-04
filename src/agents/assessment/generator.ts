/**
 * Assessment Generator — creates quiz/exam questions from material content.
 *
 * Primary path: LLM-generated questions via callLLM.
 * Fallback path: hardcoded topic-based questions when LLM is unavailable.
 *
 * @module @/agents/assessment/generator
 */

import { prisma } from "@/lib/prisma";
import type { QuestionData, QuizData, LLMQuizResponse, LLMQuestion } from "./types";
import { AttemptType } from "@/generated/prisma/enums";

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Generate a quiz for a given material.
 *
 * Tries LLM first; falls back to hardcoded topic-based questions when
 * the LLM call fails or returns unparseable output.
 */
export async function generateQuiz(materialId: string): Promise<QuizData> {
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    include: { curriculum: true },
  });

  if (!material || !material.processedContent) {
    throw new Error(`Material not found or not processed: ${materialId}`);
  }

  const studentId = material.curriculum?.studentId ?? "unknown";

  // Try LLM first
  try {
    const { callLLM } = await import("@/llm/client");
    const { SYSTEM_PROMPTS } = await import("@/llm/prompts");

    const questionsText = await callLLM("assessment", [
      {
        role: "system",
        content: SYSTEM_PROMPTS.assessment,
      },
      {
        role: "user",
        content: `Generate 5 multiple choice quiz questions in Indonesian for this material. Return JSON array with: question, options (4 items), correctIndex (0-3), explanation.\n\n${material.processedContent.slice(0, 3000)}`,
      },
    ]);

    if (questionsText) {
      const questions = parseLLMQuestions(questionsText);
      if (questions.length >= 2) {
        return await saveQuiz(material, questions, "QUIZ");
      }
    }
  } catch {
    // fallback below
  }

  // Fallback: generate topic-specific questions
  const questions = hardcodedQuestions(material);
  return await saveQuiz(material, questions, "QUIZ");
}

/* ------------------------------------------------------------------ */
/*  LLM Parsing                                                        */
/* ------------------------------------------------------------------ */

function parseLLMQuestions(text: string): QuestionData[] {
  try {
    // Try direct JSON parse first
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    // Could be array or { questions: [...] }
    let parsed: unknown = JSON.parse(cleaned);

    if (isLLMQuizResponse(parsed)) {
      return parsed.questions.map(mapLLMQuestion);
    }

    if (Array.isArray(parsed)) {
      return parsed.map(mapRawQuestion);
    }

    return [];
  } catch {
    return [];
  }
}

function isLLMQuizResponse(obj: unknown): obj is LLMQuizResponse {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "questions" in obj &&
    Array.isArray((obj as LLMQuizResponse).questions)
  );
}

function mapLLMQuestion(q: LLMQuestion): QuestionData {
  return {
    question: q.question,
    options: normalizeOptions(q.options),
    correctIndex: resolveCorrectIndex(q),
    explanation: q.explanation ?? "",
  };
}

function mapRawQuestion(q: Record<string, unknown>): QuestionData {
  return {
    question: String(q.question ?? ""),
    options: normalizeOptions(q.options as string[] | Record<string, string> | undefined),
    correctIndex: Number(q.correctIndex ?? 0),
    explanation: String(q.explanation ?? ""),
  };
}

function normalizeOptions(
  options: string[] | Record<string, string> | undefined,
  // eslint-disable-next-line @typescript-eslint/default-param-last
): string[] {
  if (!options) return ["A", "B", "C", "D"];
  if (Array.isArray(options)) return options;
  // { A: "...", B: "..." } → ["...", "..."]
  return Object.values(options).slice(0, 4);
}

function resolveCorrectIndex(q: LLMQuestion): number {
  if (q.correctIndex !== undefined) return q.correctIndex;
  if (q.answer) {
    const idx = "ABCD".indexOf(q.answer.toUpperCase().trim());
    if (idx >= 0) return idx;
  }
  return 0;
}

/* ------------------------------------------------------------------ */
/*  Fallback Questions                                                  */
/* ------------------------------------------------------------------ */

function hardcodedQuestions(material: {
  topic: string;
  subTopic?: string | null;
  subject: string;
}): QuestionData[] {
  const topic = material.topic ?? "materi ini";
  const subject = material.subject ?? "pelajaran";

  return [
    {
      question: `Apa yang dimaksud dengan ${topic}?`,
      options: [
        `Pengertian dari ${topic}`,
        `Kebalikan dari ${topic}`,
        `Contoh ${topic}`,
        `Sejarah ${topic}`,
      ],
      correctIndex: 0,
      explanation: `Karena itulah pengertian dari ${topic} dalam ${subject}.`,
    },
    {
      question: `Manakah pernyataan yang benar tentang ${topic}?`,
      options: [
        `${topic} tidak penting dalam ${subject}`,
        `${topic} adalah konsep dasar dalam ${subject}`,
        `${topic} hanya dipelajari di tingkat lanjut`,
        `${topic} tidak ada hubungannya dengan ${subject}`,
      ],
      correctIndex: 1,
      explanation: `${topic} adalah konsep dasar yang penting dalam ${subject}.`,
    },
    {
      question: `Berikut ini yang BUKAN merupakan contoh ${topic} adalah?`,
      options: ["Contoh A", "Contoh B", "Contoh C", "Contoh D"],
      correctIndex: 2,
      explanation: `Contoh C bukan termasuk ${topic} karena tidak sesuai dengan definisinya.`,
    },
    {
      question: `Mengapa ${topic} penting dipelajari?`,
      options: [
        `Karena ${topic} adalah satu-satunya materi dalam ${subject}`,
        `Karena ${topic} membantu memahami ${subject} secara keseluruhan`,
        `Karena ${topic} tidak berguna`,
        `Karena ${topic} hanya untuk ujian`,
      ],
      correctIndex: 1,
      explanation: `${topic} membantu membangun pemahaman dasar untuk ${subject}.`,
    },
    {
      question: `Apa manfaat mempelajari ${topic} dalam kehidupan sehari-hari?`,
      options: [
        `Tidak ada manfaatnya`,
        `${topic} hanya dipakai di sekolah`,
        `${topic} membantu kita memahami ${subject} di situasi nyata`,
        `${topic} hanya untuk guru`,
      ],
      correctIndex: 2,
      explanation: `${topic} memberikan pemahaman yang bisa diterapkan dalam kehidupan sehari-hari terkait ${subject}.`,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                         */
/* ------------------------------------------------------------------ */

async function saveQuiz(
  material: { id: string; curriculum: { studentId: string } | null },
  questions: QuestionData[],
  type: "QUIZ" | "EXAM",
): Promise<QuizData> {
  const studentId = material.curriculum?.studentId ?? "unknown";

  const quiz = await prisma.quiz.create({
    data: {
      materialId: material.id,
      studentId,
      type: type as keyof typeof AttemptType as any,
      questions: questions as any,
      maxScore: questions.length,
      timeLimit: type === "EXAM" ? 60 : 10,
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
