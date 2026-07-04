import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { studentLoginSchema } from "@/lib/validations/auth";
import { safeString } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rate-limit";
import { createStudentSession } from "@/lib/auth/student";

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rl = rateLimit(`student-login:${ip}`, 10); // stricter: 10/min
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi nanti." },
        { status: 429 },
      );
    }

    // Parse body
    const body = await request.json();
    const parsed = studentLoginSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "Input tidak valid", details: msg },
        { status: 400 },
      );
    }

    // Sanitize
    const studentId = safeString(parsed.data.studentId.toUpperCase());

    // Look up student by studentId
    const student = await prisma.student.findUnique({
      where: { studentId },
      select: {
        id: true,
        studentId: true,
        name: true,
        gradeLevel: true,
        characterPreference: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "ID siswa tidak ditemukan" },
        { status: 401 },
      );
    }

    // Create session JWT
    await createStudentSession({
      studentId: student.id,
      studentIdentifier: student.studentId,
      name: student.name,
      gradeLevel: student.gradeLevel,
      character: student.characterPreference,
    });

    return NextResponse.json({
      success: true,
      student: {
        name: student.name,
        gradeLevel: student.gradeLevel,
        character: student.characterPreference,
      },
    });
  } catch (error) {
    console.error("Student login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
