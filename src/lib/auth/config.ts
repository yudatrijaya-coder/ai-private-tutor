import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";

// Read at call time, not module load: in production the module is evaluated
// during `next build`, before PM2 injects the runtime environment.
function adminCreds() {
  return {
    email: process.env.ADMIN_EMAIL,
    passwordHash: process.env.ADMIN_PASSWORD_HASH,
  };
}

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

        const { email: adminEmail, passwordHash } = adminCreds();

        // Admin credentials come from the environment. The password is stored
        // as a bcrypt hash, never in the source tree. If either variable is
        // unset, admin login is disabled rather than falling back to a
        // hardcoded default.
        if (!adminEmail || !passwordHash) {
          console.error(
            "[auth] ADMIN_EMAIL / ADMIN_PASSWORD_HASH not configured — admin login disabled",
          );
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        if (email !== adminEmail.trim().toLowerCase()) return null;

        const ok = await bcrypt.compare(
          String(credentials.password),
          passwordHash,
        );
        if (!ok) return null;

        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: { email, name: "Admin", role: "admin" },
          });
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
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
