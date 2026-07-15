import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  database: "ai_private_tutor",
  user: "tutor",
  password: "tutor123",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Cari SHOFI
  const s = await prisma.student.findUnique({
    where: { studentId: "STU_MRHQL6KX" },
    select: { id: true, name: true },
  });
  if (!s) { console.log("SHOFI not found"); return; }
  console.log("SHOFI:", s.id, s.name);

  // Ambil curriculum SHOFI
  const curricula = await prisma.curriculum.findMany({
    where: { studentId: s.id },
    select: { id: true, gradeLevel: true, version: true },
    orderBy: { version: "desc" },
  });
  console.log("Curriculum:", curricula.length, "versions");

  // Ambil semua subject materials per curriculum
  for (const c of curricula) {
    const subjects = await prisma.material.findMany({
      where: { curriculumId: c.id },
      select: { subject: true, id: true },
      distinct: ["subject"],
      orderBy: { subject: "asc" },
    });
    console.log("  V" + c.version + " (" + c.gradeLevel + "):", subjects.map((x) => x.subject).join(", "));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
