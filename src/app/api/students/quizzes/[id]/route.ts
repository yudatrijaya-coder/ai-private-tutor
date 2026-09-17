import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { optionTexts } from "@/lib/quiz-grading";
import { resolveScope } from "@/lib/auth/scope";
import { getActiveCurriculumId } from "@/lib/curriculum-active";

/**
 * GET /api/students/quizzes/[id]
 * Returns quiz detail with questions, material info, and answer key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await resolveScope();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      material: {
        select: { subject: true, topic: true, subTopic: true },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  // Ownership: a student may only open a quiz reachable from their OWN
  // curriculum IN FORCE. Respond 404 rather than 403 so the endpoint does not
  // confirm that a guessed quiz id exists. See `src/lib/curriculum-active.ts`.
  if (scope.kind === "student") {
    const activeCurriculumId = await getActiveCurriculumId(scope.session.studentId);
    const owns =
      quiz.materialId && activeCurriculumId
        ? await prisma.material.findFirst({
            where: {
              id: quiz.materialId,
              curriculumId: activeCurriculumId,
            },
            select: { id: true },
          })
        : null;
    if (!owns) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
  }

  const questions = (quiz.questions as any[]) || [];

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      materialId: quiz.materialId,
      type: quiz.type,
      maxScore: quiz.maxScore,
      timeLimit: quiz.timeLimit,
      questions: questions.map((q) => ({
        question: q.question,
        // Flattened, but correctIndex is still deliberately withheld — the
        // answer key must not reach the client before the student submits.
        options: optionTexts(q.options),
        difficulty: q.difficulty || "medium",
      })),
      material: quiz.material,
      createdAt: quiz.createdAt,
    },
  });
}
