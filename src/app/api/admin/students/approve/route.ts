import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";

/* ─────────────────────────────────────────────────────────────
   POST /api/admin/students/approve
   Admin approves a PENDING student:
   1. Set status = ACTIVE
   2. Copy template curriculum (parallel: copy + schedule + telegram)
   3. Send welcome message
───────────────────────────────────────────────────────────── */

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

async function buildInitialSchedule(studentId: string) {
  const rows: Array<{
    studentId: string;
    type: "DAILY" | "INTENSIVE";
    scheduledAt: Date;
    durationMin: number;
    status: "SCHEDULED";
  }> = [];
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const day = new Date(start);
    day.setDate(day.getDate() + dayOffset);

    const dailyTime = new Date(day);
    dailyTime.setHours(6, 30, 0, 0);
    rows.push({ studentId, type: "DAILY", scheduledAt: dailyTime, durationMin: 15, status: "SCHEDULED" });

    const dayOfWeek = day.getDay();
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
      const intensiveTime = new Date(day);
      intensiveTime.setHours(16, 0, 0, 0);
      rows.push({ studentId, type: "INTENSIVE", scheduledAt: intensiveTime, durationMin: 30, status: "SCHEDULED" });
    }
  }
  return rows;
}

async function copyTemplate(studentId: string, gradeLevel: string): Promise<string | null> {
  const template = await prisma.student.findFirst({
    where: { isTemplate: true, gradeLevel: gradeLevel as any },
    include: {
      curriculums: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          materials: {
            include: { quizzes: true },
            orderBy: { weekOrder: "asc" },
          },
        },
      },
    },
  });

  if (!template || template.curriculums.length === 0) return null;

  const templateCurriculum = template.curriculums[0];
  if (templateCurriculum.materials.length === 0) return null;

  const newCurriculum = await prisma.curriculum.create({
    data: {
      studentId,
      gradeLevel: templateCurriculum.gradeLevel,
      version: templateCurriculum.version,
      changelog: `Copied from template ${template.name} (${template.studentId})`,
      metadata: templateCurriculum.metadata ? json(templateCurriculum.metadata) : undefined,
    },
  });

  for (const mat of templateCurriculum.materials) {
    const newMaterial = await prisma.material.create({
      data: {
        curriculumId: newCurriculum.id,
        topic: mat.topic,
        subTopic: mat.subTopic,
        subject: mat.subject,
        gradeLevel: mat.gradeLevel,
        weekOrder: mat.weekOrder,
        priority: mat.priority,
        delivery: mat.delivery,
        status: mat.status,
        prerequisiteId: mat.prerequisiteId,
        sourceUrls: mat.sourceUrls ? json(mat.sourceUrls) : undefined,
        rawContent: mat.rawContent,
        processedContent: mat.processedContent,
        videoUrl: mat.videoUrl,
        videoScript: mat.videoScript,
        characterUsed: mat.characterUsed,
        metadata: mat.metadata ? json(mat.metadata) : undefined,
      },
    });

    for (const quiz of mat.quizzes) {
      await prisma.quiz.create({
        data: {
          materialId: newMaterial.id,
          studentId,
          type: quiz.type,
          questions: quiz.questions ? json(quiz.questions) : [],
          maxScore: quiz.maxScore,
          timeLimit: quiz.timeLimit,
        },
      });
    }
  }

  console.log(`[admin/approve] Copied ${templateCurriculum.materials.length} materials from ${template.studentId} → ${studentId}`);
  return template.studentId;
}

async function sendWelcomeMessage(student: {
  name: string;
  studentId: string;
  gradeLevel: string;
  telegramId: string | null;
}) {
  if (!student.telegramId) return;
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) return;

  const gradeLabels: Record<string, string> = {
    SD_5: "SD Kelas 5",
    SMP_1: "SMP Kelas 1",
    SMA_2: "SMA Kelas 2",
  };
  const label = gradeLabels[student.gradeLevel] ?? student.gradeLevel;
  const msg = [
    `🌟 *Pendaftaran Disetujui! 🎉*`,
    ``,
    `Halo *${student.name}!*`,
    `Akun kamu sudah aktif dan siap digunakan!`,
    ``,
    `📋 *Data Login:*`,
    `🆔 ID Siswa: \`${student.studentId}\``,
    `🔑 Password: \`belajar123\` (default)`,
    `📖 Kelas: ${label}`,
    ``,
    `[Buka Dashboard](https://senangbelajar.web.id/login/student)`,
    ``,
    `📚 Materi pelajaran sudah tersedia!`,
    `🧠 Mindmap & slide siap dipelajari`,
    `📝 Quiz & latihan sudah bisa dikerjakan`,
    ``,
    `*Jangan lupa ganti password setelah login!* 🔐`,
    ``,
    `Semangat belajarnya! 💪🔥`,
  ].join("\n");

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: student.telegramId, text: msg, parse_mode: "Markdown" }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = body.id;
    const action = body.action ?? "approve"; // "approve" | "reject"

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.status !== "PENDING") {
      return NextResponse.json(
        { error: `Student is not PENDING (current: ${student.status})` },
        { status: 400 },
      );
    }

    if (action === "reject") {
      // Hard delete rejected students
      await prisma.$transaction([
        prisma.curriculum.deleteMany({ where: { studentId: id } }),
        prisma.agentLog.deleteMany({ where: { studentId: id } }),
        prisma.student.delete({ where: { id } }),
      ]);
      return NextResponse.json({ ok: true, action: "rejected", deleted: true });
    }

    // ── APPROVE: activate + parallel content generation ──
    await prisma.student.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    // Run all 3 in parallel: template copy + schedule + telegram
    const [templateResult, _scheduleResult, _telegramResult] = await Promise.allSettled([
      copyTemplate(id, student.gradeLevel),
      buildInitialSchedule(id).then((sessions) => {
        if (sessions.length > 0) return prisma.scheduleSession.createMany({ data: sessions });
      }),
      sendWelcomeMessage(student),
    ]);

    const copiedFromTemplate = templateResult.status === "fulfilled" ? templateResult.value : null;
    console.log(`[admin/approve] Approved student ${student.name} (${student.studentId}) — template: ${copiedFromTemplate ?? "none"}`);

    // Log
    await prisma.agentLog.create({
      data: {
        agentType: "GUARDIAN",
        action: "admission_approved",
        studentId: id,
        status: "COMPLETED",
        input: json({ studentId: id, action: "approve" }),
        output: json({ status: "ACTIVE", copiedFromTemplate }),
      },
    });

    return NextResponse.json({
      ok: true,
      action: "approved",
      studentId: student.studentId,
      status: "ACTIVE",
      copiedFromTemplate,
    });
  } catch (error) {
    console.error("[admin/students/approve] Error:", error);
    return NextResponse.json({ error: "Failed to approve student" }, { status: 500 });
  }
}
