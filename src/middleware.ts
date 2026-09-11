import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { auth } from "@/lib/auth/edge";
import { readStudentSecret } from "@/lib/auth/student-secret";
import { evaluateStudentAccess } from "@/lib/auth/access";

const STUDENT_COOKIE = "student_session";

/**
 * Session probes for the guards below. Both run in the Edge runtime:
 * `jose`, the Edge NextAuth config, and the two pure auth helpers are all
 * Edge-safe.
 */
async function hasAdminSession(): Promise<boolean> {
  try {
    const session = await auth();
    return Boolean(session?.user);
  } catch {
    return false;
  }
}

/**
 * True only for a correctly signed cookie whose claims still entitle the
 * student to access (ACTIVE, or TRIAL that has not lapsed).
 *
 * The entitlement check is deliberately here as well as in `getStudentSession`:
 * this is the gate that protects every `/api/students/*` call, and a cookie can
 * outlive the trial it was minted under.
 */
async function hasStudentSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(STUDENT_COOKIE)?.value;
  const secret = readStudentSecret();
  if (!token || !secret) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    const decision = evaluateStudentAccess({
      status: payload.status as string | undefined,
      trialEndsAt: payload.trialEndsAt as string | undefined,
    });
    return decision.allowed;
  } catch {
    return false;
  }
}

/**
 * Guard against RSC server-action scanners.
 *
 * Next.js action IDs are sha1-style lowercase hex digests. This build emits
 * 42-char IDs, but the exact length is a framework-internal detail that can
 * change between Next.js versions, so the accepted range is deliberately wide
 * (32-64 hex). Blocking a legitimate action would break the app, so the filter
 * only ever rejects values that CANNOT be a digest.
 *
 * Rationale: scanners POST junk action IDs ("x", "exploit", "0", "action") and
 * every one makes Next.js print
 *   Error: The Server Reference ID did not match the expected format. Received "x".
 * 1600+ such lines were observed in production logs, drowning out real errors.
 * Rejecting them here returns the same 404 the app would have produced, without
 * the log spam or the server-action handler work.
 *
 * If a future Next.js changes the digest format, `looksLikeDigestButRejected`
 * logs a warning so the breakage is visible instead of silent.
 */
const ACTION_DIGEST = /^[0-9a-f]{32,64}$/;
const HEX_ONLY = /^[0-9a-f]+$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const actionId = request.headers.get("next-action");
  if (actionId && !ACTION_DIGEST.test(actionId)) {
    // Pure hex but outside the accepted width: likely a real (new-format) action
    // ID we would be breaking. Warn loudly. Junk like "exploit" stays silent.
    if (HEX_ONLY.test(actionId)) {
      console.warn(
        `[middleware] Rejected hex next-action id of unexpected length (${actionId.length}): ${actionId.slice(0, 12)}... ` +
          `If server actions are broken, widen ACTION_DIGEST in src/middleware.ts.`,
      );
    }
    return new NextResponse("Server action not found.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // ---- Student routes ----
  if (pathname.startsWith("/student") && !pathname.startsWith("/login")) {
    const token = request.cookies.get(STUDENT_COOKIE)?.value;
    const secret = readStudentSecret();
    if (!token || !secret) {
      if (!secret) {
        console.error(
          "[middleware] STUDENT_JWT_SECRET not configured — student access denied",
        );
      }
      const loginUrl = new URL("/login/student", request.url);
      loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
    try {
      const { payload } = await jwtVerify(token, secret);
      const decision = evaluateStudentAccess({
        status: payload.status as string | undefined,
        trialEndsAt: payload.trialEndsAt as string | undefined,
      });
      if (!decision.allowed) {
        // Send them to the login page with the reason, rather than bouncing
        // them to a page they cannot use. Login re-issues a token with fresh
        // claims, so a stale cookie self-heals.
        const expiredUrl = new URL("/login/student", request.url);
        expiredUrl.searchParams.set("reason", decision.reason.toLowerCase());
        return NextResponse.redirect(expiredUrl);
      }
    } catch {
      const loginUrl = new URL("/login/student", request.url);
      loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ---- Admin dashboard routes (NextAuth) ----
  if (pathname.startsWith("/dashboard")) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // ---- Admin API routes (NextAuth) ----
  if (pathname.startsWith("/api/admin/")) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ---- Student API routes (admin OR student session) ----
  //
  // These families were reachable with NO credentials at all until 2026-09-11:
  // `pathname.startsWith("/student")` above guards student PAGES, but it does
  // not prefix-match "/api/students", so the whole student API fell through to
  // NextResponse.next(). See docs/designs/2026-09-11-bug-hunt-findings.md §A.
  //
  // Both the student app and the admin dashboard call these routes, so either
  // credential is accepted: a student_session JWT, or a NextAuth admin session.
  // Per-route ownership (a student may only read their OWN record) is enforced
  // in the handlers, which pin studentId to the session instead of the query.
  const isStudentApi =
    pathname === "/api/students" ||
    pathname.startsWith("/api/students/") ||
    pathname === "/api/study" ||
    pathname === "/api/exam" ||
    pathname.startsWith("/api/exam/");

  if (isStudentApi) {
    if (await hasStudentSession(request)) return NextResponse.next();
    if (await hasAdminSession()) return NextResponse.next();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ---- Admin-only API routes ----
  if (pathname === "/api/queues" || pathname === "/api/bot/diag") {
    if (await hasAdminSession()) return NextResponse.next();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ---- Cron endpoints (shared secret) ----
  //
  // Fail closed: no `|| "local-cron"` fallback. A guessable default would let
  // anyone trigger mass notifications if CRON_SECRET were ever unset.
  if (
    pathname === "/api/cron/daily-nudge" ||
    pathname === "/api/cron/progress-snap"
  ) {
    const expected = process.env.CRON_SECRET;
    const provided =
      request.headers.get("x-cron-secret") ??
      request.nextUrl.searchParams.get("token");
    if (!expected || provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|api/trigger|api/pipeline|_next|static|favicon.ico|login).*)",
  ],
};
