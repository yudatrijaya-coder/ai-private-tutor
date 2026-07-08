import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/students/topics?studentId=xxx&subject=xxx
 * Returns unique topics for a student's subject
 */
export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId");
  const subject = request.nextUrl.searchParams.get("subject");
  if (!studentId || !subject) return NextResponse.json({ error: "studentId and subject required" }, { status: 400 });

  const student = await prisma.student.findUnique({ where: { studentId } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const curriculum = await prisma.curriculum.findFirst({
    where: { studentId: student.id },
    include: {
      materials: {
        where: { subject },
        select: { topic: true },
        distinct: ["topic"],
        orderBy: { weekOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const topics = (curriculum?.materials || []).map(m => m.topic);
  return NextResponse.json({ topics });
}
