/**
 * Speed Index — Option 2 of the achievement quantization systems.
 *
 * Deterministic (no LLM): compares actual per-question time spent against
 * expected time for that question's difficulty, producing a 0-100 index.
 * Also produces a combined Confidence Index (accuracy × speed).
 *
 * Data source: client sends `timeSpentMs` array (one entry per question,
 * accumulated on the client while the exam is being taken). Server persists
 * per-question ms in `ExamAttempt.details.timeSpentMs` and total seconds in
 * `ExamAttempt.timeSpent`.
 */

/** Expected seconds per question by difficulty (MCQ baseline). */
const EXPECTED_SECONDS: Record<string, number> = {
  EASY: 45,
  MEDIUM: 75,
  HARD: 105,
};

const DEFAULT_EXPECTED = 75;
/** Best achievable ratio (answers 25% faster than expected = 100). */
const RATIO_CAP = 1.25;

export interface SpeedIndexInput {
  /** Per-question time in ms (index-aligned with questions). Sparse/null allowed. */
  timeSpentMs: (number | null)[];
  /** Difficulty per question, same length. */
  difficulties: string[];
  /** Accuracy 0-100 for the confidence composite. */
  accuracyPct: number;
}

export interface SpeedIndexResult {
  /** 0-100; 100 = consistently at/below expected time. null if no timing data. */
  speedIndex: number | null;
  /** 0-100; 50% accuracy + 50% speed. null if speed unknown. */
  confidenceIndex: number | null;
  /** Total exam duration in seconds (rounded). null if no timing data. */
  totalSeconds: number | null;
  /** Average seconds per question. null if no timing data. */
  avgSecondsPerQuestion: number | null;
  /** Number of questions with valid timing captured. */
  timedQuestions: number;
}

function expectedFor(difficulty: string | undefined): number {
  return EXPECTED_SECONDS[difficulty?.toUpperCase() ?? ""] ?? DEFAULT_EXPECTED;
}

/**
 * Compute speed + confidence index from per-question timing.
 * Pure function — no DB, no LLM.
 */
export function computeSpeedIndex(input: SpeedIndexInput): SpeedIndexResult {
  const { timeSpentMs, difficulties, accuracyPct } = input;

  const valid: number[] = [];
  let totalMs = 0;

  timeSpentMs.forEach((ms, i) => {
    if (typeof ms === "number" && ms > 0) {
      valid.push(ms);
      totalMs += ms;
      void difficulties[i]; // difficulty used below per-question
    }
  });

  if (valid.length === 0) {
    return {
      speedIndex: null,
      confidenceIndex: null,
      totalSeconds: null,
      avgSecondsPerQuestion: null,
      timedQuestions: 0,
    };
  }

  // Per-question efficiency ratio, capped at RATIO_CAP, mapped to 0-100.
  let ratioSum = 0;
  let ratioCount = 0;
  timeSpentMs.forEach((ms, i) => {
    if (typeof ms !== "number" || ms <= 0) return;
    const expected = expectedFor(difficulties[i]);
    const actualSec = ms / 1000;
    const ratio = Math.min(expected / actualSec, RATIO_CAP);
    ratioSum += ratio;
    ratioCount++;
  });

  const speedIndex = ratioCount > 0
    ? Math.round((ratioSum / ratioCount / RATIO_CAP) * 100)
    : null;

  const totalSeconds = Math.round(totalMs / 1000);
  const avgSecondsPerQuestion = valid.length > 0
    ? Math.round((totalMs / valid.length / 1000) * 10) / 10
    : null;

  const confidenceIndex = speedIndex !== null
    ? Math.round(0.5 * accuracyPct + 0.5 * speedIndex)
    : null;

  return {
    speedIndex,
    confidenceIndex,
    totalSeconds,
    avgSecondsPerQuestion,
    timedQuestions: valid.length,
  };
}

/**
 * Label for UI chips.
 */
export function speedLabel(index: number | null): string {
  if (index === null) return "—";
  if (index >= 80) return "⚡ Sangat Cepat";
  if (index >= 60) return "🏃 Cepat";
  if (index >= 40) return "🚶 Normal";
  return "🐢 Perlu Latihan Kecepatan";
}
