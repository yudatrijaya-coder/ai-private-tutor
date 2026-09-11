import { NextRequest, NextResponse } from "next/server";
import { generatePreTest, generatePostTest } from "../../../services/exam-generator";
import { resolveScope, scopedStudentIdentifier } from "@/lib/auth/scope";

/**
 * POST /api/exam — Generate PRE_TEST or POST_TEST
 * Body: { studentId, subject, type, materialId }
 *
 * Reachable by BOTH audiences: the student quiz page generates its own exam in
 * "exam mode", and the admin dashboard generates pre/post tests. A student is
 * pinned to their own record — `studentId` from the body is only honoured for
 * an admin caller.
 */
export async function POST(request: NextRequest) {
  const scope = await resolveScope();
  if (!scope) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { subject, type, materialId } = body;
    const studentId = scopedStudentIdentifier(scope, body.studentId ?? null);

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
