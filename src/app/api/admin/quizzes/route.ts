import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/quizzes
 * List all quizzes with optional filters: ?subject=&difficulty=&limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject");
    const difficulty = searchParams.get("difficulty");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

    // For the Quiz model, questions is stored as a JSON array of objects
    // with structure: { question, options, correctIndex, difficulty, explanation }
    // We filter at the application level since difficulty is inside JSON

    const where: Record<string, unknown> = {};

    if (subject) {
      where.material = { subject };
    }

    const quizzes = await prisma.quiz.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        material: {
          select: { id: true, topic: true, subject: true, weekOrder: true },
        },
        student: {
          select: { id: true, studentId: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Transform: parse questions array and optionally filter by difficulty
    let result = quizzes.map((q) => {
      const questions = (q.questions as any[]) || [];
      return {
        id: q.id,
        materialId: q.materialId,
        studentId: q.studentId,
        type: q.type,
        maxScore: q.maxScore,
        timeLimit: q.timeLimit,
        questions: questions.map((qs) => ({
          question: qs.question,
          options: qs.options,
          correctIndex: qs.correctIndex,
          difficulty: qs.difficulty || "medium",
          explanation: qs.explanation,
        })),
        material: q.material,
        student: q.student,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      };
    });

    // Post-filter by difficulty if specified (it's inside JSON)
    if (difficulty) {
      result = result.filter((q) =>
        q.questions.some((qs) => qs.difficulty === difficulty),
      );
    }

    return NextResponse.json({ quizzes: result, total: result.length });
  } catch (error) {
    console.error("[admin/quizzes] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/quizzes
 * Create a new quiz
 * Body: { materialId: string, studentId: string, type?: string, questions: Array<{question, options, correctIndex, difficulty?, explanation?}>, maxScore?: number, timeLimit?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { materialId, studentId, type, questions, maxScore, timeLimit } = body;

    if (!materialId || !studentId || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: "materialId, studentId, and questions array are required" },
        { status: 400 },
      );
    }

    // Validate questions format
    for (const q of questions) {
      if (!q.question || !q.options || q.correctIndex === undefined) {
        return NextResponse.json(
          { error: "Each question must have question, options, and correctIndex" },
          { status: 400 },
        );
      }
    }

    const computedMaxScore =
      maxScore ?? questions.reduce((sum: number, q: any) => {
        return sum + (q.score ?? 1);
      }, 0);

    const quiz = await prisma.quiz.create({
      data: {
        materialId,
        studentId,
        type: type ?? "QUIZ",
        questions: questions as any,
        maxScore: computedMaxScore,
        timeLimit: timeLimit ?? null,
      },
      include: {
        material: {
          select: { id: true, topic: true, subject: true },
        },
      },
    });

    return NextResponse.json({ ok: true, quiz }, { status: 201 });
  } catch (error) {
    console.error("[admin/quizzes] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create quiz" },
      { status: 500 },
    );
  }
}
