/**
 * Guardian — Admission Handler
 *
 * Called when a parent adds a new child to the system.
 * Orchestrates the full admission workflow:
 *   1. Create student in DB
 *   2. Queue curriculum:review job for curriculum generation
 *   3. Set up initial schedule (daily 06:30 + intensive Mon/Wed/Fri 16:00)
 *   4. Log to AgentLog
 *
 * @module @/agents/guardian/admission
 */

import { prisma } from "@/lib/prisma";
import { generateCurriculumDraft } from "@/agents/curriculum";
import type { Prisma } from "@/generated/prisma/client";

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
/*  Admission pipeline                                                 */
/* ------------------------------------------------------------------ */

/**
 * Execute the full admission workflow for a new student.
 *
 * 1. Creates the Student record
 * 2. Queues a `curriculum:review` job for the curriculum agent
 * 3. Creates initial schedule entries (daily + intensive sessions)
 * 4. Writes an AgentLog entry
 */
export async function handleAdmission(input: AdmissionInput): Promise<AdmissionResult> {
  const { parentUserId, name, telegramId, gradeLevel, characterPreference, interests, scheduleConfig } = input;

  // 1. Create student in DB
  const student = await prisma.student.create({
    data: {
      studentId: generateStudentId(name, gradeLevel),
      name,
      telegramId: telegramId ?? null,
      gradeLevel,
      characterPreference: characterPreference ?? null,
      interests: interests ?? null,
      scheduleConfig: scheduleConfig ? json(scheduleConfig) : undefined,
    },
  });

  console.log(`[guardian/admission] Created student=${student.id} (${name}, ${gradeLevel})`);

  // 2. Generate curriculum draft directly
  await generateCurriculumDraft(student.id);
  const curriculumEnqueued = true;
  console.log(
    `[guardian/admission] Generated curriculum draft for student=${student.id}`,
  );

  // 3. Set up initial schedule
  const sessions = buildInitialSchedule(student.id);
  if (sessions.length > 0) {
    await prisma.scheduleSession.createMany({ data: sessions });
    console.log(`[guardian/admission] Created ${sessions.length} initial schedule session(s)`);
  }

  // 4. Log to AgentLog
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
        }),
    },
  });

  return {
    id: student.id,
    studentId: student.studentId,
    curriculumEnqueued,
    sessionCount: sessions.length,
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
