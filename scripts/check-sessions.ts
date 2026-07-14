import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  const pool = new pg.Pool({
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "ai_private_tutor",
    user: process.env.POSTGRES_USER || "tutor",
    password: process.env.POSTGRES_PASSWORD || "tutor123",
  });
  const adapter = new PrismaPg(pool);
  const p = new PrismaClient({ adapter });

  const sessions = await p.scheduleSession.findMany({
    where: { student: { studentId: "STU_MRHQL6KX" } },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });

  console.log(`SHOFI: ${sessions.length} sessions`);
  for (const s of sessions) {
    console.log(
      s.id.slice(0, 8),
      s.status,
      s.scheduledAt.toISOString().slice(0, 19),
      s.type,
      s.durationMin + "m",
      "meta:" + JSON.stringify(s.metadata ?? {}),
    );
  }

  // Also check Andi
  const sessionsAndi = await p.scheduleSession.findMany({
    where: { student: { studentId: "ANDI001" } },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });
  console.log(`\nANDI: ${sessionsAndi.length} sessions`);
  for (const s of sessionsAndi) {
    console.log(
      s.id.slice(0, 8),
      s.status,
      s.scheduledAt.toISOString().slice(0, 19),
      s.type,
      s.durationMin + "m",
    );
  }

  await p.$disconnect();
}
main();
