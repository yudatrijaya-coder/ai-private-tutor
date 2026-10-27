/**
 * Session gate for the `/system` control panel.
 *
 * Separate from NextAuth and from the student cookie on purpose:
 *
 * - The panel exposes process control, so it must not ride on a credential a
 *   student can obtain. A `student_session` must never open it.
 * - It has its own password (`SYSTEM_PANEL_PASSWORD_HASH`), so it can be
 *   rotated independently and a leaked dashboard login does not grant control
 *   of the host.
 *
 * The Edge-safe half (cookie verification) lives in `./session`; this module
 * adds the Node-only password check and cookie minting.
 */
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { panelSecret, verifyPanelToken, SYSTEM_COOKIE } from "./session";
import { parsePasswordHash } from "./panel-password";

export { SYSTEM_COOKIE, verifyPanelToken };

/** 8 hours — long enough for an ops session, short enough to expire overnight. */
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

/**
 * The configured bcrypt hash, or `null` when it is missing or malformed.
 *
 * The shape check matters: an unescaped hash is silently expanded by the env
 * loader into a string with no `$`, which would otherwise pass a mere
 * truthiness test and leave the panel showing a login form that can never
 * succeed. `null` here means "panel is not properly configured", which is a
 * different — and reportable — state from "wrong password".
 */
export function panelPasswordHash(): string | null {
  return parsePasswordHash(process.env.SYSTEM_PANEL_PASSWORD_HASH);
}

export function isPanelConfigured(): boolean {
  return Boolean(panelSecret() && panelPasswordHash());
}

/**
 * Check the submitted password against the configured bcrypt hash.
 *
 * Returns false for a missing/malformed hash as well as a wrong password, so
 * an unconfigured panel cannot be entered. `bcrypt.compare` does the
 * comparison itself, so there is no string-equality timing side channel.
 */
export async function verifyPanelPassword(password: string): Promise<boolean> {
  const hash = panelPasswordHash();
  if (!hash || !password) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/** Mint a session cookie value. Throws when the panel is not configured. */
export async function createPanelSession(): Promise<{ token: string; maxAge: number }> {
  const secret = panelSecret();
  if (!secret) throw new Error("SYSTEM_PANEL_SECRET is not configured (>= 32 chars)");

  const token = await new SignJWT({ scope: "system-panel" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secret);

  return { token, maxAge: SESSION_DURATION_SECONDS };
}

/** Verify the current request's panel cookie. Never throws. */
export async function hasPanelSession(): Promise<boolean> {
  const store = await cookies();
  return verifyPanelToken(store.get(SYSTEM_COOKIE)?.value);
}

/** Cookie attributes shared by the login and logout handlers. */
export function panelCookieOptions(maxAge: number) {
  return {
    name: SYSTEM_COOKIE,
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
