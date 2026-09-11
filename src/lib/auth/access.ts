/**
 * Student access gate — decides whether a signed session is still entitled to
 * use the app.
 *
 * Kept dependency-free (no Prisma, no `next/headers`) so the Edge middleware and
 * Node route handlers evaluate the exact same rules. Before this module the gate
 * lived inline in the middleware and only ran for PAGE navigations:
 *
 *   if (status === "TRIAL" && trialEndsAt) { if (past) redirect }
 *
 * Two holes in that:
 *
 *   - API calls were never checked. `hasStudentSession()` only called
 *     `jwtVerify`, so a student whose trial had expired could keep reading
 *     every `/api/students/*` endpoint from a still-valid cookie.
 *   - Both claims were optional. A token without `status`/`trialEndsAt`
 *     (minted by a script, or by an older build) satisfied the condition
 *     vacuously and passed forever — including a TRIAL row with a NULL
 *     `trialEndsAt`.
 *
 * This module fails closed on all of those.
 */

export type AccessReason =
  | "OK"
  | "MISSING_STATUS"
  | "TRIAL_EXPIRED"
  | "TRIAL_NO_END"
  | "NOT_ALLOWED";

export interface AccessDecision {
  allowed: boolean;
  reason: AccessReason;
}

export interface StudentAccessClaims {
  status?: string | null;
  trialEndsAt?: string | null;
}

/** Statuses that may use the student app. Mirrors the `StudentStatus` enum. */
const ALLOWED_STATUSES = new Set(["ACTIVE", "TRIAL"]);

/**
 * Evaluate the claims carried by a student_session JWT.
 *
 * @param claims  `status` and `trialEndsAt` as stored in the token
 * @param now     injectable clock, for deterministic tests
 */
export function evaluateStudentAccess(
  claims: StudentAccessClaims,
  now: Date = new Date(),
): AccessDecision {
  const status = claims.status;

  // No status claim at all: an old or hand-minted token. Fail closed — the
  // student logs in again and gets a token carrying the real status.
  if (!status) return { allowed: false, reason: "MISSING_STATUS" };

  if (!ALLOWED_STATUSES.has(status)) {
    return { allowed: false, reason: "NOT_ALLOWED" };
  }

  if (status === "ACTIVE") return { allowed: true, reason: "OK" };

  // TRIAL — must carry a usable end date, in the future.
  const raw = claims.trialEndsAt;
  if (!raw) return { allowed: false, reason: "TRIAL_NO_END" };

  const endsAt = new Date(raw);
  if (Number.isNaN(endsAt.getTime())) {
    return { allowed: false, reason: "TRIAL_NO_END" };
  }
  if (endsAt.getTime() <= now.getTime()) {
    return { allowed: false, reason: "TRIAL_EXPIRED" };
  }

  return { allowed: true, reason: "OK" };
}

/**
 * Human-readable Indonesian message for a rejected login, or null when the
 * decision is "allowed".
 */
export function accessDeniedMessage(reason: AccessReason): string | null {
  switch (reason) {
    case "TRIAL_EXPIRED":
      return "Masa coba gratis sudah berakhir. Hubungi admin untuk melanjutkan.";
    case "TRIAL_NO_END":
      return "Akun trial belum memiliki tanggal berakhir. Hubungi admin.";
    case "NOT_ALLOWED":
      return "Akun tidak aktif. Hubungi admin.";
    case "MISSING_STATUS":
      return "Sesi tidak valid. Silakan masuk kembali.";
    default:
      return null;
  }
}
