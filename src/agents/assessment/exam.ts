/**
 * Exam Generator — creates composite exams from multiple sub-topics
 * Mixes easy/medium/hard questions, provides answer key
 */
import type { QuestionData } from "./types";

export interface Exam {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  topics: string[];
  questions: QuestionData[];
  totalQuestions: number;
  difficulty: { easy: number; medium: number; hard: number };
}

interface QuizSource {
  getQuiz: (subject: string, topic: string, subTopic: string) => QuestionData[];
}

/**
 * Generate exam covering multiple sub-topics for a subject.
 * Mixes difficulty levels, shuffles questions, provides answer key.
 */
export function generateCompositeExam(
  quizSource: QuizSource,
  subject: string,
  gradeLevel: string,
  topics: string[],
  subTopics: string[],
  questionCount = 20,
): Exam {
  // Collect all questions from the specified sub-topics
  const pool: QuestionData[] = [];
  
  for (const topic of topics) {
    for (const subTopic of subTopics) {
      // Try exact match first
      let qs = quizSource.getQuiz(subject, topic, subTopic);
      if (qs.length === 0) {
        // Try main topic only
        qs = quizSource.getQuiz(subject, topic, "");
      }
      if (qs.length === 0) {
        // Try partial match
        const allKeys = Object.keys(quizSource);
        const matchKey = allKeys.find(
          k => k.includes(subject) && k.includes(topic) && k.includes(subTopic)
        );
        if (matchKey) {
          qs = (quizSource as any)[matchKey] || [];
        }
      }
      pool.push(...qs);
    }
  }

  // Balance difficulty: ~40% easy, ~40% medium, ~20% hard
  const easy = pool.filter(q => q.difficulty === "easy");
  const medium = pool.filter(q => q.difficulty === "medium");
  const hard = pool.filter(q => q.difficulty === "hard");

  const selected: QuestionData[] = [];
  const easyCount = Math.min(Math.round(questionCount * 0.4), easy.length);
  const mediumCount = Math.min(Math.round(questionCount * 0.4), medium.length);
  const hardCount = Math.min(questionCount - easyCount - mediumCount, hard.length);

  // Shuffle helper
  const shuffle = (arr: QuestionData[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  selected.push(
    ...shuffle(easy).slice(0, easyCount),
    ...shuffle(medium).slice(0, mediumCount),
    ...shuffle(hard).slice(0, hardCount),
  );

  // Shuffle final selection
  const finalQuestions = shuffle(selected);

  const difficultyCount = {
    easy: finalQuestions.filter(q => q.difficulty === "easy").length,
    medium: finalQuestions.filter(q => q.difficulty === "medium").length,
    hard: finalQuestions.filter(q => q.difficulty === "hard").length,
  };

  return {
    id: `exam_${Date.now()}`,
    title: `Ulangan ${subject} — ${topics.join(", ")}`,
    subject,
    gradeLevel,
    topics,
    questions: finalQuestions,
    totalQuestions: finalQuestions.length,
    difficulty: difficultyCount,
  };
}

/**
 * Get answer key for an exam
 */
export function getAnswerKey(exam: Exam) {
  return exam.questions.map((q, i) => ({
    no: i + 1,
    difficulty: q.difficulty,
    correctIndex: q.correctIndex,
    correctAnswer: q.options[q.correctIndex],
    explanation: q.explanation,
  }));
}
