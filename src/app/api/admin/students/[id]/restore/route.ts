import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/students/[id]/restore
 * Restore an archived student back to ACTIVE
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.status !== "ARCHIVED") {
      return NextResponse.json(
        { error: "Student is not archived" },
        { status: 400 },
      );
    }

    await prisma.student.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    return NextResponse.json({
      ok: true,
      studentId: student.studentId,
      status: "ACTIVE",
    });
  } catch (error) {
    console.error("[admin/students/[id]/restore] POST error:", error);
    return NextResponse.json(
      { error: "Failed to restore student" },
      { status: 500 },
    );
  }
}
