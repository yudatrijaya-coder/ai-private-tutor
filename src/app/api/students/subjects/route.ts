import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveScope, scopedStudentIdentifier } from "@/lib/auth/scope";

/**
 * GET /api/students/subjects?studentId=xxx
 * Returns unique subjects for a student's curriculum.
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
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const student = await prisma.student.findUnique({ where: { studentId } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const curricula = await prisma.curriculum.findMany({
    where: { studentId: student.id },
    include: {
      materials: { select: { subject: true }, orderBy: { subject: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const subjects = [...new Set(curricula.flatMap(c => c.materials.map(m => m.subject)))].sort();
  return NextResponse.json({ subjects });
}
