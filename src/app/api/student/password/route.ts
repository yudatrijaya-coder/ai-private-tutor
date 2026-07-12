import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";

/**
 * PUT /api/student/password
 * Set or change the student's password.
 * Body: { currentPassword?: string, newPassword: string }
 */
export async function PUT(request: Request) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate new password
    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "Password baru harus diisi" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 },
      );
    }

    // Fetch current student data
    const student = await prisma.student.findUnique({
      where: { id: session.studentId },
      select: { passwordHash: true },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 },
      );
    }

    // If student already has a password, require currentPassword verification
    if (student.passwordHash) {
      if (!currentPassword || typeof currentPassword !== "string") {
        return NextResponse.json(
          { error: "Password saat ini harus diisi" },
          { status: 400 },
        );
      }

      const isValid = await bcrypt.compare(currentPassword, student.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Password saat ini salah" },
          { status: 400 },
        );
      }
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the student
    await prisma.student.update({
      where: { id: session.studentId },
      data: { passwordHash: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/student/password error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
