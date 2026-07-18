/**
 * Guardian — Admission Handler
 *
 * Creates a PENDING student record (no content, no telegram).
 * Admin approves via /api/admin/students/approve → activates + copies template.
 *
 * Reusable exports:
 *   - tryCopyFromTemplate(studentId, gradeLevel) → copies from template student
 *   - createInitialSchedule(studentId, intensiveDays?) → creates 7-day schedule
 *
 * @module @/agents/guardian/admission
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";
import { generateStudentId } from "@/lib/studentId";

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
export async function tryCopyFromTemplate(
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

  // 1. Create student in DB as PENDING (waiting for admin approval)
  const student = await prisma.student.create({
    data: {
      studentId: await generateStudentId(name),
      name,
      telegramId: telegramId ?? null,
      gradeLevel,
      status: "PENDING",
      persona: personaMap[gradeLevel] as any ?? "KAK_BUDI",
      characterPreference: characterPreference ?? null,
      interests: interests ?? null,
      scheduleConfig: scheduleConfig ? json(scheduleConfig) : undefined,
      passwordHash,
    },
  });

  console.log(`[guardian/admission] Created PENDING student=${student.id} (${name}, ${gradeLevel}) — awaiting admin approval`);

  // Content copy + schedule + telegram notification → handled by admin approve endpoint
  // Student record is created but inactive until admin approves

  // Log to AgentLog
  await prisma.agentLog.create({
    data: {
      agentType: "GUARDIAN",
      action: "admission_pending",
      studentId: student.id,
      status: "QUEUED",
      input: json({ parentUserId, name, gradeLevel, telegramId }),
      output: json({ id: student.id, studentId: student.studentId, status: "PENDING" }),
    },
  });

  return {
    id: student.id,
    studentId: student.studentId,
    curriculumEnqueued: false, // not ready yet
    sessionCount: 0,
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

/**
 * Create initial schedule for a student.
 * Calls buildInitialSchedule then writes to DB.
 * Used by admin approve endpoint and bot onboarding.
 */
export async function createInitialSchedule(
  studentId: string,
  _intensiveDays?: string[],
): Promise<void> {
  const rows = buildInitialSchedule(studentId);
  if (rows.length > 0) {
    await prisma.scheduleSession.createMany({ data: rows });
  }
}
