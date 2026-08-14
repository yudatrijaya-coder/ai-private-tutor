import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QUEUES } from "@/queue/definitions";
import { getQueue } from "@/queue/runner";
import { updateTopicMastery } from "@/services/topic-mastery";

/**
 * POST /api/exam/attempt
 * Body: { studentId, examId, answers: Record<questionIndex, selectedOption> }
 * 
 * Calculates real score, saves attempt, triggers AI analysis,
 * and updates per-topic mastery.
 */
export async function POST(request: NextRequest) {
  try {
    const { studentId, examId, answers } = await request.json();

    if (!studentId || !examId || !answers) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Resolve student by login identifier → internal UUID
    const student = await prisma.student.findUnique({
      where: { studentId },
      select: { id: true, name: true, gradeLevel: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 1. Fetch exam with questions to calculate score
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // 2. Calculate score: compare student's answers to correct answers
    let correctCount = 0;
    const topicScores: Record<string, { correct: number; total: number }> = {};
    const details: {
      questionIndex: number;
      correct: boolean;
      correctIndex: number;
      userAnswer: string;
      correctAnswer: string;
      explanation: string;
    }[] = [];

    exam.questions.forEach((q, idx) => {
      const studentAnswer = answers[idx];
      const isCorrect = studentAnswer?.toUpperCase() === q.correctAnswer?.toUpperCase();
      if (isCorrect) correctCount++;

      details.push({
        questionIndex: idx,
        correct: isCorrect,
        correctIndex: Math.max(
          0,
          "ABCDEF".indexOf((q.correctAnswer ?? "").toUpperCase()),
        ),
        userAnswer: studentAnswer ?? "",
        correctAnswer: q.correctAnswer ?? "",
        explanation: q.explanation ?? "",
      });

      // Aggregate per topic
      const topic = q.topic || exam.subject;
      if (!topicScores[topic]) topicScores[topic] = { correct: 0, total: 0 };
      topicScores[topic].total++;
      if (isCorrect) topicScores[topic].correct++;
    });

    const score = Math.round((correctCount / exam.questions.length) * 100);
    const maxScore = 100;

    // 3. Save the attempt with calculated score
    const prevAttempts = await prisma.examAttempt.count({
      where: { studentId: student.id, examId },
    });
    const attemptNumber = prevAttempts + 1;

    const attempt = await prisma.examAttempt.create({
      data: {
        studentId: student.id,
        examId,
        score,
        maxScore,
        attemptNumber,
        details: {
          answers,
          score,
          correctCount,
          totalQuestions: exam.questions.length,
          details, // per-question: correctIndex + explanation
        },
        status: "COMPLETED",
      },
    });

    // 4. Update per-topic mastery
    for (const [topic, data] of Object.entries(topicScores)) {
      await updateTopicMastery({
        studentId: student.id,
        subject: exam.subject,
        topic,
        subTopic: null,
        score: data.correct,
        maxScore: data.total,
        attemptType: "exam",
      });
    }

    // 5. Asynchronously trigger AI analysis via queue
    const queue = await getQueue(QUEUES.IMPROVEMENT_ANALYSIS.name);
    await queue.add("analyze-exam", { attemptId: attempt.id });

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      attemptNumber,
      score,
      totalQuestions: exam.questions.length,
      correctCount,
      details,
    });
  } catch (err) {
    console.error("Error saving exam attempt:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
