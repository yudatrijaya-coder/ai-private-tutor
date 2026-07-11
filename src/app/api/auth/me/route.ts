import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const STUDENT_JWT_SECRET = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET ?? "student-dev-secret-change-in-production",
);
const COOKIE_NAME = "student_session";

/**
 * GET /api/auth/me — Returns current student info from JWT cookie.
 */
export async function GET() {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, STUDENT_JWT_SECRET);
    return NextResponse.json({
      student: {
        studentId: (payload as any).studentIdentifier,
        name: (payload as any).name,
        gradeLevel: (payload as any).gradeLevel,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
}
