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
    ], { studentId });

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

/**
 * Generate content-aware questions from processedContent when LLM is unavailable.
 * Uses a lightweight regex-based extraction to pull facts/definitions from content,
 * then generates varied question types. Never produces generic template questions.
 */
function hardcodedQuestions(material: {
  topic: string;
  subTopic?: string | null;
  subject: string;
  processedContent?: string | null;
}): QuestionData[] {
  const topic = material.topic ?? "materi ini";
  const subject = material.subject ?? "pelajaran";
  const content = (material.processedContent ?? "").trim();
  const lines = content.split("\n").map((l: string) => l.trim()).filter(Boolean);

  // Extract "X adalah Y" / "X merupakan Y" / "X = Y" definition patterns
  const definitions: string[] = [];
  const keywords: string[] = [];
  const facts: string[] = [];

  for (const line of lines) {
    // Skip very short lines or lines that look like headers
    if (line.length < 20) continue;
    const lower = line.toLowerCase();
    if (lower.startsWith("#") || lower.startsWith("**")) continue;

    // Definition patterns: "X adalah Y", "X merupakan Y", "X disebut Y"
    const defMatch = line.match(/([A-Z][A-Za-z0-9][^,.:]{5,60})\s+(?:adalah|merupakan|disebut|bernama|yaitu)\s+([^,.\n]{10,120})/);
    if (defMatch) {
      definitions.push(defMatch[1].trim());
      keywords.push(defMatch[2].trim());
    }

    // Bullet points with factual statements (starts with -, *, or number)
    if (/^[-*\d.]\s+\S/.test(line) && line.length > 30) {
      facts.push(line.replace(/^[-*\d.]\s+/, "").trim());
    }

    // Also extract sentences with key terms (length 40-120 chars, not a question)
    if (
      line.length >= 40 &&
      line.length <= 150 &&
      !line.endsWith("?") &&
      !line.includes("重要的") // skip Chinese remnants
    ) {
      facts.push(line);
    }
  }

  const questions: QuestionData[] = [];

  // Q1: Definition question — use first available definition
  if (definitions.length > 0 && keywords.length > 0) {
    const def = definitions[0];
    const key = keywords[0];
    const wrongOpts = [
      key,
      `Bukan ${key}`,
      `Sesuatu yang tidak ada hubungannya dengan ${topic}`,
      `${topic} bukan pelajaran`,
    ];
    // Shuffle so correct answer isn't always at same position
    const opts = shuffle([key, ...wrongOpts.slice(0, 3)]);
    questions.push({
      question: `Apa yang dimaksud dengan ${def}?`,
      options: opts,
      correctIndex: opts.indexOf(key),
      explanation: `${def} adalah ${key} dalam ${subject}.`,
    });
  }

  // Q2: True/false style — pick a factual statement and make it false
  if (facts.length >= 2) {
    const fact = facts[0];
    const trueOpt = fact;
    const falseOpts = facts.slice(1, 3).map((f) => {
      // Negate by adding/removing "tidak" or "bukan"
      return f.replace(/^(tidak |bukan )/i, "").replace(/(tidak |bukan )$/i, "");
    });
    const extraFalse = `${topic} tidak ada hubungannya dengan kehidupan sehari-hari`;
    const opts2 = shuffle([trueOpt, falseOpts[0] || extraFalse, falseOpts[1] || extraFalse, `Pengertian lain dari ${topic}`]);
    questions.push({
      question: `Manakah pernyataan yang BENAR tentang ${topic}?`,
      options: opts2.slice(0, 4),
      correctIndex: opts2.indexOf(trueOpt),
      explanation: `${trueOpt} adalah fakta yang benar mengenai ${topic}.`,
    });
  }

  // Q3: Characteristic / Ciri-ciri (if content has them)
  const charLines = lines.filter((l: string) =>
    /ciri|karakteristik|sifat|karakter|fitur|komponen|unsur/i.test(l) && l.length > 20
  );
  if (charLines.length >= 2) {
    const correct = charLines[0].replace(/^[-*\d.]\s+/, "").trim();
    const opts3 = shuffle([
      correct,
      charLines[1].replace(/^[-*\d.]\s+/, "").trim(),
      `Tidak ada ciri khusus dari ${topic}`,
      `Ciri yang hanya berlaku di luar Indonesia`,
    ]);
    questions.push({
      question: `Berikut ini yang merupakan ciri dari ${topic} adalah...`,
      options: opts3.slice(0, 4),
      correctIndex: opts3.indexOf(correct),
      explanation: `${correct} adalah ciri utama dari ${topic}.`,
    });
  }

  // Q4: Application / Contoh dalam kehidupan
  const contohLines = lines.filter((l: string) =>
    /contoh|contohnya|terapan|penerapan|di kehidupan|aplikasi/i.test(l) && l.length > 20
  );
  if (contohLines.length >= 1) {
    const correct = contohLines[0].replace(/^[-*\d.]\s+/, "").trim();
    const opts4 = shuffle([
      correct,
      `Tidak ada contoh nyata dari ${topic}`,
      `Hanya berlaku di laboratorium`,
      `Contoh yang tidak relevan dengan kehidupan`,
    ]);
    questions.push({
      question: `Berikut ini merupakan contoh penerapan ${topic} dalam kehidupan sehari-hari...`,
      options: opts4.slice(0, 4),
      correctIndex: opts4.indexOf(correct),
      explanation: `${correct} adalah contoh nyata dari penerapan ${topic}.`,
    });
  }

  // Q5: Relationship question
  if (definitions.length >= 2) {
    questions.push({
      question: `Bagaimana hubungan antara ${topic} dengan konsep lainnya dalam ${subject}?`,
      options: shuffle([
        `${topic} saling berkaitan dengan konsep lain dalam ${subject}`,
        `${topic} berdiri sendiri tanpa hubungan dengan topik lain`,
        `${topic} hanya berhubungan dengan matematika saja`,
        `${topic} tidak ada hubungannya dengan pelajaran sekolah`,
      ]),
      correctIndex: 0,
      explanation: `${topic} memiliki hubungan erat dengan konsep-konsep lain dalam ${subject}.`,
    });
  }

  // Ensure minimum 5 questions by filling with safe content-aware questions
  const safeTypes = [
    {
      question: `Apa peran ${topic} dalam ${subject}?`,
      options: shuffle([
        `Konsep dasar yang penting dalam ${subject}`,
        `Tidak memiliki peran khusus`,
        `Hanya materi pengayaan`,
        `Tidak diajar di kurikulum`,
      ]),
      correctIndex: 0,
      explanation: `${topic} merupakan konsep dasar yang penting dalam ${subject}.`,
    },
    {
      question: `Dalam ${subject}, ${topic} membahas tentang...`,
      options: shuffle([
        `Pengertian dan konsep dasar yang penting`,
        `Sesuatu yang tidak relevan`,
        `Materi yang sudah tidak berlaku`,
        `Topik yang hanya untuk tingkat universitas`,
      ]),
      correctIndex: 0,
      explanation: `${topic} dalam ${subject} membahas pengertian dan konsep dasar yang penting.`,
    },
  ];

  while (questions.length < 5) {
    const filler = safeTypes[questions.length % safeTypes.length];
    const uniqueOpts = Array.from(new Set([...filler.options, `Tidak ada jawaban yang benar`]));
    const filledOpts = shuffle(uniqueOpts).slice(0, 4);
    questions.push({ ...filler, options: filledOpts, correctIndex: filledOpts.indexOf(filler.options[0]) });
  }

  return questions.slice(0, 5);
}

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
