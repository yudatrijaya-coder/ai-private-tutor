import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { studentLoginSchema } from "@/lib/validations/auth";
import { safeString } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rate-limit";
import { createStudentSession } from "@/lib/auth/student";
import { evaluateStudentAccess, accessDeniedMessage } from "@/lib/auth/access";

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
        status: true,
        trialEndsAt: true,
        subscriptionUntil: true,
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

    // Fail closed (ledger A-18). The previous revision let a student whose
    // `passwordHash` was null log in with no password at all — the comment
    // called it "backward compat", but it turns an admin provisioning gap into
    // an open door: student IDs are guessable (`SYIFA001`, `RAIHAN001`, …), so
    // anyone could mint a session for a student who had not been issued a
    // password yet. Every provisioning path sets a hash
    // (`scripts/send-credentials.ts`, admin set-password, reset link) and no
    // student currently lacks one, so refusing here costs nothing.
    if (!student.passwordHash) {
      return NextResponse.json(
        {
          error: "Akun ini belum memiliki password. Hubungi admin untuk mengatur password.",
          reason: "no_password_set",
        },
        { status: 403 },
      );
    }

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

    // Entitlement gate (ledger A-19). Reject before a cookie is issued: the
    // middleware and `getStudentSession()` both fail closed on a token whose
    // claims are missing or lapsed, so issuing one here would only produce a
    // login that immediately bounces back to this page.
    const access = evaluateStudentAccess({
      status: student.status,
      trialEndsAt: student.trialEndsAt?.toISOString() ?? null,
      subscriptionUntil: student.subscriptionUntil?.toISOString() ?? null,
    });
    if (!access.allowed) {
      return NextResponse.json(
        { error: accessDeniedMessage(access.reason), reason: access.reason },
        { status: 403 },
      );
    }

    // Create session JWT — always carrying status + trialEndsAt so downstream
    // checks have something to evaluate.
    await createStudentSession({
      studentId: student.id,
      studentIdentifier: student.studentId,
      name: student.name,
      gradeLevel: student.gradeLevel,
      character: student.characterPreference,
      status: student.status,
      trialEndsAt: student.trialEndsAt?.toISOString() ?? null,
      subscriptionUntil: student.subscriptionUntil?.toISOString() ?? null,
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
