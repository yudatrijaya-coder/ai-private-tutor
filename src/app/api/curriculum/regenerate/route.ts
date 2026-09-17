import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateCurriculumDraft,
  replaceCurriculumForStudent,
} from "@/agents/curriculum";
import { resolveScope, isAdmin } from "@/lib/auth/scope";
import { ACTIVE_CURRICULUM_ORDER } from "@/lib/curriculum-active";

export async function POST(request: NextRequest) {
  // Admin only — this clears the student's curriculum and regenerates it.
  if (!isAdmin(await resolveScope())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { studentId, force } = body;

  if (!studentId) {
    return NextResponse.json(
      { error: "studentId wajib diisi" },
      { status: 400 },
    );
  }

  // Verify student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    return NextResponse.json(
      { error: "Student tidak ditemukan" },
      { status: 404 },
    );
  }

  // Clear the old curriculum. Deletion order matters because every FK on the
  // chain is RESTRICT, and replacement is refused outright when quizzes have
  // been sat — see replaceCurriculumForStudent.
  const replaced = await replaceCurriculumForStudent(studentId, {
    allowSupercede: force === true,
  });

  if (replaced.mode === "blocked") {
    return NextResponse.json(
      {
        error:
          "Kurikulum ini sudah punya jawaban kuis. Regenerasi akan menggantinya dengan kurikulum baru tanpa isi. Ulangi dengan force: true untuk tetap melanjutkan.",
        attempts: replaced.oldAttemptCount,
        materials: replaced.oldMaterialCount,
        quizzes: replaced.oldQuizCount,
      },
      { status: 409 },
    );
  }

  // Generate new
  await generateCurriculumDraft(studentId, {
    version: replaced.nextVersion,
    changelog:
      replaced.mode === "superseded"
        ? `Regenerated from data bank; supersedes ${replaced.keptCurriculumIds.length} version(s) kept for attempt history`
        : "Regenerated from data bank",
  });

  // Fetch fresh count
  const newCurriculum = await prisma.curriculum.findFirst({
    where: { studentId },
    include: { _count: { select: { materials: true } } },
    orderBy: ACTIVE_CURRICULUM_ORDER as never,
  });

  return NextResponse.json({
    ok: true,
    mode: replaced.mode,
    version: replaced.nextVersion,
    materialCount: newCurriculum?._count.materials ?? 0,
    removed: {
      materials: replaced.oldMaterialCount,
      quizzes: replaced.oldQuizCount,
      attempts: replaced.oldAttemptCount,
    },
  });
}
