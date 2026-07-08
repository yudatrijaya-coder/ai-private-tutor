/** Quick SQL-only script: add curricula for Syifa & Shofi */
import { prisma } from "../src/lib/prisma";
import { GRADE_TOPICS } from "../src/data/curriculum-topics";

async function main() {
  for (const sid of ["SYIF62818", "SHOFI001"]) {
    const student = await prisma.student.findUnique({ where: { studentId: sid } });
    if (!student) { console.log(`${sid}: not found`); continue; }

    const exists = await prisma.curriculum.findFirst({ where: { studentId: student.id } });
    if (exists) { console.log(`${student.name}: already has curriculum`); continue; }

    const topics = GRADE_TOPICS[student.gradeLevel as keyof typeof GRADE_TOPICS] || [];
    
    // Use SQL to insert curriculum and materials
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Curriculum" (id, "studentId", "gradeLevel", version, metadata, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1::text, $2::text::"GradeLevel", 1, '{}'::jsonb, NOW(), NOW())`,
      [student.id, student.gradeLevel]
    );

    const cur = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "Curriculum" WHERE "studentId" = $1::text ORDER BY "createdAt" DESC LIMIT 1`,
      [student.id]
    );

    if (!cur[0]) { console.log(`${student.name}: failed`); continue; }
    const curId = cur[0].id;

    for (const t of topics) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Material" (id, "curriculumId", topic, "subTopic", subject, "weekOrder", status, delivery, "processedContent", metadata, "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1::text, $2::text, $3::text, $4::text, $5::int, 'READY', 'TEXT', '', '{}'::jsonb, NOW(), NOW())`,
        [curId, t.topic, t.subTopic, t.subject, t.weekOrder]
      );
    }

    console.log(`✅ ${student.name} (${student.gradeLevel}): ${topics.length} materi`);
  }

  await prisma.$disconnect();
}

main();
