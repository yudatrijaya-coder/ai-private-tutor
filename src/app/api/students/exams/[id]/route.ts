import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/students/exams/[id]?studentId=xxx
 * Returns WEEKLY exam detail with questions (no answer key exposed to student).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { studentId } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { questions: { orderBy: { createdAt: "asc" } } },
  });

  if (!exam || exam.type !== "WEEKLY") {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  // Existing completed attempt for this student
  const attempt = await prisma.examAttempt.findFirst({
    where: { studentId: student.id, examId: exam.id, status: { in: ["COMPLETED", "ANALYZED"] } },
    orderBy: { createdAt: "desc" },
  });

  // Server-side per-question review for completed attempts (safe to expose:
  // the student already submitted; answer key only leaks after completion).
  const storedAttempt = attempt ? (attempt.details as any) || {} : null;
  let attemptDetails: unknown = null;
  if (attempt) {
    const stored = storedAttempt || {};
    const storedAnswers: Record<string, string> = stored.answers || {};
    attemptDetails = exam.questions.map((q, idx) => {
      const userLetter = storedAnswers[idx] ?? "";
      const correct = userLetter.toUpperCase() === (q.correctAnswer ?? "").toUpperCase();
      return {
        questionIndex: idx,
        correct,
        userAnswer: userLetter,
        correctAnswer: q.correctAnswer,
        correctIndex: Math.max(0, "ABCDEF".indexOf((q.correctAnswer ?? "").toUpperCase())),
        explanation: q.explanation ?? "",
      };
    });
  }

  return NextResponse.json({
    exam: {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      gradeLevel: exam.gradeLevel,
      maxScore: exam.maxScore,
      questionCount: exam.questions.length,
      questions: exam.questions.map((q) => ({
        id: q.id,
        topic: q.topic,
        subTopic: q.subTopic,
        question: q.question,
        options: q.options,
        difficulty: q.difficulty,
      })),
      attempt: attempt
        ? {
            id: attempt.id,
            score: attempt.score,
            maxScore: attempt.maxScore,
            status: attempt.status,
            createdAt: attempt.createdAt,
            // Per-question detail (correctIndex + explanation) so the
            // "Lihat Pembahasan" view works for previous attempts too.
            details: attemptDetails,
            masteryDeltas: storedAttempt?.masteryDeltas ?? null,
            attemptNumber: attempt.attemptNumber ?? 1,
          }
        : null,
    },
  });
}
