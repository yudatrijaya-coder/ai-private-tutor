import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveScope, isAdmin } from "@/lib/auth/scope";

/**
 * DELETE /api/students/[id] — Delete a student and all related data.
 *
 * Admin only. This cascades across a dozen tables; before 2026-09-11 it was
 * reachable anonymously, so anyone who guessed a student ID could wipe that
 * student along with their curriculum, materials, quizzes and attempts.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdmin(await resolveScope())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Find student first
    const student = await prisma.student.findUnique({
      where: { studentId: id },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan" },
        { status: 404 },
      );
    }

    // Delete all related data in order (respecting FK constraints)
    await prisma.progressSnap.deleteMany({ where: { studentId: student.id } });
    await prisma.scheduleSession.deleteMany({ where: { studentId: student.id } });
    await prisma.sessionState.deleteMany({ where: { studentId: student.id } });
    await prisma.intervention.deleteMany({ where: { studentId: student.id } });
    await prisma.attempt.deleteMany({ where: { studentId: student.id } });
    await prisma.quiz.deleteMany({ where: { studentId: student.id } });
    await prisma.agentLog.deleteMany({ where: { studentId: student.id } });

    // Delete materials via curriculum
    const curricula = await prisma.curriculum.findMany({
      where: { studentId: student.id },
    });
    for (const c of curricula) {
      await prisma.material.deleteMany({ where: { curriculumId: c.id } });
    }
    await prisma.curriculum.deleteMany({ where: { studentId: student.id } });

    // Delete the student
    await prisma.student.delete({ where: { id: student.id } });

    return NextResponse.json({ ok: true, deleted: student.studentId });
  } catch (error) {
    console.error("[api/students] Error deleting:", error);
    return NextResponse.json(
      { error: "Gagal menghapus siswa" },
      { status: 500 },
    );
  }
}
