import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { auth } from "@/lib/auth/edge";

const STUDENT_COOKIE = "student_session";

/**
 * Read the signing secret at call time and fail closed when it is unset.
 *
 * The previous default ("student-dev-secret-change-in-production") is public
 * in the git history, so anyone could forge a student session cookie with it.
 * No fallback: if the env var is missing, every student request is rejected.
 */
function studentSecret(): Uint8Array | null {
  const s = process.env.STUDENT_JWT_SECRET;
  if (!s || s.length < 16) return null;
  return new TextEncoder().encode(s);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- Student routes ----
  if (pathname.startsWith("/student") && !pathname.startsWith("/login")) {
    const token = request.cookies.get(STUDENT_COOKIE)?.value;
    const secret = studentSecret();
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
      await jwtVerify(token, secret);
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|api/trigger|api/pipeline|_next|static|favicon.ico|login).*)",
  ],
};
