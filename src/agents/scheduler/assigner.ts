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
import { buildProsemContext } from "@/lib/prosem-context";
import { getActiveCurriculumId } from "@/lib/curriculum-active";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const RATIO_NEW = 0.6;
const RATIO_WEAK = 0.3;
const RATIO_RANDOM = 0.1;

interface Slot {
  start: Date;
  dayType: "DAILY" | "INTENSIVE";
  durationMin: number;
}

const DEFAULT_DURATION = 30;

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
    select: {
      id: true,
      gradeLevel: true,
      scheduleConfig: true,
    },
  });

  if (!student) {
    console.error(`[scheduler/assigner] Student not found: ${studentId}`);
    return { sessionsCreated: 0, summary: { new: [], weak: [], random: [] } };
  }

  // 2. Gather available materials — ACTIVE curriculum only.
  //
  // This used to read across every curriculum the student owns. Raihan
  // (RAIHAN001) carries a stale v1 (264 materials) alongside v3 (228), so the
  // scheduler could pick a lesson the student is never shown, and the same topic
  // existed twice under two different weekOrders. See
  // `src/lib/curriculum-active.ts`.
  const activeCurriculumId = await getActiveCurriculumId(studentId);
  if (!activeCurriculumId) {
    console.warn(`[scheduler/assigner] No active curriculum for student=${studentId}`);
    return { sessionsCreated: 0, summary: { new: [], weak: [], random: [] } };
  }

  const availableMaterials = await prisma.material.findMany({
    where: {
      curriculumId: activeCurriculumId,
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
    },
    select: { topic: true, scheduledAt: true },
  });

  const assignedTopics = new Set<string>(
    existingSessions.map((s) => s.topic).filter((t): t is string => t !== null),
  );

  /**
   * Slots already occupied for this student.
   *
   * Guards against re-running the assign job for the same week, which used to
   * insert a second session at the exact same instant. Measured on the live DB
   * (2026-09-16): 30 duplicated (student, scheduledAt) pairs, one slot four
   * times over — every duplicate then aged into a permanent MISSED row and
   * inflated the "missed" count on the admin dashboard.
   *
   * Keyed by epoch ms because Prisma Date equality in a Set needs a primitive.
   */
  const takenSlots = new Set<number>(
    existingSessions.map((s) => s.scheduledAt.getTime()),
  );
  const unassignedMaterials = availableMaterials.filter(
    (m) => !assignedTopics.has(m.topic),
  );

  // 3. Identify weak subjects (mastery < 50%)
  const weakSubjects = await identifyWeakSubjects(studentId, activeCurriculumId);

  // 4. Compute available session slots
  const allSlots = computeWeeklySlots(student.scheduleConfig, weekStartDate);

  // Drop slots this student already has a session in. Combined with the
  // `assignedTopics` filter above, re-running the job for a week that was
  // already assigned is now a no-op instead of a duplicate generator.
  const slots = allSlots.filter((s) => !takenSlots.has(s.start.getTime()));

  // 5. Allocate 60/30/10
  const totalSlots = slots.length;
  const newCount = Math.round(totalSlots * RATIO_NEW);
  const weakCount = Math.round(totalSlots * RATIO_WEAK);
  const randomCount = totalSlots - newCount - weakCount;

  const newTopics = unassignedMaterials.slice(0, newCount);
  const usedTopics = new Set(assignedTopics);
  for (const m of newTopics) usedTopics.add(m.topic);

  // Lagging topics from the same prosem context the bot uses — the topics a
  // student should have covered in past weeks but hasn't mastered yet,
  // oldest week first. These drive the weak-area slots.
  const prosemCtx = await buildProsemContext({ id: student.id, gradeLevel: student.gradeLevel });
  const laggingTopics: Array<{ topic: string; subject: string; weekOrder: number }> = [];
  if (prosemCtx) {
    for (const s of prosemCtx.subjects) {
      for (const l of s.lagging) {
        laggingTopics.push({ topic: l.topic, subject: s.subject, weekOrder: l.weekOrder });
      }
    }
    laggingTopics.sort((a, b) => a.weekOrder - b.weekOrder);
  }
  const weakTopics = selectWeakAreaTopics(
    weakSubjects, availableMaterials, weakCount, laggingTopics, usedTopics,
  );
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
    const slot = slots[slotIdx];
    sessions.push({
      topic: mat.topic,
      subject: mat.subject,
      type: slot.dayType,
      scheduledAt: slot.start,
      durationMin: slot.durationMin,
    });
    slotIdx++;
  }

  for (const item of weakTopics) {
    if (slotIdx >= totalSlots) break;
    const slot = slots[slotIdx];
    sessions.push({
      topic: item.topic,
      subject: item.subject ?? null,
      type: slot.dayType,
      scheduledAt: slot.start,
      durationMin: slot.durationMin,
    });
    slotIdx++;
  }

  for (const item of randomTopics) {
    if (slotIdx >= totalSlots) break;
    const slot = slots[slotIdx];
    sessions.push({
      topic: item.topic,
      subject: item.subject ?? null,
      type: slot.dayType,
      scheduledAt: slot.start,
      durationMin: slot.durationMin,
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
async function identifyWeakSubjects(
  studentId: string,
  curriculumId: string,
): Promise<Map<string, Material[]>> {
  const snaps = await prisma.progressSnap.findMany({
    where: { studentId },
    orderBy: { snapDate: "desc" },
    distinct: ["subject"],
  });

  const weak = new Map<string, Material[]>();

  for (const snap of snaps) {
    if (snap.mastery < 0.5) {
      const materials = await prisma.material.findMany({
        where: {
          subject: snap.subject,
          curriculumId,
        },
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

export function selectWeakAreaTopics(
  weakSubjects: Map<string, Material[]>,
  allMaterials: Material[],
  count: number,
  laggingTopics: Array<{ topic: string; subject: string; weekOrder: number }> = [],
  usedTopics: Set<string> = new Set(),
): Array<{ topic: string; subject: string | null }> {
  const result: Array<{ topic: string; subject: string | null }> = [];
  const seen = new Set<string>();

  // Priority 1: prosem lagging topics — the exact same computed-from-DB list
  // the bot and web use (weekOrder < current week, mastery < 70, deduped per
  // topic). Oldest week first so the most overdue material gets scheduled
  // before recent catch-up topics.
  const sortedLagging = [...laggingTopics].sort((a, b) => a.weekOrder - b.weekOrder);
  for (const l of sortedLagging) {
    if (result.length >= count) break;
    if (seen.has(l.topic) || usedTopics.has(l.topic)) continue;
    seen.add(l.topic);
    result.push({ topic: l.topic, subject: l.subject });
  }

  // Fallback 1: materials of weak subjects (mastery < 50% snap) for any
  // remaining slots.
  const pool = allMaterials.filter(
    (m) => m.subject && weakSubjects.has(m.subject),
  );
  for (const mat of pool) {
    if (result.length >= count) break;
    if (seen.has(mat.topic) || usedTopics.has(mat.topic)) continue;
    seen.add(mat.topic);
    result.push({ topic: mat.topic, subject: mat.subject });
  }

  // Fallback 2: generic review labels.
  if (result.length < count) {
    for (const [subject] of weakSubjects) {
      if (result.length >= count) break;
      const label = `Review ${subject}`;
      if (seen.has(label)) continue;
      seen.add(label);
      result.push({ topic: label, subject });
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

export function computeWeeklySlots(
  scheduleConfig: unknown,
  weekStart: Date,
): Slot[] {
  const config = (scheduleConfig ?? {}) as Record<string, unknown>;
  const days: Record<string, Record<string, unknown>> | undefined = config.days as any;
  const slots: Slot[] = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const day = addDays(weekStart, dayOffset);
    const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][day.getDay()];
    const dayConfig = days?.[dayName];

    // Skip excluded days
    if (dayConfig?.exclude === true) continue;
    // Skip undefined days
    if (!dayConfig) continue;

    const startRaw = (dayConfig.start as string) ?? "19:00";
    const [h, m] = startRaw.split(":").map(Number);

    const slotTime = new Date(Date.UTC(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      (isNaN(h) ? 19 : h) - 7,  // WIB → UTC
      isNaN(m) ? 0 : m,
      0,
      0,
    ));

    slots.push({
      start: slotTime,
      dayType: (dayConfig.type as "DAILY" | "INTENSIVE") ?? "DAILY",
      durationMin: (dayConfig.duration as number) ?? 30,
    });
  }

  return slots;
}
