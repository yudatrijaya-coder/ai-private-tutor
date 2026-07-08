import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getQuiz as getQuizSD5 } from "@/data/quiz-bank-sd5";
import { getQuiz as getQuizSMP7 } from "@/data/quiz-bank-smp7";
import { getQuiz as getQuizSMA11 } from "@/data/quiz-bank-sma11";

const QUIZ_BANKS: Record<string, any> = {
  SD_5: getQuizSD5,
  SMP_1: getQuizSMP7,
  SMA_2: getQuizSMA11,
};

/**
 * POST /api/exam/template — Auto-generate exams grouped by weekly timeline
 * Body: { studentId, periodWeeks?: number } — default 4 weeks per exam
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, periodWeeks = 4 } = body;
    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

    const student = await prisma.student.findUnique({ where: { studentId } });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const getQuiz = QUIZ_BANKS[student.gradeLevel as string];
    const curriculum = await prisma.curriculum.findFirst({
      where: { studentId: student.id },
      include: {
        materials: {
          orderBy: { weekOrder: "asc" },
          include: { quizzes: { where: { type: "QUIZ" } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!curriculum) return NextResponse.json({ error: "No curriculum" }, { status: 404 });

    // Group materials by period
    const maxWeek = Math.max(...curriculum.materials.map(m => m.weekOrder));
    const periods: { period: number; startWeek: number; endWeek: number; materials: typeof curriculum.materials }[] = [];

    for (let start = 1; start <= maxWeek; start += periodWeeks) {
      const end = Math.min(start + periodWeeks - 1, maxWeek);
      const periodMaterials = curriculum.materials.filter(
        m => m.weekOrder >= start && m.weekOrder <= end
      );
      if (periodMaterials.length > 0) {
        periods.push({
          period: periods.length + 1,
          startWeek: start,
          endWeek: end,
          materials: periodMaterials,
        });
      }
    }

    // Generate one exam per period, per subject
    const results: any[] = [];

    for (const period of periods) {
      // Group period materials by subject
      const subjectGroups: Record<string, typeof period.materials> = {};
      for (const m of period.materials) {
        if (!subjectGroups[m.subject]) subjectGroups[m.subject] = [];
        subjectGroups[m.subject].push(m);
      }

      for (const [subject, mats] of Object.entries(subjectGroups)) {
        const allQuestions: any[] = [];

        for (const mat of mats) {
          // Try getting questions from quiz bank
          let qs = getQuiz?.(subject, mat.topic, mat.subTopic);
          if (qs && qs.length > 0) {
            allQuestions.push(...qs);
          } else {
            // Fallback: use existing quiz from DB
            for (const quiz of mat.quizzes) {
              const qData = (quiz.questions as any[]) || [];
              allQuestions.push(...qData);
            }
          }
        }

        if (allQuestions.length === 0) continue;

        // Balance difficulty
        const byDiff = (d: string) => allQuestions.filter((q: any) => q.difficulty === d);
        const shuffle = (arr: any[]) => {
          const a = [...arr];
          for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
          }
          return a;
        };

        const easy = byDiff("easy");
        const medium = byDiff("medium");
        const hard = byDiff("hard");
        const total = Math.min(allQuestions.length, 20);

        const selected = [
          ...shuffle(easy).slice(0, Math.min(Math.round(total * 0.4), easy.length)),
          ...shuffle(medium).slice(0, Math.min(Math.round(total * 0.4), medium.length)),
          ...shuffle(hard).slice(0, Math.min(total - Math.round(total * 0.4) - Math.round(total * 0.4), hard.length)),
        ];

        const finalQuestions = shuffle(selected);

        // Create exam in DB
        const exam = await prisma.quiz.create({
          data: {
            materialId: mats[0]?.id || curriculum.materials[0]?.id || "",
            studentId: student.id,
            type: "EXAM",
            questions: JSON.parse(JSON.stringify(finalQuestions)),
            maxScore: finalQuestions.length * 10,
            timeLimit: finalQuestions.length * 60,
          },
        });

        results.push({
          examId: exam.id,
          title: `Ujian ${subject} — Minggu ${period.startWeek}-${period.endWeek}`,
          period: period.period,
          weekRange: `${period.startWeek}-${period.endWeek}`,
          subject,
          questionCount: finalQuestions.length,
          difficulty: {
            easy: finalQuestions.filter(q => q.difficulty === "easy").length,
            medium: finalQuestions.filter(q => q.difficulty === "medium").length,
            hard: finalQuestions.filter(q => q.difficulty === "hard").length,
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      student: student.studentId,
      gradeLevel: student.gradeLevel,
      totalExams: results.length,
      periodWeeks,
      exams: results,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/**
 * GET /api/exam/template — Get exam template overview
 * Shows the timeline of exam periods for a student
 */
export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const student = await prisma.student.findUnique({ where: { studentId } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const curriculum = await prisma.curriculum.findFirst({
    where: { studentId: student.id },
    include: {
      materials: {
        orderBy: { weekOrder: "asc" },
        select: { weekOrder: true, subject: true, topic: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!curriculum) return NextResponse.json({ error: "No curriculum" }, { status: 404 });

  // Build timeline
  const maxWeek = Math.max(...curriculum.materials.map(m => m.weekOrder));
  const timeline: any[] = [];
  const periodWeeks = 4;

  for (let start = 1; start <= maxWeek; start += periodWeeks) {
    const end = Math.min(start + periodWeeks - 1, maxWeek);
    const periodMats = curriculum.materials.filter(
      m => m.weekOrder >= start && m.weekOrder <= end
    );
    const subjects = [...new Set(periodMats.map(m => m.subject))];

    timeline.push({
      period: timeline.length + 1,
      weekRange: `${start}-${end}`,
      weeks: end - start + 1,
      totalMaterials: periodMats.length,
      subjects,
    });
  }

  return NextResponse.json({
    student: student.studentId,
    gradeLevel: student.gradeLevel,
    totalMaterials: curriculum.materials.length,
    totalWeeks: maxWeek,
    periods: timeline,
  });
}
