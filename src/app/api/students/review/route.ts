import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";
import { gradeReviewItem } from "@/lib/spaced-repetition";

/**
 * GET /api/students/review
 *
 * Returns the student's due review items, each with the question payload
 * pulled from the parent Quiz so the client can render a review session
 * without a second round-trip.
 *
 * Auth: student JWT cookie — a student only ever sees their own queue.
 */
export async function GET() {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dueRows, upcomingCount, masteredCount] = await Promise.all([
    prisma.reviewQueue.findMany({
      where: {
        studentId: session.studentId,
        mastered: false,
        dueAt: { lte: new Date() },
      },
      orderBy: { dueAt: "asc" },
      take: 20,
      include: {
        quiz: {
          select: {
            id: true,
            questions: true,
            material: { select: { topic: true, subject: true } },
          },
        },
      },
    }),
    prisma.reviewQueue.count({
      where: {
        studentId: session.studentId,
        mastered: false,
        dueAt: { gt: new Date() },
      },
    }),
    prisma.reviewQueue.count({
      where: { studentId: session.studentId, mastered: true },
    }),
  ]);

  const items = dueRows.map((row) => {
    const questions = (row.quiz?.questions ?? []) as Array<{
      question?: string;
      options?: string[];
      correctIndex?: number;
      correctAnswer?: string;
      explanation?: string;
    }>;
    const q = questions[row.questionIdx];

    return {
      id: row.id,
      quizId: row.quizId,
      questionIdx: row.questionIdx,
      subject: row.subject || row.quiz?.material?.subject || "",
      topic: row.topic || row.quiz?.material?.topic || "",
      lapses: row.lapses,
      repetitions: row.repetitions,
      intervalDays: row.intervalDays,
      dueAt: row.dueAt,
      question: q?.question ?? "(soal tidak ditemukan)",
      options: q?.options ?? [],
      correctIndex: q?.correctIndex ?? null,
      correctAnswer: q?.correctAnswer ?? null,
      explanation: q?.explanation ?? null,
    };
  });

  return NextResponse.json({
    dueCount: items.length,
    upcomingCount,
    masteredCount,
    items,
  });
}

/**
 * POST /api/students/review
 *
 * Body: { reviewId: string, correct: boolean, selfRating?: 0..5 }
 *
 * Grades one review item through SM-2. `correct` maps to a default quality of
 * 4 (correct, some hesitation) or 1 (wrong but recognised); `selfRating`
 * overrides that when the client collects a finer-grained signal.
 */
export async function POST(req: NextRequest) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { reviewId?: string; correct?: boolean; selfRating?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { reviewId, correct, selfRating } = body;
  if (!reviewId || typeof correct !== "boolean") {
    return NextResponse.json(
      { error: "reviewId and correct (boolean) required" },
      { status: 400 },
    );
  }

  // Ownership check — never grade another student's queue item.
  const item = await prisma.reviewQueue.findUnique({
    where: { id: reviewId },
    select: { id: true, studentId: true },
  });
  if (!item || item.studentId !== session.studentId) {
    return NextResponse.json({ error: "Review item not found" }, { status: 404 });
  }

  const quality =
    typeof selfRating === "number"
      ? Math.max(0, Math.min(5, Math.round(selfRating)))
      : correct
        ? 4
        : 1;

  const result = await gradeReviewItem(reviewId, quality);

  const remaining = await prisma.reviewQueue.count({
    where: {
      studentId: session.studentId,
      mastered: false,
      dueAt: { lte: new Date() },
    },
  });

  return NextResponse.json({ ok: true, quality, ...result, remaining });
}
