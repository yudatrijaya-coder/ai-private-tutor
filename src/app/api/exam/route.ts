import { NextRequest, NextResponse } from "next/server";
import { generatePreTest, generatePostTest } from "../../../services/exam-generator";

/**
 * POST /api/exam — Generate PRE_TEST or POST_TEST
 * Body: { studentId, subject, type, materialId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, subject, type, materialId } = body;

    if (!studentId || !type) {
      return NextResponse.json(
        { error: "Missing required: studentId, type" },
        { status: 400 }
      );
    }

    let exam;

    if (type === "PRE_TEST") {
      if (!subject) {
        return NextResponse.json(
          { error: "Missing required for PRE_TEST: subject" },
          { status: 400 }
        );
      }
      exam = await generatePreTest(studentId, subject);
    } else if (type === "POST_TEST") {
      if (!materialId) {
        return NextResponse.json(
          { error: "Missing required for POST_TEST: materialId" },
          { status: 400 }
        );
      }
      exam = await generatePostTest(studentId, materialId);
    } else {
      return NextResponse.json(
        { error: "Invalid type. Must be PRE_TEST or POST_TEST" },
        { status: 400 }
      );
    }

    return NextResponse.json(exam);
  } catch (err) {
    console.error("Error generating exam:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
