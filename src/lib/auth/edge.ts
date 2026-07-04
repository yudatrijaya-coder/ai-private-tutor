// Edge-safe auth — does NOT import Prisma
// Only used by middleware.ts (Edge Runtime)
import NextAuth from "next-auth";

export const { auth } = NextAuth({
  providers: [], // no providers needed — middleware only reads session
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

      if (isOnDashboard && !isLoggedIn) return false;
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
