import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth/student";
import { getStudentMasteryMap } from "@/services/topic-mastery";

/**
 * GET /api/students/mastery
 * Returns per-topic mastery data for the authenticated student.
 */
export async function GET() {
  try {
    const session = await getStudentSession();
    if (!session) {
      console.error("[Mastery] No session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getStudentMasteryMap(session.studentId);
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[Mastery API] Error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
