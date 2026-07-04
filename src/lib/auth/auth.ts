import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "../prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Phase 1 — hardcoded admin credentials
        if (
          credentials.email === "admin@tutor.ai" &&
          credentials.password === "admin123"
        ) {
          // Upsert admin user in DB
          let user = await prisma.user.findUnique({
            where: { email: "admin@tutor.ai" },
          });
          if (!user) {
            user = await prisma.user.create({
              data: {
                email: "admin@tutor.ai",
                name: "Admin",
                role: "admin",
              },
            });
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

      if (isOnDashboard && !isLoggedIn) return false; // redirect to signIn
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
