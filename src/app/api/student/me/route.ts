import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";

/**
 * GET /api/student/me
 * Returns the current student's info from the JWT session cookie.
 */
export async function GET() {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: session.studentId },
      select: {
        id: true,
        studentId: true,
        name: true,
        gradeLevel: true,
        persona: true,
        passwordHash: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: student.id,
      studentId: student.studentId,
      name: student.name,
      gradeLevel: student.gradeLevel,
      persona: student.persona,
      hasPassword: !!student.passwordHash,
    });
  } catch (error) {
    console.error("GET /api/student/me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
