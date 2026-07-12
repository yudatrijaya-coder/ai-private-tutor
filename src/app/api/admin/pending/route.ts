import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/pending
 * List all students with PENDING status (for registration approvals)
 * Supports ?search= for filtering by name or studentId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";

    const where: Record<string, unknown> = { status: "PENDING" };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { studentId: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error("[admin/pending] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending students" },
      { status: 500 },
    );
  }
}
