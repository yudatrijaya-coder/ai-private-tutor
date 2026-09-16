/**
 * Guardian monitor link — signed, read-only, shareable token for parents.
 *
 * Why a token instead of an account
 * ---------------------------------
 * Parents are the audience that asks "how is my child doing?" but they will
 * never create a login: the onboarding funnel that already exists (Telegram
 * `/parent_daftar`) requires the parent to have Telegram and to know the
 * child's studentId. This module covers the other half — a link the **student**
 * generates from `/student/profile-link` and sends over WhatsApp, Telegram or
 * SMS, which opens a read-only summary of that one child.
 *
 * Security properties
 * -------------------
 * 1. **Domain-separated.** The token is signed with the same key as
 *    `student_session`, but carries `iss: senangbelajar` / `aud: guardian-monitor`
 *    and a `scope: "guardian"` claim. `jwtVerify` in the student auth path does
 *    not check those, so a guardian token can never act as a student session —
 *    and the reverse is impossible too, because this verifier rejects tokens
 *    that carry a student's session claims without the guardian scope.
 * 2. **Read-only + single target.** The only claim that matters is `sub`
 *    (the student UUID). No mutation endpoint accepts a guardian token.
 * 3. **Expiring.** Default 180 days. A leaked link stops working on its own,
 *    and regenerating invalidates nothing else (tokens are stateless).
 * 4. **No PII beyond the child.** The page renders the child's first name,
 *    grade, and study statistics. The parent's Telegram id, password hash and
 *    login identifier are never included.
 *
 * @module @/lib/auth/guardian-link
 */

import { SignJWT, jwtVerify } from "jose";
import { requireStudentSecret } from "./student-secret";

const ISSUER = "senangbelajar";
const AUDIENCE = "guardian-monitor";
const SCOPE = "guardian";

/** How long a shared monitor link stays valid. */
export const GUARDIAN_LINK_DAYS = 180;

export interface GuardianTokenClaims {
  studentId: string;
  /** Unix seconds. */
  expiresAt: number;
}

/**
 * Sign a monitor token for one student. Throws when the signing secret is
 * unusable — silently issuing an unverifiable link would be worse.
 */
export async function signGuardianToken(
  studentId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const secret = requireStudentSecret();
  const exp = Math.floor(Date.now() / 1000) + GUARDIAN_LINK_DAYS * 24 * 60 * 60;

  const token = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(studentId)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret);

  return { token, expiresAt: new Date(exp * 1000) };
}

/**
 * Verify a monitor token. Returns the student id, or null for anything that is
 * expired, tampered with, signed by a different key, or simply not a guardian
 * token (issuer/audience/scope must all match).
 */
export async function verifyGuardianToken(
  token: string,
): Promise<GuardianTokenClaims | null> {
  try {
    const secret = requireStudentSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (payload.scope !== SCOPE) return null;
    const studentId = payload.sub;
    if (!studentId || typeof studentId !== "string") return null;
    if (typeof payload.exp !== "number") return null;

    return { studentId, expiresAt: payload.exp };
  } catch {
    return null;
  }
}
