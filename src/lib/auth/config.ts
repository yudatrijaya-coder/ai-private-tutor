import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "../prisma";

export const { handlers, signIn, signOut } = NextAuth({
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

        if (
          credentials.email === "admin@tutor.ai" &&
          credentials.password === "admin123"
        ) {
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
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
