import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/exam — Generate composite exam from multiple topics
 * Body: { studentId, subject, topicIds, questionCount }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, subject, topics, questionCount = 20 } = body;

    if (!studentId || !subject || !topics || !Array.isArray(topics)) {
      return NextResponse.json({ error: "Missing required: studentId, subject, topics[]" }, { status: 400 });
    }

    // Get student
    const student = await prisma.student.findUnique({ where: { studentId } });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Get curriculum + materials
    const curriculum = await prisma.curriculum.findFirst({
      where: { studentId: student.id },
      include: {
        materials: {
          where: { subject },
          include: { quizzes: true },
          orderBy: { weekOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!curriculum) return NextResponse.json({ error: "No curriculum" }, { status: 404 });

    // Collect questions from selected topics
    const allQuestions: any[] = [];
    const usedTopics = new Set<string>();

    for (const material of curriculum.materials) {
      // If topics array is empty, use all materials
      if (topics.length === 0 || topics.includes(material.topic)) {
        usedTopics.add(material.topic);
        for (const quiz of material.quizzes) {
          const qs = (quiz.questions as any[]) || [];
          allQuestions.push(...qs.map((q: any) => ({
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            difficulty: q.difficulty || "medium",
            explanation: q.explanation,
          })));
        }
      }
    }

    if (allQuestions.length === 0) {
      return NextResponse.json({ error: "No questions found for selected topics" }, { status: 404 });
    }

    // Balance difficulty: 40% easy, 40% medium, 20% hard
    const byDifficulty = (d: string) => allQuestions.filter((q: any) => q.difficulty === d);
    const easy = byDifficulty("easy");
    const medium = byDifficulty("medium");
    const hard = byDifficulty("hard");

    const shuffle = (arr: any[]) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const selected = [
      ...shuffle(easy).slice(0, Math.min(Math.round(questionCount * 0.4), easy.length)),
      ...shuffle(medium).slice(0, Math.min(Math.round(questionCount * 0.4), medium.length)),
      ...shuffle(hard).slice(0, Math.min(questionCount - Math.round(questionCount * 0.4) - Math.round(questionCount * 0.4), hard.length)),
    ];

    const finalQuestions = shuffle(selected);

    // Create Exam record in DB
    const exam = await prisma.quiz.create({
      data: {
        materialId: curriculum.materials[0]?.id || "",
        studentId: student.id,
        type: "EXAM" as const,
        questions: JSON.parse(JSON.stringify(finalQuestions)),
        maxScore: finalQuestions.length * 10,
        timeLimit: finalQuestions.length * 60, // 1 min per question
      },
    });

    return NextResponse.json({
      exam: {
        id: exam.id,
        type: "EXAM",
        maxScore: exam.maxScore,
        timeLimit: exam.timeLimit,
        questions: finalQuestions.map((q, i) => ({
          no: i + 1,
          ...q,
        })),
        questionCount: finalQuestions.length,
        difficulty: {
          easy: finalQuestions.filter((q: any) => q.difficulty === "easy").length,
          medium: finalQuestions.filter((q: any) => q.difficulty === "medium").length,
          hard: finalQuestions.filter((q: any) => q.difficulty === "hard").length,
        },
        topics: Array.from(usedTopics),
        subject,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
