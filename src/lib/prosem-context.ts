/**
 * Deterministic prosem + progress context for the tutor bot.
 *
 * Approach A (context injection): every fact the bot may state about the
 * student's schedule or progress is COMPUTED from the DB here and injected
 * into the system prompt as a facts block. The LLM narrates but cannot
 * invent numbers that are not in this block.
 *
 * Threshold and semantics mirror the subject page's completion badge:
 * TopicMastery.mastery is 0-100, "done" at >= 70.
 */
import { prisma } from "@/lib/prisma";
import { getCurrentSchoolWeek } from "@/lib/academic-calendar";

const UNPLACED = 999;
const TOPIC_DONE_THRESHOLD = 70;

interface SubjectStatus {
  subject: string;
  /** Materials scheduled at/before this week (weekOrder <= week, placed). */
  scheduledDone: number;
  scheduledTotal: number;
  /** Materials for exactly this week. */
  thisWeek: Array<{ topic: string; subTopic: string; done: boolean }>;
  /** Past-week materials still not done (catch-up). */
  lagging: Array<{ topic: string; weekOrder: number }>;
}

export interface ProsemBotContext {
  week: number;
  subjects: SubjectStatus[];
  /** Compact summary line for the prompt. */
  summary: string;
}

function isDone(mastery: number | undefined): boolean {
  return mastery !== undefined && mastery > 0 && mastery >= TOPIC_DONE_THRESHOLD;
}

export async function buildProsemContext(student: {
  id: string;
  gradeLevel: string;
}): Promise<ProsemBotContext | null> {
  const week = getCurrentSchoolWeek();

  const curricula = await prisma.curriculum.findMany({
    where: { studentId: student.id },
    select: {
      materials: {
        select: { subject: true, topic: true, subTopic: true, weekOrder: true },
      },
    },
  });
  const materials = curricula.flatMap((c) => c.materials);
  if (materials.length === 0) return null;

  const masteries = await prisma.topicMastery.findMany({
    where: { studentId: student.id, subTopic: "" },
    select: { subject: true, topic: true, mastery: true },
  });
  const masteryByTopic = new Map<string, number>();
  for (const m of masteries) {
    if (!masteryByTopic.has(m.topic)) masteryByTopic.set(m.topic, m.mastery);
  }

  const bySubject = new Map<string, typeof materials>();
  for (const m of materials) {
    const list = bySubject.get(m.subject) ?? [];
    list.push(m);
    bySubject.set(m.subject, list);
  }

  const subjects: SubjectStatus[] = [];
  for (const [subject, mats] of bySubject) {
    const placed = mats.filter((m) => m.weekOrder < UNPLACED && m.weekOrder > 0);
    if (placed.length === 0) continue;

    const thisWeek: SubjectStatus["thisWeek"] = [];
    const lagging: SubjectStatus["lagging"] = [];
    let scheduledDone = 0;

    for (const m of placed) {
      const done = isDone(masteryByTopic.get(m.topic));
      if (m.weekOrder === week) {
        thisWeek.push({
          topic: m.topic,
          subTopic: m.subTopic ?? "",
          done,
        });
      } else if (m.weekOrder < week && !done) {
        lagging.push({ topic: m.topic, weekOrder: m.weekOrder });
      }
      if (m.weekOrder <= week && done) scheduledDone++;
    }

    // Dedupe lagging by topic (multiple subtopics of one topic land in
    // different weeks) — keep the earliest week, which is the real catch-up
    // priority.
    const laggingByTopic = new Map<string, { topic: string; weekOrder: number }>();
    for (const l of lagging) {
      const cur = laggingByTopic.get(l.topic);
      if (!cur || l.weekOrder < cur.weekOrder) laggingByTopic.set(l.topic, l);
    }

    subjects.push({
      subject,
      scheduledDone,
      scheduledTotal: placed.filter((m) => m.weekOrder <= week).length,
      thisWeek: thisWeek.slice(0, 5),
      lagging: Array.from(laggingByTopic.values())
        .sort((a, b) => a.weekOrder - b.weekOrder)
        .slice(0, 4),
    });
  }

  if (subjects.length === 0) return null;

  const lines: string[] = [];
  for (const s of subjects) {
    const weekItems = s.thisWeek
      .map((m) => `${m.topic}${m.done ? " (selesai)" : ""}`)
      .join("; ");
    const parts = [`${s.subject}: minggu ini — ${weekItems || "-"}`];
    if (s.lagging.length > 0) {
      parts.push(
        `tertinggal — ${s.lagging.map((l) => `${l.topic} (minggu ${l.weekOrder})`).join("; ")}`
      );
    }
    parts.push(`progres jadwal ${s.scheduledDone}/${s.scheduledTotal} selesai`);
    lines.push(parts.join(" | "));
  }

  return {
    week,
    subjects,
    summary:
      `KONTEKS PROSEM (minggu sekolah ke-${week}, data DB — faktual, jangan mengarang):\n` +
      lines.map((l) => `- ${l}`).join("\n") +
      "\nGunakan untuk memancing siswa mengerjakan materi minggu ini / mengejar yang tertinggal. Jangan menggurui.",
  };
}
