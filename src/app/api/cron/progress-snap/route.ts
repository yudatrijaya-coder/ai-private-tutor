/**
 * API route: weekly ProgressSnap generation.
 * Cron: captures weekly snapshot of each student's progress per subject.
 * Called every Sunday 23:00 via cron.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  let created = 0;

  for (const student of students) {
    // Get materials with subject+topic for this student
    const materials = await prisma.material.findMany({
      where: { curriculum: { studentId: student.id } },
      select: { id: true, topic: true, subject: true },
    });

    // Deduplicate by subject
    const subjects = [...new Set(materials.map((m) => m.subject))];

    for (const subject of subjects) {
      // Materials for this subject
      const subjectMaterials = materials.filter((m) => m.subject === subject);

      // Quiz stats
      const quizAttempts = await prisma.attempt.findMany({
        where: {
          studentId: student.id,
          quiz: {
            material: {
              is: { subject, curriculum: { is: { studentId: student.id } } },
            },
          },
        },
        select: { score: true, maxScore: true },
      });

      const quizCount = quizAttempts.length;
      const totalScore = quizAttempts.reduce((s, a) => s + a.score, 0);
      const totalMax = quizAttempts.reduce((s, a) => s + a.maxScore, 0);
      const mastery = totalMax > 0 ? totalScore / totalMax : 0;

      // Study minutes from activities
      const activityRows = await prisma.studentActivity.findMany({
        where: { studentId: student.id, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
        select: { timeSpent: true },
      });
      const studyMinutes = Math.round(activityRows.reduce((s, a) => s + (a.timeSpent ?? 0), 0) / 60);

      await prisma.progressSnap.create({
        data: {
          studentId: student.id,
          subject,
          topic: null,
          mastery,
          quizCount,
          totalScore,
          totalMax,
          studyMinutes,
          snapDate: new Date(),
        },
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, snapsCreated: created, students: students.length });
}