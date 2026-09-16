import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";
import {
  signGuardianToken,
  GUARDIAN_LINK_DAYS,
} from "@/lib/auth/guardian-link";

/**
 * GET /api/student/guardian-link
 *
 * Mints the signed, read-only "pantau anak" link for the *currently logged in*
 * student. The student id comes from the session cookie only — it is never read
 * from the query string, so a logged-in student cannot mint a link for someone
 * else's child.
 *
 * The returned token is idempotent in effect but not in value: each call mints
 * a fresh token with a fresh expiry. Old tokens keep working until they expire,
 * which is intentional — a link already sent to a grandparent must not break
 * when the child re-opens the page.
 */
export async function GET(request: Request) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const student = await prisma.student.findUnique({
      where: { id: session.studentId },
      select: { id: true, name: true, studentId: true, gradeLevel: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const { token, expiresAt } = await signGuardianToken(student.id);

    // Prefer the configured public origin so links work behind the proxy and
    // when the request arrives on an internal hostname.
    const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
    const origin = configured || new URL(request.url).origin;
    const url = `${origin}/pantau/${token}`;

    return NextResponse.json({
      url,
      token,
      expiresAt: expiresAt.toISOString(),
      validDays: GUARDIAN_LINK_DAYS,
      student: {
        name: student.name,
        studentId: student.studentId,
        gradeLevel: student.gradeLevel,
      },
    });
  } catch (error) {
    console.error("GET /api/student/guardian-link error:", error);
    return NextResponse.json(
      { error: "Gagal membuat link pantau" },
      { status: 500 },
    );
  }
}
