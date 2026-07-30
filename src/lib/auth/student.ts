/**
 * Student auth helpers — JWT-based sessions for student users.
 *
 * Students log in with their student ID (no password in dev mode),
 * then get a signed JWT cookie that the middleware reads.
 *
 * In Phase 4+, this can be upgraded to Telegram OTP.
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "student_session";
const SESSION_DURATION = "7d"; // 7 days

/**
 * Resolve the JWT signing secret at call time.
 *
 * Read inside a function, not at module scope: `next build` evaluates modules
 * before PM2 injects the runtime environment, so a module-level constant would
 * capture `undefined` permanently in production.
 *
 * Fails closed — there is deliberately no development fallback, because the old
 * default string is public in git history and would let anyone forge a session.
 */
function jwtSecret(): Uint8Array {
  const s = process.env.STUDENT_JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "STUDENT_JWT_SECRET is not configured (must be >= 16 chars) — student sessions disabled",
    );
  }
  return new TextEncoder().encode(s);
}

export interface StudentSession {
  studentId: string; // the DB uuid
  studentIdentifier: string; // the login ID e.g. "ANDI001"
  name: string;
  gradeLevel?: string;
  character?: string | null;
}

/**
 * Create a signed JWT for a student session and set it as a cookie.
 */
export async function createStudentSession(
  payload: StudentSession,
): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(jwtSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return token;
}

/**
 * Read and verify the student session from the request cookies.
 * Returns null if no valid session exists.
 */
export async function getStudentSession(): Promise<StudentSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, jwtSecret());
    return payload as unknown as StudentSession;
  } catch {
    return null;
  }
}

/**
 * Destroy the student session by clearing the cookie.
 */
export async function destroyStudentSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
