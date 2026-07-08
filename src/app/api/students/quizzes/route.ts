import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/students/quizzes?studentId=xxx
 * Lists all quizzes/exams for a student's curriculum materials
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { studentId } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const curricula = await prisma.curriculum.findMany({
    where: { studentId: student.id },
    include: {
      materials: {
        include: {
          quizzes: true,
          _count: { select: { quizzes: true } },
        },
        orderBy: { weekOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  const quizzes = (curricula[0]?.materials || []).flatMap((m) =>
    (m.quizzes || []).map((q) => ({
      id: q.id,
      materialId: m.id,
      type: q.type,
      maxScore: q.maxScore,
      questions: (q.questions as any[])?.length || 0,
      createdAt: q.createdAt,
      material: {
        subject: m.subject,
        topic: m.topic,
        subTopic: m.subTopic,
      },
    }))
  );

  return NextResponse.json({ quizzes });
}
