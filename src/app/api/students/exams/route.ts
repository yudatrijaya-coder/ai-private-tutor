import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/students/exams?studentId=xxx
 * Lists WEEKLY exams for a student, with attempt status per exam.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { studentId } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  // Exams available to this student: by grade level (WEEKLY exams are generated per grade+subject)
  const exams = await prisma.exam.findMany({
    where: { type: "WEEKLY", gradeLevel: student.gradeLevel, isActive: true },
    include: {
      _count: { select: { questions: true } },
      attempts: {
        where: { studentId: student.id },
        select: { id: true, score: true, maxScore: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const list = exams.map((e) => ({
    id: e.id,
    title: e.title,
    subject: e.subject,
    gradeLevel: e.gradeLevel,
    questionCount: e._count.questions,
    maxScore: e.maxScore,
    createdAt: e.createdAt,
    attempt: e.attempts[0] ?? null,
  }));

  return NextResponse.json({ exams: list });
}
