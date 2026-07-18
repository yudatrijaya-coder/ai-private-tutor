import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = [
  "slide_view",
  "mindmap_view",
  "video_click",
  "quiz_start",
  "quiz_complete",
  "exam_start",
  "exam_complete",
] as const;

type ActivityType = (typeof ALLOWED_TYPES)[number];

const ASSESSMENT_TYPES = new Set(["quiz_complete", "exam_complete"]);
const EXAM_TYPES = new Set(["exam_complete", "exam_start"]);

/**
 * GET /api/students/activity
 * Fetch activity state for a student — quiz attempts + slide views per material.
 * Used by student pages to show "already done" indicators.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId"); // e.g. "SYIFA001"

  if (!studentId) {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { studentId } });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const uid = student.id; // internal UUID

  // Quiz attempts per material — latest attempt per quiz
  const quizAttempts = await prisma.attempt.findMany({
    where: { studentId: uid },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      quizId: true,
      type: true,
      score: true,
      maxScore: true,
      createdAt: true,
      timeSpent: true,
      quiz: {
        select: { materialId: true },
      },
    },
  });

  // Group by materialId → best score
  const quizByMaterial = new Map<string, {
    attempts: number;
    bestScore: number;
    bestMax: number;
    lastScore: number;
    lastMax: number;
    lastAt: string;
    lastAttemptId: string;
  }>();

  for (const a of quizAttempts) {
    const mid = a.quiz?.materialId;
    if (!mid) continue;
    if (!quizByMaterial.has(mid)) {
      quizByMaterial.set(mid, {
        attempts: 0, bestScore: 0, bestMax: 0,
        lastScore: 0, lastMax: 0,
        lastAt: "", lastAttemptId: "",
      });
    }
    const entry = quizByMaterial.get(mid)!;
    entry.attempts++;
    if (a.score > entry.bestScore) {
      entry.bestScore = a.score;
      entry.bestMax = a.maxScore;
    }
    // Track last attempt (already sorted desc)
    if (!entry.lastAttemptId) {
      entry.lastScore = a.score;
      entry.lastMax = a.maxScore;
      entry.lastAt = a.createdAt.toISOString();
      entry.lastAttemptId = a.id;
    }
  }

  // Slide views per materialId
  const slideViews = await prisma.studentActivity.findMany({
    where: { studentId: uid, type: "slide_view" },
    orderBy: { createdAt: "desc" },
    select: { materialId: true, createdAt: true },
  });
  const readMaterials = new Set(slideViews.map((v) => v.materialId).filter(Boolean));

  // Mindmap views
  const mindmapViews = await prisma.studentActivity.findMany({
    where: { studentId: uid, type: "mindmap_view" },
    select: { materialId: true },
  });
  const viewedMindmaps = new Set(mindmapViews.map((v) => v.materialId).filter(Boolean));

  // Video clicks
  const videoClicks = await prisma.studentActivity.findMany({
    where: { studentId: uid, type: "video_click" },
    select: { materialId: true },
  });
  const watchedVideos = new Set(videoClicks.map((v) => v.materialId).filter(Boolean));

  return NextResponse.json({
    studentId: uid,
    byMaterial: Object.fromEntries(quizByMaterial),
    readMaterials: Array.from(readMaterials),
    viewedMindmaps: Array.from(viewedMindmaps),
    watchedVideos: Array.from(watchedVideos),
  });
}

/**
 * POST /api/students/activity
 * Log student activity and update subject mastery.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, materialId, type, metadata } = body;

    // Validate required fields
    if (!studentId || !type) {
      return NextResponse.json(
        { error: "studentId and type are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(type as ActivityType)) {
      return NextResponse.json(
        {
          error: `Invalid type '${type}'. Allowed: ${ALLOWED_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Find student by studentId (login identifier)
    const student = await prisma.student.findUnique({
      where: { studentId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Validate materialId if provided
    if (materialId) {
      const material = await prisma.material.findUnique({
        where: { id: materialId },
      });
      if (!material) {
        return NextResponse.json(
          { error: "Material not found" },
          { status: 404 }
        );
      }
    }

    // Extract quizId from body (optional — for assessment types)
    const quizId: string | undefined = body?.quizId;

    // Create activity log
    await prisma.studentActivity.create({
      data: {
        studentId: student.id,
        materialId: materialId || null,
        type,
        metadata: metadata || {},
      },
    });

    // If assessment type, also create Attempt record
    if (ASSESSMENT_TYPES.has(type) && quizId) {
      try {
        const score: number = metadata?.score ?? 0;
        const maxScore: number = metadata?.maxScore ?? 0;
        const answers = typeof metadata?.answers === 'object' && Array.isArray(metadata.answers) 
          ? metadata.answers 
          : [];
        
        await prisma.attempt.create({
          data: {
            quizId,
            studentId: student.id,
            type: EXAM_TYPES.has(type) ? "EXAM" : "QUIZ",
            answers: answers.length > 0 ? answers : [],
            score,
            maxScore,
            createdAt: new Date(),
          },
        });
      } catch (err) {
        console.error("[api/students/activity] Failed to create Attempt:", err);
      }
    }

    // Update StudentSubjectMastery using the subject from metadata
    const subject: string | undefined = metadata?.subject;
    if (subject) {
      const isExam = EXAM_TYPES.has(type);

      if (ASSESSMENT_TYPES.has(type)) {
        // quiz_complete or exam_complete
        const score: number = metadata?.score ?? 0;
        const maxScore: number = metadata?.maxScore ?? 0;

        await prisma.studentSubjectMastery.upsert({
          where: {
            studentId_subject: { studentId: student.id, subject },
          },
          create: {
            studentId: student.id,
            subject,
            quizCount: isExam ? 0 : 1,
            quizTotalScore: isExam ? 0 : score,
            quizTotalMax: isExam ? 0 : maxScore,
            quizBestScore: isExam ? 0 : score,
            quizBestMax: isExam ? 0 : maxScore,
            examCount: isExam ? 1 : 0,
            examTotalScore: isExam ? score : 0,
            examTotalMax: isExam ? maxScore : 0,
            examBestScore: isExam ? score : 0,
            examBestMax: isExam ? maxScore : 0,
            mastery: maxScore > 0 ? score / maxScore : 0,
            lastActiveAt: new Date(),
          },
          update: {
            lastActiveAt: new Date(),
            ...(isExam
              ? {
                  examCount: { increment: 1 },
                  examTotalScore: { increment: score },
                  examTotalMax: { increment: maxScore },
                  examBestScore:
                    score >
                    (await getExistingMasteryField(
                      student.id,
                      subject,
                      "examBestScore"
                    ))
                      ? score
                      : undefined,
                  examBestMax:
                    score >
                    (await getExistingMasteryField(
                      student.id,
                      subject,
                      "examBestScore"
                    ))
                      ? maxScore
                      : undefined,
                }
              : {
                  quizCount: { increment: 1 },
                  quizTotalScore: { increment: score },
                  quizTotalMax: { increment: maxScore },
                  quizBestScore:
                    score >
                    (await getExistingMasteryField(
                      student.id,
                      subject,
                      "quizBestScore"
                    ))
                      ? score
                      : undefined,
                  quizBestMax:
                    score >
                    (await getExistingMasteryField(
                      student.id,
                      subject,
                      "quizBestScore"
                    ))
                      ? maxScore
                      : undefined,
                }),
          },
        });

        // Recompute mastery after assessment
        await recomputeMastery(student.id, subject);
      } else {
        // Increment activity counters
        const incrementData: Record<string, number> = {};
        if (type === "slide_view") incrementData.slidesRead = 1;
        if (type === "mindmap_view") incrementData.mindmapsOpen = 1;
        if (type === "video_click") incrementData.videosWatched = 1;

        if (Object.keys(incrementData).length > 0) {
          await prisma.studentSubjectMastery.upsert({
            where: {
              studentId_subject: { studentId: student.id, subject },
            },
            create: {
              studentId: student.id,
              subject,
              ...(type === "slide_view" ? { slidesRead: 1 } : {}),
              ...(type === "mindmap_view" ? { mindmapsOpen: 1 } : {}),
              ...(type === "video_click" ? { videosWatched: 1 } : {}),
              lastActiveAt: new Date(),
            },
            update: {
              ...incrementData,
              lastActiveAt: new Date(),
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/students/activity] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** Fetch a single field value from StudentSubjectMastery */
async function getExistingMasteryField(
  studentId: string,
  subject: string,
  field: "quizBestScore" | "examBestScore"
): Promise<number> {
  try {
    const record = await prisma.studentSubjectMastery.findUnique({
      where: { studentId_subject: { studentId, subject } },
      select: { [field]: true },
    });
    return record?.[field] ?? 0;
  } catch {
    return 0;
  }
}

