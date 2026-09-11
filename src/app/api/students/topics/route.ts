import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveScope, scopedStudentIdentifier } from "@/lib/auth/scope";

/**
 * GET /api/students/topics?studentId=xxx&subject=xxx
 * Returns unique topics for a student's subject.
 *
 * A student may only read their own curriculum — the query param is discarded
 * for them. Admins keep the ability to inspect any student.
 */
export async function GET(request: NextRequest) {
  const scope = await resolveScope();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = scopedStudentIdentifier(
    scope,
    request.nextUrl.searchParams.get("studentId"),
  );
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
