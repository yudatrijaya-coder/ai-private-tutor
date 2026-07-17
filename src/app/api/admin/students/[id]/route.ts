import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/students/[id]
 * Update student fields (name, gradeLevel, status, persona, telegramId, parentTelegramId, interests, scheduleConfig)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const allowedFields = [
      "name",
      "gradeLevel",
      "status",
      "holdMode",
      "persona",
      "telegramId",
      "parentTelegramId",
      "interests",
      "scheduleConfig",
    ];

    const data: Record<string, unknown> = {};

    // When status=ACTIVE, reset holdMode to NONE automatically
    if (body.status === "ACTIVE") {
      data.status = "ACTIVE";
      data.holdMode = "NONE";
    } else {
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          data[field] = body[field];
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const updated = await prisma.student.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true, student: updated });
  } catch (error) {
    console.error("[admin/students/[id]] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update student" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/students/[id]
 * Hard-delete student and ALL related data (cascade)
 * OR soft-archive (status=ARCHIVED) if hardDelete !== true
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const hardDelete = body.hardDelete === true;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (hardDelete) {
      // ── HARD DELETE: cascade delete all related data ──
      // Get all curriculum IDs for this student
      const curriculums = await prisma.curriculum.findMany({
        where: { studentId: id },
        select: { id: true },
      });
      const currIds = curriculums.map((c) => c.id);

      // Get all material IDs for these curriculums
      const materials = await prisma.material.findMany({
        where: { curriculumId: { in: currIds } },
        select: { id: true },
      });
      const matIds = materials.map((m) => m.id);

      // Get all quiz IDs for these materials
      const quizzes = await prisma.quiz.findMany({
        where: { materialId: { in: matIds } },
        select: { id: true },
      });
      const quizIds = quizzes.map((q) => q.id);

      // Delete in order (respecting foreign keys):
      // 1. Delete ALL attempts pointing to any of these quizzes
      await prisma.attempt.deleteMany({ where: { quizId: { in: quizIds } } });
      // 2. Delete quizzes
      await prisma.quiz.deleteMany({ where: { materialId: { in: matIds } } });
      // 3. Delete materials
      await prisma.material.deleteMany({ where: { curriculumId: { in: currIds } } });
      // 4. Delete curriculums
      await prisma.curriculum.deleteMany({ where: { studentId: id } });
      // 5. Delete remaining student-scoped records
      await prisma.$transaction([
        prisma.progressSnap.deleteMany({ where: { studentId: id } }),
        prisma.scheduleSession.deleteMany({ where: { studentId: id } }),
        prisma.sessionState.deleteMany({ where: { studentId: id } }),
        prisma.intervention.deleteMany({ where: { studentId: id } }),
        prisma.chatLog.deleteMany({ where: { studentId: id } }),
        prisma.apiUsage.deleteMany({ where: { studentId: id } }),
        prisma.reminder.deleteMany({ where: { studentId: id } }),
        prisma.homeworkTask.deleteMany({ where: { studentId: id } }),
        prisma.studentActivity.deleteMany({ where: { studentId: id } }),
        prisma.studentSubjectMastery.deleteMany({ where: { studentId: id } }),
        prisma.student.delete({ where: { id } }),
      ]);

      console.log(`[admin/students/[id]] Hard-deleted student ${student.name} (${student.studentId})`);
      return NextResponse.json({
        ok: true,
        studentId: student.studentId,
        deleted: true,
      });
    } else {
      // ── SOFT DELETE: archive ──
      await prisma.student.update({
        where: { id },
        data: { status: "ARCHIVED" },
      });

      return NextResponse.json({
        ok: true,
        studentId: student.studentId,
        status: "ARCHIVED",
        archived: true,
      });
    }
  } catch (error) {
    console.error("[admin/students/[id]] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete/archive student" },
      { status: 500 },
    );
  }
}
