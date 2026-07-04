/**
 * Scheduler Assigner — 60/30/10 topic assignment algorithm.
 *
 * - 60% new curriculum topics (READY / PROCESSED / VIDEO_READY materials)
 * - 30% weak areas review (subjects with mastery < 50%)
 * - 10% student request / random
 *
 * @module @/agents/scheduler/assigner
 */

import { prisma } from "@/lib/prisma";
import type { Material } from "@/generated/prisma/client";
import { addDays } from "date-fns";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const RATIO_NEW = 0.6;
const RATIO_WEAK = 0.3;
const RATIO_RANDOM = 0.1;

const MAX_SESSIONS_PER_DAY = 2;
const DEFAULT_DURATION = 15;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AssignResult {
  sessionsCreated: number;
  summary: {
    new: string[];
    weak: string[];
    random: string[];
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Run the 60/30/10 assignment algorithm for a student's week.
 *
 * 1. Fetches student's schedule config & grade level
 * 2. Gathers available materials (new curriculum topics)
 * 3. Identifies weak subjects from latest ProgressSnap
 * 4. Computes available daily slots for the week
 * 5. Allocates sessions according to 60/30/10 ratio
 * 6. Persists ScheduleSession records
 */
export async function assignWeeklyTopics(
  studentId: string,
  weekStart: string,
): Promise<AssignResult> {
  // 1. Load student
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, gradeLevel: true, scheduleConfig: true },
  });

  if (!student) {
    console.error(`[scheduler/assigner] Student not found: ${studentId}`);
    return { sessionsCreated: 0, summary: { new: [], weak: [], random: [] } };
  }

  // 2. Gather available new-curriculum materials
  const availableMaterials = await prisma.material.findMany({
    where: {
      gradeLevel: student.gradeLevel,
      status: { in: ["READY" as const, "PROCESSED" as const, "VIDEO_READY" as const] },
    },
    orderBy: [{ weekOrder: "asc" }, { priority: "desc" }],
  });

  // Filter out topics already scheduled this week
  const weekStartDate = new Date(weekStart);
  const weekEndDate = addDays(weekStartDate, 7);
  const existingSessions = await prisma.scheduleSession.findMany({
    where: {
      studentId,
      scheduledAt: { gte: weekStartDate, lt: weekEndDate },
      topic: { not: null },
    },
    select: { topic: true },
  });

  const assignedTopics = new Set<string>(
    existingSessions.map((s) => s.topic).filter((t): t is string => t !== null),
  );
  const unassignedMaterials = availableMaterials.filter(
    (m) => !assignedTopics.has(m.topic),
  );

  // 3. Identify weak subjects (mastery < 50%)
  const weakSubjects = await identifyWeakSubjects(studentId);

  // 4. Compute available session slots
  const slots = computeWeeklySlots(student.scheduleConfig, weekStartDate);

  // 5. Allocate 60/30/10
  const totalSlots = slots.length;
  const newCount = Math.round(totalSlots * RATIO_NEW);
  const weakCount = Math.round(totalSlots * RATIO_WEAK);
  const randomCount = totalSlots - newCount - weakCount;

  const newTopics = unassignedMaterials.slice(0, newCount);
  const weakTopics = selectWeakAreaTopics(weakSubjects, availableMaterials, weakCount);
  const randomTopics = selectRandomTopics(
    unassignedMaterials, availableMaterials, randomCount, assignedTopics,
  );

  // 6. Build session records
  const sessions: Array<{
    topic: string;
    subject: string | null;
    type: "DAILY" | "INTENSIVE";
    scheduledAt: Date;
    durationMin: number;
  }> = [];

  let slotIdx = 0;

  for (const mat of newTopics) {
    if (slotIdx >= totalSlots) break;
    sessions.push({
      topic: mat.topic,
      subject: mat.subject,
      type: "DAILY",
      scheduledAt: slots[slotIdx].start,
      durationMin: DEFAULT_DURATION,
    });
    slotIdx++;
  }

  for (const item of weakTopics) {
    if (slotIdx >= totalSlots) break;
    sessions.push({
      topic: item.topic,
      subject: item.subject ?? null,
      type: "DAILY",
      scheduledAt: slots[slotIdx].start,
      durationMin: DEFAULT_DURATION,
    });
    slotIdx++;
  }

  for (const item of randomTopics) {
    if (slotIdx >= totalSlots) break;
    sessions.push({
      topic: item.topic,
      subject: item.subject ?? null,
      type: "INTENSIVE",
      scheduledAt: slots[slotIdx].start,
      durationMin: DEFAULT_DURATION + 5,
    });
    slotIdx++;
  }

  if (sessions.length === 0) {
    return { sessionsCreated: 0, summary: { new: [], weak: [], random: [] } };
  }

  // 7. Persist
  await prisma.scheduleSession.createMany({
    data: sessions.map((s) => ({
      studentId,
      topic: s.topic,
      subject: s.subject,
      type: s.type,
      scheduledAt: s.scheduledAt,
      durationMin: s.durationMin,
      status: "SCHEDULED" as const,
    })),
  });

  return {
    sessionsCreated: sessions.length,
    summary: {
      new: newTopics.map((m) => m.topic),
      weak: weakTopics.map((w) => w.topic),
      random: randomTopics.map((r) => r.topic),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Fetch subjects where the student's latest mastery is below 50%.
 */
async function identifyWeakSubjects(studentId: string): Promise<Map<string, Material[]>> {
  const snaps = await prisma.progressSnap.findMany({
    where: { studentId },
    orderBy: { snapDate: "desc" },
    distinct: ["subject"],
  });

  const weak = new Map<string, Material[]>();

  for (const snap of snaps) {
    if (snap.mastery < 0.5) {
      const materials = await prisma.material.findMany({
        where: { subject: snap.subject },
        orderBy: { weekOrder: "asc" },
        take: 3,
      });
      if (materials.length > 0) {
        weak.set(snap.subject, materials);
      }
    }
  }

  return weak;
}

function selectWeakAreaTopics(
  weakSubjects: Map<string, Material[]>,
  allMaterials: Material[],
  count: number,
): Array<{ topic: string; subject: string | null }> {
  const result: Array<{ topic: string; subject: string | null }> = [];
  const pool = allMaterials.filter(
    (m) => m.subject && weakSubjects.has(m.subject),
  );

  const seen = new Set<string>();
  for (const mat of pool) {
    if (result.length >= count) break;
    if (seen.has(mat.topic)) continue;
    seen.add(mat.topic);
    result.push({ topic: mat.topic, subject: mat.subject });
  }

  if (result.length < count) {
    for (const [subject] of weakSubjects) {
      if (result.length >= count) break;
      result.push({ topic: `Review ${subject}`, subject });
    }
  }

  return result;
}

function selectRandomTopics(
  unassigned: Material[],
  allMaterials: Material[],
  count: number,
  assignedTopics: Set<string>,
): Array<{ topic: string; subject: string | null }> {
  const result: Array<{ topic: string; subject: string | null }> = [];
  const seen = new Set<string>();
  const pool = [...unassigned, ...allMaterials];

  for (const mat of pool) {
    if (result.length >= count) break;
    if (seen.has(mat.topic) || assignedTopics.has(mat.topic)) continue;
    seen.add(mat.topic);
    result.push({ topic: mat.topic, subject: mat.subject });
  }

  return result;
}

function computeWeeklySlots(
  scheduleConfig: unknown,
  weekStart: Date,
): Array<{ start: Date }> {
  const config = (scheduleConfig ?? {}) as Record<string, unknown>;
  const customTimes = config.customTimes as Record<string, string> | undefined;
  const slots: Array<{ start: Date }> = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const day = addDays(weekStart, dayOffset);
    const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][day.getDay()];

    const exclude = config.excludeDays as string[] | undefined;
    if (exclude?.some((d) => d === dayName || d === String(day.getDay()))) continue;

    const sessionsPerDay = Math.min(
      (config.sessionsPerDay as number) ?? 1,
      MAX_SESSIONS_PER_DAY,
    );

    for (let i = 0; i < sessionsPerDay; i++) {
      let hour = 16;
      let minute = 0;

      if (customTimes?.[dayName]) {
        const [h, m] = customTimes[dayName].split(":").map(Number);
        if (!isNaN(h)) hour = h;
        if (!isNaN(m)) minute = m;
      }

      const slotTime = new Date(day);
      slotTime.setHours(hour + i, minute + i * 30, 0, 0);
      slots.push({ start: slotTime });
    }
  }

  return slots;
}
