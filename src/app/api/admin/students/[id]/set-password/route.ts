import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * POST /api/admin/students/[id]/set-password
 * Admin-set password for a student (admin bypass).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { password, action } = await request.json();

    const student = await prisma.student.findUnique({
      where: { id },
      select: { id: true, name: true, studentId: true, passwordHash: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    }

    if (action === "clear") {
      // Clear password (admin override)
      await prisma.student.update({
        where: { id },
        data: { passwordHash: null },
      });
      return NextResponse.json({ ok: true, message: `Password ${student.name} dihapus` });
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.student.update({
      where: { id },
      data: { passwordHash },
    });

    return NextResponse.json({
      ok: true,
      message: `Password ${student.name} berhasil diatur`,
    });
  } catch (error) {
    console.error("[admin/set-password] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengatur password" },
      { status: 500 },
    );
  }
}
