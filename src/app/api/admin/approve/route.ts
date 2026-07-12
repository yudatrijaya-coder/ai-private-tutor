import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/approve
 * Approve a pending student by studentId (or id)
 * Body: { studentId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, id } = body;
    const identifier = studentId || id;

    if (!identifier) {
      return NextResponse.json(
        { error: "studentId or id required" },
        { status: 400 },
      );
    }

    // Find by either studentId (login identifier) or id (UUID)
    const student = await prisma.student.findFirst({
      where: {
        OR: [{ studentId: identifier }, { id: identifier }],
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.status !== "PENDING") {
      return NextResponse.json(
        { error: `Student status is ${student.status}, not PENDING` },
        { status: 400 },
      );
    }

    await prisma.student.update({
      where: { id: student.id },
      data: { status: "ACTIVE" },
    });

    return NextResponse.json({
      ok: true,
      studentId: student.studentId,
      status: "ACTIVE",
    });
  } catch (error) {
    console.error("[admin/approve] POST error:", error);
    return NextResponse.json(
      { error: "Failed to approve student" },
      { status: 500 },
    );
  }
}
