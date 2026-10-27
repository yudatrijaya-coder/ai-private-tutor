/**
 * Edge-safe session check for the `/system` panel cookie.
 *
 * Kept in its own module because `src/middleware.ts` runs on the Edge runtime
 * and must not pull in `bcryptjs` (Node-only) or `next/headers`. This file
 * touches nothing but `jose` and the environment, so both the middleware and
 * the route handlers can share one definition of "is this session valid?".
 */
import { jwtVerify } from "jose";

export const SYSTEM_COOKIE = "system_session";

/**
 * Read the signing secret at call time.
 *
 * `next build` evaluates modules before PM2 injects the environment, so a
 * module-scope constant would bake in whatever existed at build time. No
 * development fallback: an unset secret disables the panel rather than making
 * it forgeable.
 */
export function panelSecret(): Uint8Array | null {
  const s = process.env.SYSTEM_PANEL_SECRET;
  if (!s || s.length < 32) return null;
  return new TextEncoder().encode(s);
}

/** Verify a raw cookie value. Never throws. */
export async function verifyPanelToken(token: string | undefined): Promise<boolean> {
  const secret = panelSecret();
  if (!secret || !token) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.scope === "system-panel";
  } catch {
    return false;
  }
}
