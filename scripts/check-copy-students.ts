#!/usr/bin/env tsx
import { prisma } from "../src/lib/prisma";
const students = await prisma.student.findMany({
  where: { isTemplate: false },
  select: { id: true, studentId: true, name: true, gradeLevel: true },
});
for (const s of students) {
  const curriculum = await prisma.curriculum.findFirst({ where: { studentId: s.id } });
  const materialCount = curriculum ? await prisma.material.count({ where: { curriculumId: curriculum.id } }) : 0;
  const quizCount = await prisma.quiz.count({ where: { studentId: s.id } });
  console.log(`${s.gradeLevel} | ${s.studentId} | ${s.name} | mats=${materialCount} quizzes=${quizCount}`);
}
await prisma.$disconnect();
