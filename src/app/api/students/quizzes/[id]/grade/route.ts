import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";
import { gradeAttempt } from "@/agents/assessment/grader";
import { sendQuizFeedback } from "@/services/quiz-feedback";
import { claimOnce, releaseClaim } from "@/lib/cron/idempotency";
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
 * Body: { answers: [{ questionIndex, selectedIndex }], commit?: boolean, timeSpent?: number, submissionId?: string }
 *
 *  - commit: false (default) → grade only, nothing persisted. Used for the
 *    immediate per-question ✅/❌ + explanation feedback while the quiz runs.
 *  - commit: true → calls gradeAttempt(), which persists the Attempt,
 *    recency-weighted masteryAfter, and the ProgressSnap row.
 *  - submissionId (optional, with commit) → idempotency key. The client
 *    generates one uuid per quiz session; a retried/double-submitted request
 *    with the same id returns the already-persisted attempt instead of
 *    grading twice (double score, double ProgressSnap, double feedback).
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

  let body: { answers?: IncomingAnswer[]; commit?: boolean; timeSpent?: number; submissionId?: string };
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
      // Idempotency: one grade per submissionId. The claim is taken BEFORE
      // grading so two concurrent retries cannot both pass the check; the
      // losing request then finds the winner's attempt by the claim's
      // metadata and returns it verbatim. A grading failure releases the
      // claim so the client's retry can go through.
      const submissionId =
        typeof body.submissionId === "string" && body.submissionId.length >= 8
          ? body.submissionId.slice(0, 100)
          : null;

      let claimKey: string | null = null;
      if (submissionId) {
        claimKey = `quiz-submit:${session.studentId}:${submissionId}`;
        const won = await claimOnce(claimKey, { quizId: id });
        if (!won) {
          const existing = await prisma.attempt.findFirst({
            where: { quizId: id, studentId: session.studentId, createdAt: { gte: new Date(Date.now() - 3600_000) } },
            orderBy: { createdAt: "desc" },
          });
          if (existing) {
            return NextResponse.json({
              committed: true,
              attemptId: existing.id,
              duplicate: true,
              score: existing.score,
              maxScore: existing.maxScore,
              masteryAfter: existing.masteryAfter,
            });
          }
          // Claim exists but no attempt within the last hour — the earlier
          // request likely crashed mid-grade. Release and re-grade.
          await releaseClaim(claimKey);
        }
      }

      try {
        const result = await gradeAttempt({
          quizId: id,
          studentId: session.studentId,
          answers,
          timeSpent: body.timeSpent,
        });

        // Post-quiz feedback to the student's Telegram, fire-and-forget: the
        // submission must not wait on, or fail because of, a Telegram call.
        // sendQuizFeedback never throws and is idempotent per attempt id.
        void sendQuizFeedback(result.attemptId);

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
      } catch (err) {
        // Do not let a failed grade consume the claim — the retry must be able
        // to go through.
        if (claimKey) await releaseClaim(claimKey);
        throw err;
      }
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
