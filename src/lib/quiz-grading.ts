/**
 * Canonical quiz grading — shared by the web activity route and the bot quiz
 * handler.
 *
 * WHY THIS EXISTS
 * The two paths graded answers differently and one of them was simply wrong.
 * `POST /api/students/activity` did:
 *
 *     String(ans).trim().toUpperCase() === String(question.correctAnswer)...
 *
 * Two independent mistakes in one line:
 *   - `ans` is the whole answer object `{questionIndex, selectedIndex}`, not
 *     the selected option — stringifying it yields
 *     `"{'questionIndex': 4, 'selectedIndex': 0}"`.
 *   - questions are shaped `{question, options, correctIndex, explanation}`;
 *     there is no `correctAnswer` property, so the right-hand side is the
 *     string `"undefined"`.
 *
 * The comparison was therefore always false, every question was filed as
 * wrong, and the review queue filled with questions the student had answered
 * correctly. The bot handler compared `a.selectedIndex === q.correctIndex` and
 * was right — but the two could drift again, which is why the rule now lives
 * here and both callers import it.
 */

/** Question shape as stored in `Quiz.questions`. */
export interface QuizQuestion {
  question?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  difficulty?: string;
}

/** Answer shape as stored in `Attempt.answers`. */
export interface QuizAnswer {
  questionIndex?: number;
  selectedIndex?: number | null;
}

/** Max questions pulled into a single feedback message. */
export const FEEDBACK_QUESTION_LIMIT = 5;

/**
 * Parse `Quiz.questions` defensively — the column is untyped JSON, so anything
 * can be in there and a throw here would take down the grading caller.
 */
export function parseQuestions(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((q): q is QuizQuestion => typeof q === "object" && q !== null);
}

/**
 * Parse `Attempt.answers` defensively.
 *
 * Two shapes exist in the wild: the bot writes `{questionIndex, selectedIndex}`
 * and older rows may hold a bare index. Anything unrecognised is dropped rather
 * than guessed at — a wrong guess would file a correct answer as wrong.
 */
export function parseAnswers(raw: unknown): QuizAnswer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a, fallbackIdx): QuizAnswer | null => {
      if (typeof a === "number") return { questionIndex: fallbackIdx, selectedIndex: a };
      if (typeof a !== "object" || a === null) return null;
      const rec = a as Record<string, unknown>;
      const qi = rec.questionIndex ?? rec.questionIdx ?? rec.idx;
      const si = rec.selectedIndex ?? rec.selected ?? rec.answer;
      return {
        questionIndex: typeof qi === "number" ? qi : fallbackIdx,
        selectedIndex: typeof si === "number" ? si : null,
      };
    })
    .filter((a): a is QuizAnswer => a !== null);
}

/**
 * Is this answer correct?
 *
 * Unanswered (null/undefined/out-of-range) counts as wrong — the student did
 * not demonstrate the skill, so it belongs in the review queue.
 */
export function isAnswerCorrect(
  question: QuizQuestion | undefined,
  answer: QuizAnswer | undefined,
): boolean {
  if (!question || !answer) return false;
  const correct = question.correctIndex;
  const selected = answer.selectedIndex;
  if (typeof correct !== "number" || typeof selected !== "number") return false;
  return selected === correct;
}

/**
 * Question indexes the student got wrong.
 *
 * Questions the student never answered — the answer list is shorter than the
 * question list, which is the normal case for a partially completed quiz — are
 * deliberately NOT included. They were not attempted, and pushing them into
 * spaced repetition would manufacture work the student never failed.
 */
export function wrongQuestionIndices(
  questions: QuizQuestion[],
  answers: QuizAnswer[],
): number[] {
  const out: number[] = [];
  for (const answer of answers) {
    const idx = answer.questionIndex;
    if (typeof idx !== "number" || idx < 0 || idx >= questions.length) continue;
    if (!isAnswerCorrect(questions[idx], answer)) out.push(idx);
  }
  return out;
}

/** Count of answers the student got right, for a score sanity cross-check. */
export function countCorrect(questions: QuizQuestion[], answers: QuizAnswer[]): number {
  return answers.filter((a) => {
    const idx = a.questionIndex;
    if (typeof idx !== "number" || idx < 0 || idx >= questions.length) return false;
    return isAnswerCorrect(questions[idx], a);
  }).length;
}
