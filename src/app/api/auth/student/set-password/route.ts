import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { setPasswordSchema } from "@/lib/validations/auth";
import { safeString } from "@/lib/sanitize";

/**
 * POST /api/auth/student/set-password
 * Set or change password for a student.
 *
 * - If passwordHash already exists: require currentPassword and verify it
 * - If no passwordHash: just set the new password (first-time setup)
 * - newPassword must be at least 6 characters
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = setPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "Input tidak valid", details: msg },
        { status: 400 },
      );
    }

    const studentId = safeString(parsed.data.studentId.toUpperCase());
    const { currentPassword, newPassword } = parsed.data;

    // Look up student
    const student = await prisma.student.findUnique({
      where: { studentId },
      select: {
        id: true,
        studentId: true,
        name: true,
        passwordHash: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan" },
        { status: 404 },
      );
    }

    // If password already set, require current password verification
    if (student.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Password saat ini diperlukan untuk mengganti password" },
          { status: 400 },
        );
      }

      const valid = await bcrypt.compare(currentPassword, student.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: "Password saat ini salah" },
          { status: 401 },
        );
      }
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
    console.error("Set password error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
