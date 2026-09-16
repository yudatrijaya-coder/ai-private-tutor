/**
 * Shared labels for grade levels.
 *
 * Before this module the same map existed in three places (`bot/handlers/
 * register.ts`, `bot/handlers/youtube.ts`, `bot/handlers/onboarding.ts`) with
 * slightly different wording, so the same child could be "SD Kelas 5" in one
 * message and "SD_5" in another. New surfaces import from here.
 *
 * @module @/lib/grade-label
 */

const GRADE_LABELS: Record<string, string> = {
  SD_5: "SD Kelas 5",
  SMP_1: "SMP Kelas 7",
  SMA_2: "SMA Kelas 11",
};

/**
 * Human label for a `GradeLevel` enum value. Unknown values are returned as-is
 * rather than guessed, so a new grade shows up visibly instead of mislabelled.
 */
export function gradeLabel(grade: string | null | undefined): string {
  if (!grade) return "—";
  return GRADE_LABELS[grade] ?? grade;
}

/** Short form used in dense UI (badges, chips). */
export function gradeShort(grade: string | null | undefined): string {
  if (!grade) return "—";
  const label = GRADE_LABELS[grade] ?? grade;
  // "SD Kelas 5" -> "SD 5"
  return label.replace(/\s*Kelas\s*/i, " ");
}
