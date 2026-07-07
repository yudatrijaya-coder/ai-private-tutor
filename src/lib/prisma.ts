import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  const pool = new pg.Pool({
    host: process.env.PGHOST || "localhost",
    port: parseInt(process.env.PGPORT || "5432"),
    database: process.env.PGDATABASE || "ai_private_tutor",
    user: process.env.PGUSER || "tutor",
    password: process.env.PGPASSWORD || "tutor123",
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
