import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/students/quizzes/[id]
 * Returns quiz detail with questions, material info, and answer key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
        options: q.options,
        difficulty: q.difficulty || "medium",
      })),
      material: quiz.material,
      createdAt: quiz.createdAt,
    },
  });
}
