/**
 * Shared student progress + prosem (program semester) context builder.
 *
 * Used by BOTH:
 *   - src/bot/agent/tutor.ts   (context injection into the system prompt —
 *     via buildProsemContext in prosem-context.ts, same DB semantics)
 *   - src/bot/commands.ts      (/prosem command — deterministic text)
 *
 * All data is read directly from the DB + prosem JSON — zero LLM in the
 * computation, so every number the bot states is a real DB fact
 * (anti-hallucination by construction).
 *
 * NOTE: there are two shapes on purpose:
 *   - prosem-context.ts  → compact prompt block (tutor.ts)
 *   - this file          → structured per-subject view (/prosem command),
 *     including subjects WITHOUT prosem placement (hasProsem=false) so the
 *     command can show honest coverage.
 */
import { prisma } from "@/lib/prisma";
import { getCurrentSchoolWeek } from "@/lib/academic-calendar";

/** Ledger B-04: weekOrder 999 = unplaced sentinel. */
const UNPLACED = 999;
/** Same threshold as the subject page ("done" topic). */
export const TOPIC_DONE_THRESHOLD = 70;

export interface ProsemSubjectView {
  subject: string;
  /** True when at least one material of this subject carries a prosem weekOrder. */
  hasProsem: boolean;
  doneCount: number;
  totalCount: number;
  thisWeek: Array<{ topic: string; subTopic: string; done: boolean }>;
  behind: Array<{ topic: string; subTopic: string; weekOrder: number }>;
}

export interface StudentProsemContext {
  week: number;
  subjects: ProsemSubjectView[];
}

function isDone(mastery: number | undefined): boolean {
  return mastery !== undefined && mastery > 0 && mastery >= TOPIC_DONE_THRESHOLD;
}

export async function getStudentProsemContext(
  studentId: string,
  _gradeLevel?: string
): Promise<StudentProsemContext | null> {
  const week = getCurrentSchoolWeek();

  const curricula = await prisma.curriculum.findMany({
    where: { studentId },
    select: {
      materials: {
        select: { subject: true, topic: true, subTopic: true, weekOrder: true },
      },
    },
  });
  const materials = curricula.flatMap((c) => c.materials);
  if (materials.length === 0) return null;

  const masteries = await prisma.topicMastery.findMany({
    where: { studentId, subTopic: "" },
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

  const subjects: ProsemSubjectView[] = [];
  for (const [subject, mats] of bySubject) {
    const placed = mats.filter((m) => m.weekOrder > 0 && m.weekOrder < UNPLACED);
    const hasProsem = placed.length > 0;

    const thisWeek: ProsemSubjectView["thisWeek"] = [];
    const behindMap = new Map<string, { topic: string; subTopic: string; weekOrder: number }>();
    let doneCount = 0;
    let totalCount = 0;

    for (const m of placed) {
      const done = isDone(masteryByTopic.get(m.topic));
      if (m.weekOrder <= week) {
        totalCount++;
        if (done) doneCount++;
      }
      if (m.weekOrder === week) {
        thisWeek.push({ topic: m.topic, subTopic: m.subTopic ?? "", done });
      } else if (m.weekOrder < week && !done) {
        const cur = behindMap.get(m.topic);
        if (!cur || m.weekOrder < cur.weekOrder) {
          behindMap.set(m.topic, {
            topic: m.topic,
            subTopic: m.subTopic ?? "",
            weekOrder: m.weekOrder,
          });
        }
      }
    }

    subjects.push({
      subject,
      hasProsem,
      doneCount,
      totalCount,
      thisWeek: thisWeek.slice(0, 8),
      behind: Array.from(behindMap.values())
        .sort((a, b) => a.weekOrder - b.weekOrder)
        .slice(0, 6),
    });
  }

  if (subjects.length === 0) return null;
  subjects.sort((a, b) => a.subject.localeCompare(b.subject));
  return { week, subjects };
}

/**
 * Compact prompt-friendly rendering (kept for parity with the tutor.ts
 * injection — the command uses the structured view directly).
 */
export function formatProsemContextForPrompt(ctx: StudentProsemContext): string {
  const lines = ctx.subjects
    .filter((s) => s.hasProsem)
    .map((s) => {
      const parts = [
        `${s.subject}: minggu ini — ${
          s.thisWeek.map((m) => `${m.topic}${m.done ? " (selesai)" : ""}`).join("; ") || "-"
        }`,
      ];
      if (s.behind.length > 0) {
        parts.push(
          `tertinggal — ${s.behind.map((b) => `${b.topic} (minggu ${b.weekOrder})`).join("; ")}`
        );
      }
      parts.push(`progres jadwal ${s.doneCount}/${s.totalCount} selesai`);
      return `- ${parts.join(" | ")}`;
    });
  return (
    `KONTEKS PROSEM (minggu sekolah ke-${ctx.week}, data DB — faktual, jangan mengarang):\n` +
    lines.join("\n")
  );
}