/** Recompute mastery = weighted average of quiz and exam performance */
async function recomputeMastery(studentId: string, subject: string) {
  try {
    const record = await prisma.studentSubjectMastery.findUnique({
      where: { studentId_subject: { studentId, subject } },
    });
    if (!record) return;

    // Quiz mastery: totalScore / max(1, totalMax)
    const quizMastery =
      record.quizTotalMax > 0
        ? record.quizTotalScore / record.quizTotalMax
        : 0;

    // Exam mastery: totalScore / max(1, totalMax)
    const examMastery =
      record.examTotalMax > 0
        ? record.examTotalScore / record.examTotalMax
        : 0;

    // Weighted: if both exist, weight exams slightly more (60/40)
    let mastery = 0;
    const hasQuiz = record.quizCount > 0;
    const hasExam = record.examCount > 0;

    if (hasQuiz && hasExam) {
      mastery = quizMastery * 0.4 + examMastery * 0.6;
    } else if (hasQuiz) {
      mastery = quizMastery;
    } else if (hasExam) {
      mastery = examMastery;
    }

    await prisma.studentSubjectMastery.update({
      where: { id: record.id },
      data: { mastery },
    });
  } catch (error) {
    console.error(
      `[api/students/activity] Error recomputing mastery for ${studentId}/${subject}:`,
      error
    );
  }
}
