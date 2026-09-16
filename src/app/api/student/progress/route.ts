import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth/student";
import { getStudentSnapshot } from "@/lib/student-snapshot";

/**
 * GET /api/student/progress
 *
 * The logged-in student's own snapshot, consumed by `StudentProgressPanel`.
 * The student id comes from the session cookie alone — never the query string —
 * so one student cannot read another's progress.
 *
 * Returns a trimmed payload: the parent-facing monitor page needs alerts and
 * badges, a student's own panel does not.
 */
export async function GET() {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const snapshot = await getStudentSnapshot(session.studentId, { days: 14 });
    if (!snapshot) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({
      student: {
        currentStreak: snapshot.student.currentStreak,
        longestStreak: snapshot.student.longestStreak,
        xp: snapshot.student.xp,
      },
      today: snapshot.today,
      week: snapshot.week,
      subjects: snapshot.subjects,
      weakTopics: snapshot.weakTopics,
      upcomingExams: snapshot.upcomingExams,
      studyDays: snapshot.studyDays,
    });
  } catch (error) {
    console.error("GET /api/student/progress error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
