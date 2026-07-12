import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { safeString } from "@/lib/sanitize";
import { auth } from "@/lib/auth/edge";
import { getStudentSession } from "@/lib/auth/student";

/**
 * POST /api/auth/student/reset-password
 * Admin-only or self-service reset password.
 *
 * Only callable if authorized via:
 * - Admin JWT session (next-auth), OR
 * - Student JWT session (student JWT cookie)
 *
 * Validates newPassword min 6 chars, hashes with bcrypt (10 rounds), updates student.
 */
export async function POST(request: Request) {
  try {
    // Verify authorization — must have admin OR student session
    let authorizedStudentId: string | null = null;

    // Check admin session (next-auth)
    const adminSession = await auth();
    if (adminSession?.user?.id) {
      authorizedStudentId = "admin";
    }

    // Check student session (JWT cookie)
    if (!authorizedStudentId) {
      const studentSession = await getStudentSession();
      if (studentSession?.studentId) {
        authorizedStudentId = studentSession.studentId;
      }
    }

    if (!authorizedStudentId) {
      return NextResponse.json(
        { error: "Tidak terautentikasi. Silakan login terlebih dahulu." },
        { status: 401 },
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "Input tidak valid", details: msg },
        { status: 400 },
      );
    }

    const studentId = safeString(parsed.data.studentId.toUpperCase());
    const { newPassword } = parsed.data;

    // Look up student
    const student = await prisma.student.findUnique({
      where: { studentId },
      select: { id: true, studentId: true, name: true },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan" },
        { status: 404 },
      );
    }

    // Hash new password (10 rounds)
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update student record
    await prisma.student.update({
      where: { id: student.id },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
