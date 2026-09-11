/**
 * Caller scope for the `/api/students/*` family.
 *
 * These routes serve two audiences — the student app (a `student_session` JWT)
 * and the admin dashboard (a NextAuth session) — so they cannot simply require
 * one credential type. `src/middleware.ts` already rejects requests with
 * neither; this module is the in-handler companion that additionally answers
 * "WHICH student may this request touch?".
 *
 * The bug this closes: routes used to trust the `studentId` query param / body
 * field outright, so any logged-in student could read another student's data by
 * editing the URL. See docs/designs/2026-09-11-bug-hunt-findings.md §A (IDOR).
 */
import { getStudentSession, type StudentSession } from "@/lib/auth/student";
import { auth } from "@/lib/auth/edge";

export type Scope =
  | { kind: "student"; session: StudentSession }
  | { kind: "admin" };

/**
 * Resolve who is calling. Returns null when there is no usable credential.
 * Student is checked first: a student token can never be mistaken for an admin.
 */
export async function resolveScope(): Promise<Scope | null> {
  const session = await getStudentSession();
  if (session?.studentId) return { kind: "student", session };

  try {
    const admin = await auth();
    if (admin?.user) return { kind: "admin" };
  } catch {
    // Not an admin request — fall through to null.
  }
  return null;
}

/**
 * Decide which student a request is allowed to act on.
 *
 * - student → always their OWN login id. The `requested` value is discarded,
 *   which is what closes the horizontal IDOR.
 * - admin   → whatever they asked for (may be null; callers 400 on that).
 *
 * Returns null when no usable identifier exists, so callers can reject.
 */
export function scopedStudentIdentifier(
  scope: Scope,
  requested: string | null,
): string | null {
  if (scope.kind === "admin") return requested;
  return scope.session.studentIdentifier ?? null;
}

/** True when the caller is an admin. Used by admin-only routes. */
export function isAdmin(scope: Scope | null): boolean {
  return scope?.kind === "admin";
}
