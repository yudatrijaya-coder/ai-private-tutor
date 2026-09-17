/**
 * Curriculum Service — generate draft curriculum using static data banks.
 *
 * No LLM calls, no scraping. Uses curriculum-topics, curriculum-content, and
 * quiz-bank modules for all data.
 *
 * @module @/agents/curriculum/service
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { GradeLevel, DeliveryType, MaterialStatus } from "@/generated/prisma/client";
import { GRADE_TOPICS } from "@/data/curriculum-topics";
import { getContent } from "@/data/curriculum-content";
// Grade-specific quiz banks
import { getQuiz as getQuizSD5 } from "@/data/quiz-bank-sd5";
import { getQuiz as getQuizSMP7 } from "@/data/quiz-bank-smp7";
import { getQuiz as getQuizSMA11 } from "@/data/quiz-bank-sma11";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function serializeGradeLevel(grade: string): "SD_5" | "SMP_1" | "SMA_2" {
  if (grade === "SD_5" || grade === "SMP_1" || grade === "SMA_2") return grade;
  throw new Error(`Invalid grade level: ${grade}`);
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Generate an initial curriculum draft for a newly enrolled student.
 *
 * Admission trigger — called by Guardian Agent when a new student is enrolled.
 *
 * 1. Looks up topic lists from @/data/curriculum-topics
 * 2. Fills content from @/data/curriculum-content (no scraping)
 * 3. Attaches quizzes from @/data/quiz-bank
 * 4. Creates Curriculum + Material + Quiz records in READY status
 */
export async function generateCurriculumDraft(
  studentId: string,
  opts: { version?: number; changelog?: string } = {},
): Promise<void> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error("Student not found");

  const topics = GRADE_TOPICS[student.gradeLevel];

  if (!topics || topics.length === 0) {
    console.warn(
      `[curriculum/service] No topic mapping for grade=${student.gradeLevel}; skipping curriculum generation`,
    );
    return;
  }

  // 1. Create curriculum + materials + quizzes in READY status (content is pre-baked)
  const curriculum = await prisma.curriculum.create({
    data: {
      studentId,
      gradeLevel: serializeGradeLevel(student.gradeLevel),
      version: opts.version ?? 1,
      changelog: opts.changelog ?? "Initial curriculum from data bank",
      metadata: {
        source: "curriculum-topics + curriculum-content + quiz-bank",
        totalSubjects: [...new Set(topics.map((t) => t.subject))].length,
        totalMaterials: topics.length,
      },
    },
    include: { materials: true },
  });

  const gradeLevelEnum = serializeGradeLevel(student.gradeLevel);

  // ─── Quiz bank by grade ──────────────────────────────────────
  const QUIZ_BANKS: Record<string, (subject: string, topic: string, subTopic: string) => any[]> = {
    SD_5: getQuizSD5,
    SMP_1: getQuizSMP7,
    SMA_2: getQuizSMA11,
  };
  const getQuizForGrade = QUIZ_BANKS[student.gradeLevel] ?? getQuizSD5;
  // ─────────────────────────────────────────────────────────────

  for (const topic of topics) {
    const content = getContent(topic.subject, topic.topic, topic.subTopic);

    const material = await prisma.material.create({
      data: {
        curriculumId: curriculum.id,
        topic: topic.topic,
        subTopic: topic.subTopic,
        subject: topic.subject,
        gradeLevel: gradeLevelEnum,
        weekOrder: topic.weekOrder,
        priority: topic.priority,
        delivery: "TEXT",
        // Content is already available — mark READY immediately
        status: MaterialStatus.READY,
        processedContent: content,
        metadata: {
          source: "curriculum-content",
          generatedAt: new Date().toISOString(),
          // The slides viewer resolves markdown from `metadata` only —
          // `processedContent` is just the fallback it splits on blank lines
          // (see lib/content/slide-content.ts, slideCandidates). Mirror the bank
          // text here so a regenerated material renders the same as a scraped
          // one, `---` slide separators and all.
          ...(content ? { slide: content } : {}),
        },
      },
    });

    // Attach quiz from bank if available (grade-specific)
    const quizQuestions = getQuizForGrade(topic.subject, topic.topic, topic.subTopic);
    if (quizQuestions && quizQuestions.length > 0) {
      const maxScore = quizQuestions.length * 10;

      await prisma.quiz.create({
        data: {
          materialId: material.id,
          studentId,
          questions: quizQuestions as unknown as Prisma.InputJsonValue,
          maxScore: Math.max(maxScore, 10),
          timeLimit: 5,
        },
      });
    }
  }

  const materialCount = await prisma.material.count({
    where: { curriculumId: curriculum.id },
  });
  const quizCount = await prisma.quiz.count({
    where: { material: { curriculumId: curriculum.id } },
  });

  console.log(
    `[curriculum/service] Created curriculum=${curriculum.id} with ${materialCount} material(s) and ${quizCount} quiz(zes) for student=${studentId} (grade=${student.gradeLevel})`,
  );
}

