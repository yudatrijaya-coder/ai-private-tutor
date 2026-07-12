/**
 * Script to attach quiz banks to existing materials (without deleting anything).
 * Run: npx ts-node -e "require('./src/scripts/attach-quizzes')"  (or via REST)
 */
import { prisma } from "@/lib/prisma";
import { getQuiz as getQuizSD5 } from "@/data/quiz-bank-sd5";
import { getQuiz as getQuizSMP7 } from "@/data/quiz-bank-smp7";
import { getQuiz as getQuizSMA11 } from "@/data/quiz-bank-sma11";

const QUIZ_BANKS: Record<string, any> = {
  SD_5: getQuizSD5,
  SMP_1: getQuizSMP7,
  SMA_2: getQuizSMA11,
};

async function attachQuizzesForStudent(name: string, studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) { console.log(`Student ${name} not found`); return; }

  const curriculum = await prisma.curriculum.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: { materials: true },
  });
  if (!curriculum) { console.log(`No curriculum for ${name}`); return; }

  const getQuiz = QUIZ_BANKS[student.gradeLevel];
  if (!getQuiz) { console.log(`No quiz bank for ${student.gradeLevel}`); return; }

  let attached = 0, skipped = 0;

  for (const material of curriculum.materials) {
    const existingQuiz = await prisma.quiz.findFirst({
      where: { materialId: material.id },
    });
    if (existingQuiz) { skipped++; continue; }

    const questions = getQuiz(material.subject, material.topic, material.subTopic);
    if (questions && questions.length > 0) {
      await prisma.quiz.create({
        data: {
          materialId: material.id,
          studentId: student.id,
          questions,
          maxScore: questions.length * 10,
          timeLimit: 5,
        },
      });
      attached++;
    }
  }

  console.log(`${name} (${student.gradeLevel}): attached ${attached} quizzes, ${skipped} skipped (${curriculum.materials.length} materials)`);
}

async function main() {
  const students = await prisma.student.findMany({
    where: { name: { in: ["SHOFI", "Raihan", "Syifa"] }, status: "ACTIVE" },
  });

  for (const s of students) {
    await attachQuizzesForStudent(s.name, s.id);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
