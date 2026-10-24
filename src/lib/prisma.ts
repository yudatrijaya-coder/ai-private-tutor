import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Build the connection pool from `PG*` variables.
 *
 * `PGPASSWORD` used to fall back to a hardcoded password literal, which is both a
 * credential leak and a silent-failure trap: a missing `.env` would connect
 * with the wrong credentials (or worse, silently connect to a dev database)
 * instead of failing loudly. Now a missing password throws at startup.
 */
function createPrisma() {
  const password = process.env.PGPASSWORD;
  if (!password) {
    throw new Error(
      [
        "PGPASSWORD tidak diset — tidak bisa membuat koneksi database.",
        "",
        "src/lib/prisma.ts membaca PGPASSWORD (lihat juga PGHOST/PGPORT/",
        "PGDATABASE/PGUSER). Pastikan .env dimuat sebelum aplikasi start;",
        "PM2 menyimpan snapshot env, jadi perbarui dengan:",
        "  export PGPASSWORD=... && pm2 restart <app> --update-env",
      ].join("\n"),
    );
  }

  const pool = new pg.Pool({
    host: process.env.PGHOST || "localhost",
    port: parseInt(process.env.PGPORT || "5432"),
    database: process.env.PGDATABASE || "ai_private_tutor",
    user: process.env.PGUSER || "tutor",
    password,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
