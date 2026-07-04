import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [totalStudents, totalMaterials, totalQuizzes] = await Promise.all([
    prisma.student.count(),
    prisma.material.count(),
    prisma.quiz.count(),
  ]);

  return NextResponse.json({
    totalStudents,
    totalMaterials,
    totalQuizzes,
  });
}
