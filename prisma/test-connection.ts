import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  database: "ai_private_tutor",
  user: process.env.PGUSER || "tutor",
  password: process.env.PGPASSWORD || "tutor123",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const s = await prisma.student.findUnique({
    where: { studentId: "STU_MRHLH4LX" },
    select: { id: true, name: true, studentId: true }
  });
  console.log("Result:", JSON.stringify(s));
}

main()
  .catch(e => { console.error("ERROR:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
