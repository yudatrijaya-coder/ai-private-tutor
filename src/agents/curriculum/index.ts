/**
 * Curriculum Agent — barrel exports.
 *
 * @module @/agents/curriculum
 */

export { generateCurriculumDraft, replaceCurriculumForStudent } from "./service";
export type { ReplaceResult } from "./service";
export { processCurriculumReviewJob } from "./worker";