/* ------------------------------------------------------------------ */
/*  Replacement                                                        */
/* ------------------------------------------------------------------ */

export interface ReplaceResult {
  /** `replaced` = old rows deleted; `superseded` = old rows kept for history;
   *  `blocked` = attempts exist and superseding was not authorised. */
  mode: "replaced" | "superseded" | "blocked";
  /** Version the new curriculum must be written as (0 when blocked). */
  nextVersion: number;
  keptCurriculumIds: string[];
  oldMaterialCount: number;
  oldQuizCount: number;
  oldAttemptCount: number;
}

/**
 * Clear a student's curriculum so it can be rebuilt from the data bank.
 *
 * Every FK along the chain is RESTRICT (`Material.curriculumId`,
 * `Quiz.materialId`, `Attempt.quizId`), so a single `curriculum.deleteMany()`
 * raises P2003 instead of cascading. Deletes must run quizzes → materials →
 * curricula.
 *
 * A curriculum whose quizzes have been sat cannot be deleted without destroying
 * the student's answers, so it is superseded instead: the old rows stay and the
 * rebuilt curriculum is written as the next version. Readers resolve the active
 * curriculum by highest version (`@/lib/curriculum-active`), so superseded
 * versions are inert.
 */
export async function replaceCurriculumForStudent(
  studentId: string,
  opts: { allowSupercede?: boolean } = {},
): Promise<ReplaceResult> {
  const curricula = await prisma.curriculum.findMany({
    where: { studentId },
    select: { id: true, version: true },
  });

  /** Everything is deleted -> start the numbering over at 1. */
  const highestVersion = curricula.reduce((max, c) => Math.max(max, c.version), 0);
  const replacingNextVersion = 1;
  const supersedingNextVersion = highestVersion + 1;

  if (curricula.length === 0) {
    return {
      mode: "replaced",
      nextVersion: replacingNextVersion,
      keptCurriculumIds: [],
      oldMaterialCount: 0,
      oldQuizCount: 0,
      oldAttemptCount: 0,
    };
  }

  const ids = curricula.map((c) => c.id);
  const materials = await prisma.material.findMany({
    where: { curriculumId: { in: ids } },
    select: { id: true },
  });
  const materialIds = materials.map((m) => m.id);
  const quizIds = (
    await prisma.quiz.findMany({
      where: { materialId: { in: materialIds } },
      select: { id: true },
    })
  ).map((q) => q.id);

  const oldAttemptCount = await prisma.attempt.count({
    where: { quizId: { in: quizIds } },
  });

  if (oldAttemptCount > 0) {
    if (!opts.allowSupercede) {
      console.warn(
        `[curriculum/service] Refusing to replace student=${studentId}: ${oldAttemptCount} attempt(s) exist. Superseding would make a rebuilt, content-less curriculum active.`,
      );
      return {
        mode: "blocked",
        nextVersion: 0,
        keptCurriculumIds: ids,
        oldMaterialCount: materialIds.length,
        oldQuizCount: quizIds.length,
        oldAttemptCount,
      };
    }

    console.warn(
      `[curriculum/service] student=${studentId} has ${oldAttemptCount} attempt(s) on its curriculum; superseding (v${supersedingNextVersion}) instead of deleting`,
    );
    return {
      mode: "superseded",
      nextVersion: supersedingNextVersion,
      keptCurriculumIds: ids,
      oldMaterialCount: materialIds.length,
      oldQuizCount: quizIds.length,
      oldAttemptCount,
    };
  }

  await prisma.reviewQueue.deleteMany({ where: { quizId: { in: quizIds } } });
  await prisma.attempt.deleteMany({ where: { quizId: { in: quizIds } } });
  await prisma.quiz.deleteMany({ where: { id: { in: quizIds } } });
  await prisma.material.deleteMany({ where: { curriculumId: { in: ids } } });
  await prisma.curriculum.deleteMany({ where: { id: { in: ids } } });

  console.log(
    `[curriculum/service] Cleared student=${studentId}: ${materialIds.length} material(s), ${quizIds.length} quiz(zes), ${curricula.length} curriculum version(s)`,
  );

  return {
    mode: "replaced",
    nextVersion: replacingNextVersion,
    keptCurriculumIds: [],
    oldMaterialCount: materialIds.length,
    oldQuizCount: quizIds.length,
    oldAttemptCount: 0,
  };
}
