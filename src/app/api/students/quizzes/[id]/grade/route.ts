import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";
import { gradeAttempt } from "@/agents/assessment/grader";
import type { QuestionData } from "@/agents/assessment/types";

interface IncomingAnswer {
  questionIndex: number;
  selectedIndex: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/students/quizzes/[id]/grade
 *
 * Server-side grading. The answer key never needs to be trusted on the client.
 *
 * Body: { answers: [{ questionIndex, selectedIndex }], commit?: boolean, timeSpent?: number }
 *
 *  - commit: false (default) → grade only, nothing persisted. Used for the
 *    immediate per-question ✅/❌ + explanation feedback while the quiz runs.
 *  - commit: true → calls gradeAttempt(), which persists the Attempt,
 *    recency-weighted masteryAfter, and the ProgressSnap row.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext,
) {
  const { id } = await params;

  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  let body: { answers?: IncomingAnswer[]; commit?: boolean; timeSpent?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const rawAnswers = Array.isArray(body.answers) ? body.answers : null;
  if (!rawAnswers) {
    return NextResponse.json({ error: "answers[] wajib diisi" }, { status: 400 });
  }

  // Normalise + drop unanswered entries
  const answers: IncomingAnswer[] = rawAnswers
    .filter(
      (a) =>
        a &&
        Number.isInteger(a.questionIndex) &&
        Number.isInteger(a.selectedIndex) &&
        a.selectedIndex >= 0,
    )
    .map((a) => ({
      questionIndex: a.questionIndex,
      selectedIndex: a.selectedIndex,
    }));

  try {
    if (body.commit) {
      const result = await gradeAttempt({
        quizId: id,
        studentId: session.studentId,
        answers,
        timeSpent: body.timeSpent,
      });

      return NextResponse.json({
        committed: true,
        attemptId: result.attemptId,
        score: result.score,
        maxScore: result.maxScore,
        masteryAfter: result.masteryAfter,
        correctCount: result.correctCount,
        incorrectCount: result.incorrectCount,
        details: result.details.map((d) => ({
          questionIndex: d.questionIndex,
          correct: d.correct,
          correctIndex: d.correctIndex,
          explanation: d.explanation,
        })),
      });
    }

    // Preview grade — no DB writes
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: { questions: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz tidak ditemukan" }, { status: 404 });
    }

    const questions = (quiz.questions as unknown as QuestionData[]) ?? [];
    const details = [];
    let correctCount = 0;

    for (const a of answers) {
      const q = questions[a.questionIndex];
      if (!q) continue;
      const correct = a.selectedIndex === q.correctIndex;
      if (correct) correctCount++;
      details.push({
        questionIndex: a.questionIndex,
        correct,
        correctIndex: q.correctIndex,
        explanation: q.explanation ?? "",
      });
    }

    return NextResponse.json({
      committed: false,
      score: correctCount,
      maxScore: questions.length,
      correctCount,
      incorrectCount: details.length - correctCount,
      details,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menilai quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
