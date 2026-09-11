/**
 * Single source of truth for the `student_session` JWT signing secret.
 *
 * Why this module exists
 * ----------------------
 * Eight pages/components and two API routes each used to declare their own
 * module-scope constant:
 *
 *   const STUDENT_JWT_SECRET = new TextEncoder().encode(
 *     process.env.STUDENT_JWT_SECRET ?? "student-dev-secret-change-in-production",
 *   );
 *
 * Two independent problems with that:
 *
 * 1. **Public fallback.** "student-dev-secret-change-in-production" is in the
 *    git history. Any deployment that evaluated the module without the env var
 *    present would verify cookies against a secret the whole world knows, so
 *    anyone could forge a session. There is no fallback here: an unset secret
 *    is an error, not a default.
 *
 * 2. **Module-scope capture.** `next build` evaluates modules before PM2 injects
 *    the runtime environment, so a module-level constant can permanently bake in
 *    a stale value. Read at call time instead.
 *
 * The same rules the middleware already followed now apply everywhere.
 */

/**
 * Read the secret. Returns null when it is missing or too short — callers that
 * can degrade (rendering a page) should treat that as "no session".
 */
export function readStudentSecret(): Uint8Array | null {
  const s = process.env.STUDENT_JWT_SECRET;
  if (!s || s.length < 16) return null;
  return new TextEncoder().encode(s);
}

/**
 * Read the secret, throwing when it is unusable. Use where silently continuing
 * would be worse than failing loudly (signing a token).
 */
export function requireStudentSecret(): Uint8Array {
  const s = readStudentSecret();
  if (!s) {
    throw new Error(
      "STUDENT_JWT_SECRET is not configured (must be >= 16 chars) — student sessions disabled",
    );
  }
  return s;
}
