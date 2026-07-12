import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { studentLoginSchema } from "@/lib/validations/auth";
import { safeString } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rate-limit";
import { createStudentSession } from "@/lib/auth/student";

export async function POST(request: Request) {
  try {
    // Rate limit by IP — 10 requests per minute
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rl = rateLimit(`student-login:${ip}`, 10);
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

    // Look up student by studentId — include passwordHash for verification
    const student = await prisma.student.findUnique({
      where: { studentId },
      select: {
        id: true,
        studentId: true,
        name: true,
        gradeLevel: true,
        characterPreference: true,
        passwordHash: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "ID siswa tidak ditemukan" },
        { status: 401 },
      );
    }

    // Password verification
    const password = parsed.data.password;

    if (student.passwordHash) {
      // Student has a password set — require verification
      if (!password) {
        return NextResponse.json(
          { error: "Password diperlukan untuk akun ini" },
          { status: 401 },
        );
      }

      const valid = await bcrypt.compare(password, student.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: "Password salah" },
          { status: 401 },
        );
      }
    }
    // else: no passwordHash set — backward compat, allow login without password

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
