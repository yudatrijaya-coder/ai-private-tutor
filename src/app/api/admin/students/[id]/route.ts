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
      "persona",
      "telegramId",
      "parentTelegramId",
      "interests",
      "scheduleConfig",
    ];

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
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
 * Archive (soft-delete) a student — set status = ARCHIVED
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    await prisma.student.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return NextResponse.json({
      ok: true,
      studentId: student.studentId,
      status: "ARCHIVED",
    });
  } catch (error) {
    console.error("[admin/students/[id]] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to archive student" },
      { status: 500 },
    );
  }
}
