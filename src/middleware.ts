import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { auth } from "@/lib/auth/edge";

const STUDENT_JWT_SECRET = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET ?? "student-dev-secret-change-in-production",
);
const STUDENT_COOKIE = "student_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- Student routes ----
  if (pathname.startsWith("/student") && !pathname.startsWith("/login")) {
    const token = request.cookies.get(STUDENT_COOKIE)?.value;
    if (!token) {
      const loginUrl = new URL("/login/student", request.url);
      loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
    try {
      await jwtVerify(token, STUDENT_JWT_SECRET);
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|api/trigger|api/pipeline|_next|static|favicon.ico|login).*)",
  ],
};
