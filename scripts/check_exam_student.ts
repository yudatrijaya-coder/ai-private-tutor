import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'ai_private_tutor',
  user: process.env.PGUSER || 'tutor',
  password: process.env.PGPASSWORD || 'tutor123',
});
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

(async () => {
  // Find the student who owns the SMP_1 curriculum used for the test exam
  const student = await p.student.findUnique({
    where: { id: '0d3fbf85-a1ee-4c5c-bdd9-f752ed75b69d' },
    select: { id: true, studentId: true, name: true, gradeLevel: true },
  });
  console.log('STUDENT:', JSON.stringify(student));

  // Check the weekly exam exists
  const exam = await p.exam.findUnique({
    where: { id: '6caebee1-b538-47aa-ad97-3bd2374ffddf' },
    select: { id: true, title: true, type: true, subject: true, gradeLevel: true, isActive: true, _count: { select: { questions: true } } },
  });
  console.log('EXAM:', JSON.stringify(exam));

  // Check existing attempts for this student on this exam
  const attempts = await p.examAttempt.findMany({
    where: { studentId: student?.id, examId: exam?.id },
    select: { id: true, score: true, status: true },
  });
  console.log('ATTEMPTS:', JSON.stringify(attempts));

  await p.$disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
