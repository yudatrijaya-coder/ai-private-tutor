/**
 * Normalisation for the panel's bcrypt hash, kept pure so it can be tested
 * without Next's runtime.
 *
 * Why this exists
 * ---------------
 * Next's env loader expands `$NAME` inside `.env` values. A bcrypt hash is
 * full of `$`, so `$2b$12$aX/Oq9…` was read back as `/Oq9…` — the panel then
 * showed a login form that could never succeed, and the "wrong password" reply
 * looked like a mismatch rather than a broken configuration. The 2026-10-27
 * deploy failed exactly this way.
 *
 * Two spellings are accepted:
 *
 *   1. Backslash-escaped (`\$2b\$12\$…`) — what `.env` needs, and what
 *      `.env.example` documents.
 *   2. Raw (`$2b$12$…`) — what systemd/docker/PM2 inject, where no loader
 *      performs expansion.
 *
 * Anything else is rejected instead of passed to `bcrypt.compare`, so a
 * mangled hash surfaces as "panel not configured" rather than as an
 * unexplainable wrong-password error.
 */

/** Bcrypt: `$2a$`/`$2b$`/`$2y$`, two-digit cost, 53 characters of salt+digest. */
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/** Strip the backslash escapes that `.env` requires before `$`. */
export function unescapeHash(raw: string): string {
  return raw.trim().replace(/\\\$/g, "$");
}

/** True when `value` is a well-formed bcrypt hash (after unescaping). */
export function isBcryptHash(value: string): boolean {
  return BCRYPT_RE.test(unescapeHash(value));
}

/**
 * Return the usable hash, or `null` when it is missing or malformed.
 *
 * Callers must treat `null` as "the panel cannot be entered", not as "password
 * did not match" — they are different states and only one of them is the
 * operator's fault.
 */
export function parsePasswordHash(raw: string | undefined): string | null {
  if (!raw) return null;
  const hash = unescapeHash(raw);
  return BCRYPT_RE.test(hash) ? hash : null;
}
