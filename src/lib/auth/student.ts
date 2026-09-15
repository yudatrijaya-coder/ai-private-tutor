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
import { readStudentSecret, requireStudentSecret } from "./student-secret";
import { evaluateStudentAccess } from "./access";

const COOKIE_NAME = "student_session";
const SESSION_DURATION = "7d"; // 7 days

/**
 * Resolve the JWT signing secret at call time and fail closed.
 *
 * See `./student-secret` for why there is no development fallback and why the
 * value must not be captured at module scope.
 */
function jwtSecret(): Uint8Array {
  return requireStudentSecret();
}

export interface StudentSession {
  studentId: string; // the DB uuid
  studentIdentifier: string; // the login ID e.g. "ANDI001"
  name: string;
  gradeLevel?: string;
  character?: string | null;
  status?: string;
  trialEndsAt?: string | null;
  subscriptionUntil?: string | null;
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
 * Returns null if no valid, still-entitled session exists.
 *
 * The entitlement check (trial expiry, status) runs HERE, not only in the
 * middleware, because the middleware never sees `/api/auth/*` (its matcher
 * excludes that prefix) and because API routes must not depend on a page-level
 * redirect having happened.
 */
export async function getStudentSession(): Promise<StudentSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const secret = readStudentSecret();
    if (!secret) return null;

    const { payload } = await jwtVerify(token, secret);
    const session = payload as unknown as StudentSession;

    const access = evaluateStudentAccess({
      status: session.status,
      trialEndsAt: session.trialEndsAt,
      subscriptionUntil: session.subscriptionUntil,
    });
    if (!access.allowed) return null;

    return session;
  } catch {
    return null;
  }
}

/**
 * Verify the cookie signature only, without the entitlement check.
 *
 * For the few places that must still recognise a student whose trial lapsed
 * (e.g. offering a renewal link instead of a hard logout). Never use this to
 * authorise data access.
 */
export async function getStudentSessionUnchecked(): Promise<StudentSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const secret = readStudentSecret();
    if (!secret) return null;

    const { payload } = await jwtVerify(token, secret);
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
