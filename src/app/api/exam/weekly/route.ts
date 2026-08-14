import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyExam } from "@/services/weekly-exam-generator";

/**
 * POST /api/exam/weekly — Generate a WEEKLY exam
 * Body: { studentId, subject, weekNumber?, questionCount? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, subject, weekNumber, questionCount } = body;

    if (!studentId || !subject) {
      return NextResponse.json(
        { error: "Missing required: studentId, subject" },
        { status: 400 },
      );
    }

    const result = await generateWeeklyExam({
      studentId,
      subject,
      weekNumber: weekNumber ? Number(weekNumber) : undefined,
      questionCount: questionCount ? Number(questionCount) : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error generating weekly exam:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
