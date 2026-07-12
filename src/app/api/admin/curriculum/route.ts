import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/curriculum
 * List all students with their curriculum + materials
 * Supports ?studentId= filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentIdFilter = searchParams.get("studentId")?.trim() || undefined;

    const curricula = await prisma.curriculum.findMany({
      where: studentIdFilter ? { student: { studentId: studentIdFilter } } : {},
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            gradeLevel: true,
            status: true,
          },
        },
        materials: {
          orderBy: { weekOrder: "asc" },
          select: {
            id: true,
            topic: true,
            subTopic: true,
            subject: true,
            weekOrder: true,
            status: true,
            delivery: true,
            createdAt: true,
            _count: { select: { quizzes: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ curricula });
  } catch (error) {
    console.error("[admin/curriculum] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch curricula" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/curriculum
 * Create curriculum for a student
 * Body: { studentId: string, materials?: Array<{ weekOrder, title, description, subject, type }> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, materials } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 },
      );
    }

    // Find student by either UUID (id) or studentId (login identifier)
    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id: studentId }, { studentId }],
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check if curriculum already exists for this student
    const existing = await prisma.curriculum.findFirst({
      where: { studentId: student.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Curriculum already exists for this student. Use PATCH to update materials." },
        { status: 409 },
      );
    }

    const curriculum = await prisma.curriculum.create({
      data: {
        studentId: student.id,
        gradeLevel: student.gradeLevel,
        version: 1,
        metadata: {},
        materials: materials
          ? {
              create: materials.map(
                (m: {
                  weekOrder: number;
                  title: string;
                  description?: string;
                  subject: string;
                  type?: string;
                }) => ({
                  topic: m.title,
                  subTopic: m.description ?? null,
                  subject: m.subject,
                  gradeLevel: student.gradeLevel,
                  weekOrder: m.weekOrder,
                  delivery: (m.type as any) ?? "TEXT",
                  status: "DRAFT",
                }),
              ),
            }
          : undefined,
      },
      include: {
        materials: { orderBy: { weekOrder: "asc" } },
      },
    });

    return NextResponse.json({ ok: true, curriculum }, { status: 201 });
  } catch (error) {
    console.error("[admin/curriculum] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create curriculum" },
      { status: 500 },
    );
  }
}
