import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCurriculumDraft } from "@/agents/curriculum";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { studentId } = body;

  if (!studentId) {
    return NextResponse.json(
      { error: "studentId wajib diisi" },
      { status: 400 },
    );
  }

  // Verify student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    return NextResponse.json(
      { error: "Student tidak ditemukan" },
      { status: 404 },
    );
  }

  // Delete old curriculum (cascade materials + quizzes)
  await prisma.curriculum.deleteMany({
    where: { studentId },
  });

  // Generate new
  await generateCurriculumDraft(studentId);

  // Fetch fresh count
  const newCurriculum = await prisma.curriculum.findFirst({
    where: { studentId },
    include: { _count: { select: { materials: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    materialCount: newCurriculum?._count.materials ?? 0,
  });
}
