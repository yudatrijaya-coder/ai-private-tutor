import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/quizzes/[id]
 * Update a quiz (question, options, correctIndex, difficulty, explanation)
 * Body: { questions?: Array<{question, options, correctIndex, difficulty?, explanation?}>, type?, maxScore?, timeLimit? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const allowedFields = ["type", "questions", "maxScore", "timeLimit"];

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const updated = await prisma.quiz.update({
      where: { id },
      data,
      include: {
        material: {
          select: { id: true, topic: true, subject: true },
        },
      },
    });

    return NextResponse.json({ ok: true, quiz: updated });
  } catch (error) {
    console.error("[admin/quizzes/[id]] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update quiz" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/quizzes/[id]
 * Delete a quiz
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Delete associated attempts first
    await prisma.attempt.deleteMany({ where: { quizId: id } });

    await prisma.quiz.delete({ where: { id } });

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (error) {
    console.error("[admin/quizzes/[id]] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete quiz" },
      { status: 500 },
    );
  }
}
