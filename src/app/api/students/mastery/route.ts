import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";

/**
 * GET /api/students/mastery?studentId=XXX
 *
 * Returns aggregated achievement data for a student.
 * Supports both query-param (public studentId) and JWT-cookie auth.
 * If no studentId param, falls back to the logged-in student's id.
 */
export async function GET(req: NextRequest) {
  let studentId = req.nextUrl.searchParams.get("studentId");

  if (!studentId) {
    // Try JWT session
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }
    studentId = session.studentIdentifier;
  }

  if (!studentId) {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }

  try {
    const student = await prisma.student.findUnique({ where: { studentId } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get mastery records
    const masteryRecords = await prisma.studentSubjectMastery.findMany({
      where: { studentId: student.id },
      orderBy: { mastery: "desc" },
    });

    // Get recent activity
    const recentActivity = await prisma.studentActivity.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        type: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Compute overall mastery
    let overallScore = 0;
    let overallMax = 0;
    let totalQuizzes = 0;
    let totalExams = 0;
    let totalSlides = 0;
    let totalMindmaps = 0;
    let totalVideos = 0;

    for (const r of masteryRecords) {
      totalQuizzes += r.quizCount;
      totalExams += r.examCount;
      totalSlides += r.slidesRead;
      totalMindmaps += r.mindmapsOpen;
      totalVideos += r.videosWatched;

      // Weighted: quiz+exam score / max
      const subjectScore = r.quizTotalScore + r.examTotalScore;
      const subjectMax = r.quizTotalMax + r.examTotalMax;
      overallScore += subjectScore;
      overallMax += subjectMax;
    }

    const overallMastery = overallMax > 0 ? overallScore / overallMax : 0;

    // Format subjects
    const subjects = masteryRecords.map((r) => ({
      subject: r.subject,
      quizCount: r.quizCount,
      quizTotalScore: r.quizTotalScore,
      quizTotalMax: r.quizTotalMax,
      quizBestScore: r.quizBestScore,
      quizBestMax: r.quizBestMax,
      examCount: r.examCount,
      examTotalScore: r.examTotalScore,
      examTotalMax: r.examTotalMax,
      examBestScore: r.examBestScore,
      examBestMax: r.examBestMax,
      slidesRead: r.slidesRead,
      mindmapsOpen: r.mindmapsOpen,
      videosWatched: r.videosWatched,
      mastery: r.mastery,
      lastActiveAt: r.lastActiveAt.toISOString(),
    }));

    // Format activities
    const formattedActivity = recentActivity.map((a) => {
      const meta = a.metadata as any || {};
      return {
        type: a.type,
        subject: meta.subject || "",
        topic: meta.topic || undefined,
        createdAt: a.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      subjects,
      overallMastery,
      totalQuizzes,
      totalExams,
      totalSlides,
      totalMindmaps,
      totalVideos,
      recentActivity: formattedActivity,
    });
  } catch (error) {
    console.error("Error fetching mastery:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
