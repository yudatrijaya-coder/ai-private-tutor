/**
 * Assessment Agent — shared types.
 *
 * @module @/agents/assessment/types
 */

/** A single quiz/exam question */
export interface QuestionData {
  question: string;
  options: string[]; // exactly 4 items for multiple choice
  correctIndex: number; // 0–3
  explanation: string;
}

/** Quiz or Exam record — mirrors the Prisma Quiz model shape */
export interface QuizData {
  id: string;
  materialId: string;
  studentId: string;
  type: "QUIZ" | "EXAM";
  questions: QuestionData[];
  maxScore: number;
  timeLimit: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Student's answer for a single question */
export interface StudentAnswer {
  questionIndex: number; // index into QuestionData[]
  selectedIndex: number; // selected option (0–3)
}

/** Result of grading one attempt */
export interface AttemptResult {
  attemptId: string;
  quizId: string;
  studentId: string;
  score: number;
  maxScore: number;
  masteryAfter: number | null;
  timeSpent: number | null;
  answers: StudentAnswer[];
  correctCount: number;
  incorrectCount: number;
  details: QuestionResult[];
}

/** Per-question grading detail */
export interface QuestionResult {
  questionIndex: number;
  question: string;
  correct: boolean;
  selectedIndex: number;
  correctIndex: number;
  explanation: string;
}

/** LLM-generated question format expected from the prompt */
export interface LLMQuestion {
  question: string;
  options: Record<string, string> | string[];
  answer?: string; // "A" | "B" | "C" | "D"
  correctIndex?: number;
  explanation: string;
}

export interface LLMQuizResponse {
  questions: LLMQuestion[];
}

/** Mastery level thresholds */
export const MASTERY_THRESHOLDS = {
  BEGINNER: [0, 0.4],
  DEVELOPING: [0.4, 0.6],
  PROFICIENT: [0.6, 0.8],
  MASTERED: [0.8, 1.0],
} as const;

export type MasteryLevel = keyof typeof MASTERY_THRESHOLDS;

/** Recency weight config for mastery smoothing */
export const RECENCY_WEIGHTS = {
  newest: 0.5,
  recent: 0.3,
  older: 0.15,
  oldest: 0.05,
} as const;
