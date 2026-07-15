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
  const s = await prisma.student.findUnique({
    where: { studentId: "STU_MRHQL6KX" },
    select: { id: true },
  });
  if (!s) { console.log("SHOFI not found"); return; }

  const curriculum = await prisma.curriculum.findFirst({
    where: { studentId: s.id },
    orderBy: { version: "desc" },
    select: { id: true, gradeLevel: true },
  });
  if (!curriculum) { console.log("No curriculum"); return; }

  // Get sample material to copy structure
  const sample = await prisma.material.findFirst({ where: { curriculumId: curriculum.id } });
  console.log("Sample material keys:", sample ? Object.keys(sample).join(", ") : "NONE");

  // Existing subjects
  const existing = await prisma.material.findMany({
    where: { curriculumId: curriculum.id },
    select: { subject: true },
    distinct: ["subject"],
  });
  const existingSet = new Set(existing.map((m) => m.subject));
  console.log("Existing:", existingSet.size, "subjects");

  // Add 3 new subjects
  const toAdd = ["Kimia", "Matematika Tingkat Lanjut", "Bahasa Inggris Tingkat Lanjut"];
  for (const subject of toAdd) {
    if (existingSet.has(subject)) { console.log("⏭️", subject); continue; }
    await prisma.material.create({
      data: {
        curriculumId: curriculum.id,
        subject,
        topic: `Pengantar ${subject}`,
        gradeLevel: "SMA_2" as any,
        weekOrder: 0,
        priority: 0,
        delivery: "TEXT" as any,
        status: "DRAFT" as any,
      },
    });
    console.log("✅", subject);
  }

  // Verify
  const all = await prisma.material.findMany({
    where: { curriculumId: curriculum.id },
    select: { subject: true },
    distinct: ["subject"],
    orderBy: { subject: "asc" },
  });
  console.log("\nTotal:", all.length, "subjects");
  console.log(all.map((m) => m.subject).join(", "));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
