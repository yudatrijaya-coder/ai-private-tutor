import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Generate a studentId from name + grade level + timestamp */
function generateStudentId(name: string, _gradeLevel: string): string {
  const prefix = name.substring(0, 4).toUpperCase();
  const num = String(Date.now()).slice(-5);
  return `${prefix}${num}`;
}

/**
 * GET /api/admin/students
 * List all students with pagination & search
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { studentId: { contains: search, mode: "insensitive" as const } },
        { telegramId: { contains: search } },
      ];
    }
    if (status && ["ACTIVE", "PENDING", "PAUSED", "ARCHIVED"].includes(status)) {
      where.status = status;
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              chatLogs: true,
              curriculums: true,
              attempts: true,
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json({
      students: students.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        name: s.name,
        gradeLevel: s.gradeLevel,
        status: s.status,
        telegramId: s.telegramId,
        parentTelegramId: s.parentTelegramId,
        persona: s.persona,
        hasPassword: s.passwordHash !== null,
        createdAt: s.createdAt,
        _count: {
          chatLogs: s._count.chatLogs,
          curriculums: s._count.curriculums,
          quizAttempts: s._count.attempts,
        },
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[admin/students] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/students
 * Create a new student with auto-generated studentId and default status=PENDING
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      gradeLevel,
      persona,
      telegramId,
      parentTelegramId,
      interests,
      scheduleConfig,
    } = body;

    if (!name || !gradeLevel) {
      return NextResponse.json(
        { error: "name and gradeLevel are required" },
        { status: 400 },
      );
    }

    const validGrades = ["SD_5", "SMP_1", "SMA_2"];
    if (!validGrades.includes(gradeLevel)) {
      return NextResponse.json(
        { error: `Invalid gradeLevel. Must be one of: ${validGrades.join(", ")}` },
        { status: 400 },
      );
    }

    const studentId = generateStudentId(name, gradeLevel);

    // Auto-assign persona based on grade level if not provided
    const personaMap: Record<string, string> = {
      SD_5: "KAK_BUDI",
      SMP_1: "KAK_DEWI",
      SMA_2: "KAK_RAKA",
    };
    const assignedPersona = persona || personaMap[gradeLevel] || "KAK_BUDI";

    const student = await prisma.student.create({
      data: {
        studentId,
        name,
        gradeLevel,
        persona: assignedPersona,
        telegramId: telegramId ?? null,
        parentTelegramId: parentTelegramId ?? null,
        interests: interests ?? null,
        scheduleConfig: scheduleConfig ?? undefined,
        status: "PENDING",
      },
    });

    return NextResponse.json({ ok: true, student }, { status: 201 });
  } catch (error) {
    console.error("[admin/students] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create student" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/students?id=xxx
 * Archive (soft-delete) a student — set status = ARCHIVED
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id parameter required" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  await prisma.student.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  return NextResponse.json({ ok: true, studentId: student.studentId });
}
