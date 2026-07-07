import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/students — List all students.
 */
export async function GET() {
  try {
    const students = await prisma.student.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            curriculums: true,
            quizzes: true,
            attempts: true,
          },
        },
      },
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error("[api/students] Error listing:", error);
    return NextResponse.json(
      { error: "Gagal memuat data siswa" },
      { status: 500 },
    );
  }
}
