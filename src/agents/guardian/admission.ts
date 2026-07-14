/**
 * Guardian — Admission Handler
 *
 * Called when a parent adds a new child to the system.
 * Orchestrates the full admission workflow:
 *   1. Create student in DB
 *   2. If template student exists for the same grade level → deep-copy entire curriculum
 *   3. Otherwise, fall back to generating curriculum from data banks
 *   4. Set up initial schedule (daily 06:30 + intensive Mon/Wed/Fri 16:00)
 *   5. Log to AgentLog
 *
 * @module @/agents/guardian/admission
 */

import { prisma } from "@/lib/prisma";
import { generateCurriculumDraft } from "@/agents/curriculum";
import type { Prisma } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AdmissionInput {
  /** Parent / guardian user ID (from Auth) */
  parentUserId: string;
  /** Student display name */
  name: string;
  /** Optional Telegram chat ID */
  telegramId?: string;
  gradeLevel: "SD_5" | "SMP_1" | "SMA_2";
  /** Optional character/persona preference */
  characterPreference?: string;
  /** Optional interests / hobbies */
  interests?: string;
  /** Optional preferred schedule times */
  scheduleConfig?: Record<string, unknown>;
}

export interface AdmissionResult {
  id: string;
  studentId: string;
  curriculumEnqueued: boolean;
  sessionCount: number;
  copiedFromTemplate?: string; // studentId of template
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Serialise arbitrary data for a Prisma Json field. */
function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

/** Generate a studentId from name + grade level. */
function generateStudentId(name: string, _gradeLevel: string): string {
  const prefix = name.substring(0, 4).toUpperCase();
  const num = String(Date.now()).slice(-5);
  return `${prefix}${num}`;
}

/* ------------------------------------------------------------------ */
/*  Template deep-copy                                                 */
/* ------------------------------------------------------------------ */

/**
 * Check if there's a template student for the same grade level.
 * If yes, deep-copy their entire curriculum (materials, slides metadata,
 * mindmaps, quizzes) to the new student.
 *
 * Returns true if a template was copied, false if no template found.
 */
async function tryCopyFromTemplate(
  studentId: string,
  gradeLevel: string,
): Promise<string | null> {
  // Find template student for this grade level
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

  // Create new curriculum (same as template)
  const newCurriculum = await prisma.curriculum.create({
    data: {
      studentId,
      gradeLevel: templateCurriculum.gradeLevel,
      version: templateCurriculum.version,
      changelog: `Copied from template ${template.name} (${template.studentId})`,
      metadata: templateCurriculum.metadata
        ? json(templateCurriculum.metadata)
        : undefined,
    },
  });

  // Deep-copy each material + quiz
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

    // Copy quizzes
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

  console.log(
    `[guardian/admission] Copied curriculum from template ${template.studentId} (${template.name}) to new student ${studentId}: ` +
      `${templateCurriculum.materials.length} materials`,
  );

  return template.studentId;
}

/* ------------------------------------------------------------------ */
/*  Admission pipeline                                                 */
/* ------------------------------------------------------------------ */

/**
 * Execute the full admission workflow for a new student.
 *
 * 1. Creates the Student record
 * 2. Checks for template student in same grade → deep-copy if found
 * 3. Falls back to data bank curriculum generation if no template
 * 4. Creates initial schedule entries (daily + intensive sessions)
 * 5. Writes an AgentLog entry
 */
export async function handleAdmission(input: AdmissionInput): Promise<AdmissionResult> {
  const { parentUserId, name, telegramId, gradeLevel, characterPreference, interests, scheduleConfig } = input;

  // Auto-assign persona based on grade level
  const personaMap: Record<string, string> = {
    SD_5: "KAK_BUDI",
    SMP_1: "KAK_DEWI",
    SMA_2: "KAK_RAKA",
  };

  const DEFAULT_PASSWORD = "belajar123";
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 1. Create student in DB
  const student = await prisma.student.create({
    data: {
      studentId: generateStudentId(name, gradeLevel),
      name,
      telegramId: telegramId ?? null,
      gradeLevel,
      persona: personaMap[gradeLevel] as any ?? "KAK_BUDI",
      characterPreference: characterPreference ?? null,
      interests: interests ?? null,
      scheduleConfig: scheduleConfig ? json(scheduleConfig) : undefined,
      passwordHash,
    },
  });

  console.log(`[guardian/admission] Created student=${student.id} (${name}, ${gradeLevel})`);

  // 2. Try template copy first
  let copiedFromTemplate: string | null = null;
  let curriculumEnqueued = false;

  copiedFromTemplate = await tryCopyFromTemplate(student.id, gradeLevel);

  if (copiedFromTemplate) {
    curriculumEnqueued = true;
  } else {
    // Fallback: generate curriculum from data banks
    await generateCurriculumDraft(student.id);
    curriculumEnqueued = true;
    console.log(
      `[guardian/admission] Generated curriculum draft for student=${student.id} (no template found)`,
    );
  }

  // 3. Set up initial schedule
  const sessions = buildInitialSchedule(student.id);
  if (sessions.length > 0) {
    await prisma.scheduleSession.createMany({ data: sessions });
    console.log(`[guardian/admission] Created ${sessions.length} initial schedule session(s)`);
  }

  // 4. Kirim notif credentials ke Telegram (jika ada telegramId)
  if (student.telegramId) {
    try {
      const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      if (BOT_TOKEN) {
        const gradeLabels: Record<string, string> = {
          SD_5: "SD Kelas 5",
          SMP_1: "SMP Kelas 1",
          SMA_2: "SMA Kelas 2",
        };
        const label = gradeLabels[gradeLevel] ?? gradeLevel;
        const msg = [
          `🌐 *Dashboard Belajar Kamu!*`,
          ``,
          `Halo *${student.name}!*`,
          `Admin sudah mendaftarkan kamu. Yuk cobain dashboard belajar online!`,
          `[Buka Dashboard](https://senangbelajar.web.id/login/student)`,
          ``,
          `📋 *Data Login Kamu:*`,
          `🆔 ID Siswa: \`${student.studentId}\``,
          `🔑 Password: \`${DEFAULT_PASSWORD}\` (default)`,
          `📖 Kelas: ${label}`,
          ``,
          `Di dashboard kamu bisa:`,
          `📚 Baca materi pelajaran`,
          `🧠 Lihat mindmap interaktif`,
          `📝 Kerjakan quiz & latihan`,
          `📅 Cek jadwal belajar`,
          `📊 Lihat progress belajar`,
          ``,
          `*Jangan lupa ganti password setelah login pertama ya!* 🔐`,
          ``,
          `Semangat belajarnya! 💪🔥`,
        ].join("\n");

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: student.telegramId,
            text: msg,
            parse_mode: "Markdown",
          }),
        });
        console.log(`[guardian/admission] Sent credentials to ${student.name} (@${student.telegramId})`);
      }
    } catch (err) {
      // Non-critical — don't fail admission for Telegram failure
      console.error(`[guardian/admission] Failed to send credentials to ${student.name}:`, err);
    }
  }

  // 5. Log to AgentLog
  await prisma.agentLog.create({
    data: {
      agentType: "GUARDIAN",
      action: "admission",
      studentId: student.id,
      status: "COMPLETED",
      input: json({ parentUserId, name, gradeLevel }),
      output: json({
        studentId: student.id,
        curriculumDraftGenerated: true,
        sessionCount: sessions.length,
        copiedFromTemplate,
      }),
    },
  });

  return {
    id: student.id,
    studentId: student.studentId,
    curriculumEnqueued,
    sessionCount: sessions.length,
    copiedFromTemplate: copiedFromTemplate ?? undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Initial schedule builder                                           */
/* ------------------------------------------------------------------ */

interface ScheduleRow {
  studentId: string;
  type: "DAILY" | "INTENSIVE";
  scheduledAt: Date;
  durationMin: number;
  status: "SCHEDULED";
}

/**
 * Build the initial 7-day schedule:
 * - Daily sessions at 06:30 (15 min)
 * - Intensive sessions Mon/Wed/Fri at 16:00 (30 min)
 *
 * Starts from tomorrow at the specified time.
 */
function buildInitialSchedule(studentId: string): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const now = new Date();

  // Start from tomorrow
  const start = new Date(now);
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const day = new Date(start);
    day.setDate(day.getDate() + dayOffset);

    // Daily session at 06:30
    const dailyTime = new Date(day);
    dailyTime.setHours(6, 30, 0, 0);
    rows.push({
      studentId,
      type: "DAILY",
      scheduledAt: dailyTime,
      durationMin: 15,
      status: "SCHEDULED",
    });

    // Intensive sessions on Mon (1), Wed (3), Fri (5)
    const dayOfWeek = day.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
      const intensiveTime = new Date(day);
      intensiveTime.setHours(16, 0, 0, 0);
      rows.push({
        studentId,
        type: "INTENSIVE",
        scheduledAt: intensiveTime,
        durationMin: 30,
        status: "SCHEDULED",
      });
    }
  }

  return rows;
}
