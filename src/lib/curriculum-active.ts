import { prisma } from "@/lib/prisma";

/**
 * A student can own more than one `Curriculum` row at once.
 *
 * Regenerating a curriculum inserts a row with `version + 1` and leaves the
 * previous rows in place, so Raihan (RAIHAN001) carries two full curricula:
 * v1 (264 materials, created 2026-07-12) and v3 (228 materials, 2026-07-14).
 * 129 lessons exist in both.
 *
 * Reading across every curriculum a student owns is therefore never correct:
 *
 *  - the two rows are different mappings, not halves of one — `Bilangan Bulat`
 *    is week 1 in v3 and week 999 in v1, so `weekOrder` becomes meaningless;
 *  - the union duplicates every lesson in the UI (`/student` listed 15 subjects
 *    instead of 12, the subject page showed 36 Fisika rows instead of 18);
 *  - the stale rows are never served to the student, so anything computed from
 *    them (progress snapshots, topic pickers, bot drill-downs) is fiction.
 *
 * The curriculum in force is the one with the **highest `version`**. That is the
 * convention the write paths already rely on, and every script that needs "the"
 * curriculum (`scripts/prosem-coverage.ts`, `scripts/sync-weekorder-prosem.ts`,
 * `src/services/weekly-exam-generator.ts`) already selects it that way.
 *
 * This module exists so that rule has one definition instead of nine copies.
 */

/** Prisma `orderBy` selecting the curriculum in force. */
export const ACTIVE_CURRICULUM_ORDER = [{ version: "desc" }, { createdAt: "desc" }] as const;

/**
 * The curriculum in force for a student, or `null` when they have none.
 *
 * `studentId` is `Student.id` (the cuid), not the human code like `RAIHAN001`.
 */
export async function getActiveCurriculumId(studentId: string): Promise<string | null> {
  const curriculum = await prisma.curriculum.findFirst({
    where: { studentId },
    orderBy: ACTIVE_CURRICULUM_ORDER as never,
    select: { id: true },
  });
  return curriculum?.id ?? null;
}

/**
 * The curriculum in force, with `curriculumId` ready to spread into a
 * `Material`/`Quiz` `where` clause.
 *
 * Returns `null` when the student has no curriculum, so callers short-circuit
 * with an honest empty state rather than silently falling back to another row.
 */
export async function getActiveCurriculum(studentId: string): Promise<{ id: string } | null> {
  const id = await getActiveCurriculumId(studentId);
  return id ? { id } : null;
}

/**
 * Same rule, keyed by the human student code (`RAIHAN001`) — for read paths
 * that start from a code rather than a primary key.
 */
export async function getActiveCurriculumIdByCode(studentCode: string): Promise<string | null> {
  const student = await prisma.student.findUnique({
    where: { studentId: studentCode },
    select: { id: true },
  });
  if (!student) return null;
  return getActiveCurriculumId(student.id);
}
