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
import QUIZ_MAP from "@/data/quiz-bank";
import { quizKey } from "@/data/quiz-bank";

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
export async function generateCurriculumDraft(studentId: string): Promise<void> {
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
      version: 1,
      changelog: "Initial curriculum from data bank",
      metadata: {
        source: "curriculum-topics + curriculum-content + quiz-bank",
        totalSubjects: [...new Set(topics.map((t) => t.subject))].length,
        totalMaterials: topics.length,
      },
    },
    include: { materials: true },
  });

  const gradeLevelEnum = serializeGradeLevel(student.gradeLevel);

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
        },
      },
    });

    // Attach quiz from bank if available
    const quizQuestions = QUIZ_MAP[quizKey(topic.subject, topic.topic, topic.subTopic)];
    if (quizQuestions) {
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
