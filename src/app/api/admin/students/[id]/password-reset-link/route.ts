import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

/**
 * GET /api/admin/students/[id]/password-reset-link
 * Generate a one-time password reset link for a student.
 *
 * Returns a JWT token valid for 1 hour, and a reset URL:
 *   /login/student?reset=TOKEN&studentId=XXX
 *
 * Note: Admin auth is expected to be handled by middleware or caller.
 * This endpoint itself is nested under /api/admin/ and relies on
 * the existing admin auth guard pattern.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        name: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan" },
        { status: 404 },
      );
    }

    // Generate reset token (JWT, 1 hour expiry)
    const JWT_SECRET = new TextEncoder().encode(
      process.env.STUDENT_JWT_SECRET ?? "student-dev-secret-change-in-production",
    );

    const resetToken = await new SignJWT({
      purpose: "password-reset",
      studentId: student.id,
      studentIdentifier: student.studentId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(JWT_SECRET);

    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const resetUrl = `${baseUrl}/login/student?reset=${resetToken}&studentId=${student.studentId}`;

    return NextResponse.json({
      success: true,
      resetToken,
      resetUrl,
      expiresIn: "1 hour",
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
      },
    });
  } catch (error) {
    console.error("[admin/students/id/password-reset-link] Error:", error);
    return NextResponse.json(
      { error: "Gagal membuat tautan reset password" },
      { status: 500 },
    );
  }
}
