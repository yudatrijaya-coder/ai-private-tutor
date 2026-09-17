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
  /**
   * Option texts, always plain strings once parsed.
   *
   * The database stores this column two different ways. 8833 questions hold
   * `["Asam sitrat", ...]`; 200 hold `[{text: "Asam sitrat", isCorrect: true}]`.
   * Every consumer — the student pages, the admin pages, the bot's inline
   * keyboard, the feedback message — renders these directly, so the object
   * shape used to reach React as a child and throw error #31
   * ("Objects are not valid as a React child"), taking the whole page down.
   *
   * `parseQuestions` / `normalizeQuestion` flatten it, so anything that goes
   * through them can trust this type. Read the raw column directly and you get
   * whatever is on disk.
   */
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
 * Flatten a question's options to plain strings.
 *
 * Accepts the two shapes found on disk plus the shapes an LLM tends to emit:
 *   ["a", "b"]                       → unchanged
 *   [{text: "a"}, {label: "b"}]      → ["a", "b"]
 *   {A: "a", B: "b"}                 → ["a", "b"]
 * Anything unreadable is dropped rather than stringified — `String({...})`
 * would put "[object Object]" in front of a student, which is worse than
 * showing one option fewer.
 */
export function optionTexts(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    // { A: "...", B: "..." } — Object.values keeps insertion order for string keys.
    if (raw && typeof raw === "object") {
      return optionTexts(Object.values(raw as Record<string, unknown>));
    }
    return [];
  }
  const out: string[] = [];
  for (const o of raw) {
    if (typeof o === "string") {
      out.push(o);
      continue;
    }
    if (typeof o === "number" || typeof o === "boolean") {
      out.push(String(o));
      continue;
    }
    if (o && typeof o === "object") {
      const rec = o as Record<string, unknown>;
      const t = rec.text ?? rec.label ?? rec.value ?? rec.option ?? rec.answer;
      if (typeof t === "string") out.push(t);
      else if (typeof t === "number") out.push(String(t));
    }
  }
  return out;
}

/** Index of the single option carrying `isCorrect: true`, or null. */
function flaggedOptionIndex(raw: unknown): number | null {
  if (!Array.isArray(raw)) return null;
  const hits = raw
    .map((o, i) =>
      o && typeof o === "object" && (o as Record<string, unknown>).isCorrect === true ? i : -1,
    )
    .filter((i) => i >= 0);
  return hits.length === 1 ? hits[0] : null;
}

/**
 * Decide which option is correct.
 *
 * `correctIndex` wins when it is present and in range. The `isCorrect` flag is
 * only a fallback for the case where the index is missing or out of bounds —
 * 8838 of 9038 questions carry no flag at all, so it cannot be the primary
 * source. Returns null when neither is usable, which callers must treat as
 * "cannot grade" rather than "everything is wrong".
 */
export function pickCorrectIndex(
  rawOptions: unknown,
  correctIndex: unknown,
  optionCount: number,
): number | null {
  if (
    typeof correctIndex === "number" &&
    Number.isInteger(correctIndex) &&
    correctIndex >= 0 &&
    (optionCount === 0 || correctIndex < optionCount)
  ) {
    return correctIndex;
  }
  return flaggedOptionIndex(rawOptions);
}

/** `pickCorrectIndex` for an already-parsed question. */
export function resolveCorrectIndex(question: QuizQuestion | undefined): number | null {
  if (!question) return null;
  return pickCorrectIndex(
    (question as { options?: unknown }).options,
    question.correctIndex,
    question.options?.length ?? 0,
  );
}

/**
 * Why a stored question cannot be shown to a student, or `null` when it can.
 *
 * The graders read `correctIndex` alone, so a truncated row still scores — a
 * question the student cannot see is worse than a missing one. This is the one
 * renderability rule: the audit that finds these rows, the bank emitter that
 * drops them, and the writer that should never have stored them all call it, so
 * their counts cannot disagree.
 *
 * Note it rejects a *non-string* option rather than filtering it out. Filtering
 * shifts every later index while `correctIndex` stays put, which silently
 * re-points the answer — the failure mode this predicate exists to catch.
 */
export function questionRejection(raw: unknown): string | null {
  if (raw === null) return "null entry";
  if (typeof raw !== "object") return `non-object (${typeof raw})`;
  const o = raw as Record<string, unknown>;

  const question = typeof o.question === "string" ? o.question.trim() : "";
  if (!question) return "no `question`";

  if (!Array.isArray(o.options)) return "options not an array";
  const malformed = o.options.filter((x) => typeof x !== "string" || x.trim().length === 0).length;
  if (malformed > 0) return `option not a non-empty string (${malformed})`;
  if (o.options.length < 2) return `options < 2 (got ${o.options.length})`;

  const ci = o.correctIndex;
  if (typeof ci !== "number" || !Number.isInteger(ci) || ci < 0 || ci >= o.options.length) {
    return "`correctIndex` outside options";
  }
  return null;
}

/**
 * Coerce one raw question into the normalised shape.
 * Returns null for entries that are not objects, so a malformed row cannot
 * shift the indexes of the questions around it.
 */
export function normalizeQuestion(raw: unknown): QuizQuestion | null {
  if (typeof raw !== "object" || raw === null) return null;
  const rec = raw as Record<string, unknown>;
  const options = optionTexts(rec.options);
  const correctIndex = pickCorrectIndex(rec.options, rec.correctIndex, options.length);

  const out: QuizQuestion = { options };
  if (typeof rec.question === "string") out.question = rec.question;
  if (correctIndex !== null) out.correctIndex = correctIndex;
  if (typeof rec.explanation === "string") out.explanation = rec.explanation;
  if (typeof rec.difficulty === "string") out.difficulty = rec.difficulty;
  return out;
}

/**
 * Parse `Quiz.questions` defensively — the column is untyped JSON, so anything
 * can be in there and a throw here would take down the grading caller.
 *
 * This is also the normalisation boundary: options come out as plain strings and
 * `correctIndex` is guaranteed to be in range whenever it is set. Callers that
 * go through here can treat `QuizQuestion` as honest.
 */
export function parseQuestions(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeQuestion).filter((q): q is QuizQuestion => q !== null);
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
  const correct = resolveCorrectIndex(question);
  const selected = answer.selectedIndex;
  if (correct === null || typeof selected !== "number") return false;
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
