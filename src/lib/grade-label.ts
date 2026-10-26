/**
 * Shared labels for grade levels.
 *
 * Before this module the same map existed in three places (`bot/handlers/
 * register.ts`, `bot/handlers/youtube.ts`, `bot/handlers/onboarding.ts`) with
 * slightly different wording, so the same child could be "SD Kelas 5" in one
 * message and "SD_5" in another. New surfaces import from here.
 *
 * Why `ALL_GRADE_LABELS` is wider than the `GradeLevel` enum
 * ----------------------------------------------------------
 * The product only enrols three grades (`SD_5`, `SMP_1`, `SMA_2`), but the
 * admin analytics screen groups schedule rows by grade *string* and must be
 * able to render any national grade. Keeping those extra entries here means
 * one map to fix if wording ever changes, instead of one per component.
 *
 * Note the enum names are NOT class numbers: `SMP_1` is SMP kelas 7 and
 * `SMA_2` is SMA kelas 11. Getting this wrong ships the wrong difficulty to
 * the tutor prompt, so every label must come from this module.
 *
 * @module @/lib/grade-label
 */

/** Every national grade the UI may display, keyed by grade code. */
export const ALL_GRADE_LABELS: Record<string, string> = {
  SD_5: "SD Kelas 5",
  SD_6: "SD Kelas 6",
  SMP_1: "SMP Kelas 7",
  SMP_2: "SMP Kelas 8",
  SMP_3: "SMP Kelas 9",
  SMA_1: "SMA Kelas 10",
  SMA_2: "SMA Kelas 11",
  SMA_3: "SMA Kelas 12",
};

/** The grades a student can actually be enrolled in (`GradeLevel` enum). */
export const ENROLLED_GRADES = ["SD_5", "SMP_1", "SMA_2"] as const;

/**
 * Human label for a `GradeLevel` enum value. Unknown values are returned as-is
 * rather than guessed, so a new grade shows up visibly instead of mislabelled.
 */
export function gradeLabel(grade: string | null | undefined): string {
  if (!grade) return "—";
  return ALL_GRADE_LABELS[grade] ?? grade;
}

/** Short form used in dense UI (badges, chips). */
export function gradeShort(grade: string | null | undefined): string {
  if (!grade) return "—";
  const label = ALL_GRADE_LABELS[grade] ?? grade;
  // "SD Kelas 5" -> "SD 5"
  return label.replace(/\s*Kelas\s*/i, " ");
}

/**
 * Label followed by an optional suffix, e.g. `gradeLabelWith("SMP_1",
 * " (Kurikulum Merdeka)")`. Unknown codes keep the raw code but still carry
 * the suffix, so a new grade stays visible instead of silently losing it.
 */
export function gradeLabelWith(
  grade: string | null | undefined,
  suffix = "",
): string {
  if (!grade) return "—";
  return `${ALL_GRADE_LABELS[grade] ?? grade}${suffix}`;
}

/** Display options for a grade picker — the three enrolled grades only. */
export function gradeOptions(): Array<{ value: string; label: string }> {
  return ENROLLED_GRADES.map((value) => ({ value, label: gradeLabel(value) }));
}
