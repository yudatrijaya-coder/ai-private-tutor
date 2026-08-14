import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432"),
  database: process.env.PGDATABASE || "ai_private_tutor",
  user: process.env.PGUSER || "tutor",
  password: process.env.PGPASSWORD || "tutor123",
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // List all students
  const students: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, "studentId", name FROM "Student" ORDER BY "createdAt"`
  );
  console.log("=== STUDENTS ===");
  for (const s of students) console.log(JSON.stringify(s));

  // Material counts per student
  const counts: any[] = await prisma.$queryRawUnsafe(
    `SELECT s."studentId", COUNT(*) as cnt
     FROM "Material" m
     JOIN "Curriculum" c ON c.id = m."curriculumId"
     JOIN "Student" s ON s.id = c."studentId"
     GROUP BY s."studentId"
     ORDER BY s."studentId"`
  );
  console.log("\n=== MATERIAL COUNTS ===");
  for (const r of counts) console.log(`${r.studentId}: ${r.cnt} materials`);

  // Quiz counts per student
  const quizCounts: any[] = await prisma.$queryRawUnsafe(
    `SELECT s."studentId", COUNT(q.id) as cnt
     FROM "Quiz" q
     JOIN "Student" s ON s.id = q."studentId"
     GROUP BY s."studentId"
     ORDER BY s."studentId"`
  );
  console.log("\n=== QUIZ COUNTS ===");
  for (const r of quizCounts) console.log(`${r.studentId}: ${r.cnt} quizzes`);

  // Sample subTopics for RAIHAN
  const raihanSubtopics: any[] = await prisma.$queryRawUnsafe(
    `SELECT DISTINCT m."subTopic", m.subject
     FROM "Material" m
     JOIN "Curriculum" c ON c.id = m."curriculumId"
     JOIN "Student" s ON s.id = c."studentId"
     WHERE s."studentId" = 'RAIHAN001'
     LIMIT 30`
  );
  console.log("\n=== RAIHAN subTopics (sample) ===");
  for (const r of raihanSubtopics) console.log(`${r.subject} > ${r.subTopic}`);

  await prisma.$disconnect();
  await pool.end();
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
