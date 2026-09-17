/**
 * API route: weekly ProgressSnap generation.
 * Cron: captures weekly snapshot of each student's progress per subject.
 * Called every Sunday 23:00 via cron.
 *
 * Ledger A-20: this endpoint had **no authentication at all**, like
 * `daily-nudge` (A-07). Anyone could POST/GET it to force a full snapshot run:
 * the handler loops every active student × subject and inserts `ProgressSnap`
 * rows, so an anonymous caller could both pollute the progress history with
 * duplicate snapshots and burn server time. Now behind the shared fail-closed
 * `checkCronSecret()` guard, with each run recorded in `AgentLog`.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveCurriculumId } from "@/lib/curriculum-active";
import { checkCronSecret, logCronRun } from "@/lib/cron/guard";

export async function GET(request: NextRequest) {
  const denied = checkCronSecret(request);
  if (denied) return denied;

  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  let created = 0;

  for (const student of students) {
    // Get materials with subject+topic for this student, active curriculum only.
    // Unioning every curriculum would emit snapshots for subjects the student no
    // longer has (Raihan kept a stale v1 with Biologi / Sejarah / Geografi).
    // See `src/lib/curriculum-active.ts`.
    const curriculumId = await getActiveCurriculumId(student.id);
    if (!curriculumId) continue;

    const materials = await prisma.material.findMany({
      where: { curriculumId },
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

  await logCronRun({
    agentType: "SCHEDULER",
    action: "progress-snap",
    status: "COMPLETED",
    output: { snapsCreated: created, students: students.length },
  });

  return NextResponse.json({ ok: true, snapsCreated: created, students: students.length });
}