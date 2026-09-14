import { PROSEM_PLANS } from "@/data/prosem-index";

export interface ProsemWeek {
  week: number;
  hours: number;
}
export interface ProsemEntry {
  topic: string;
  subtopic: string;
  weeks: ProsemWeek[];
}
export interface ProsemPlan {
  source: string;
  subject: string;
  grade: string;
  semester: string; // "ganjil" | "genap" (loose: JSON imports infer string)
  entries: ProsemEntry[];
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const GRADE_MAP: Record<string, string> = {
  SD_5: "V",
  SMP_1: "VII",
  SMA_2: "XI",
};

/** Ganjil = Juli–Desember, genap = Januari–Juni. */
export function currentSemester(date: Date = new Date()): "ganjil" | "genap" {
  return date.getMonth() + 1 >= 7 ? "ganjil" : "genap";
}

/**
 * Find the prosem plan for a subject + grade level.
 * Prefers the current semester's plan; falls back to any plan for the subject.
 * Returns null when no plan exists (e.g. scan-only PDF or subject not offered).
 */
export function getProsem(subject: string, gradeLevel?: string): ProsemPlan | null {
  const grade = gradeLevel ? GRADE_MAP[gradeLevel] : undefined;
  if (!grade) return null;
  const n = norm(subject);
  const candidates = PROSEM_PLANS.filter((p) => norm(p.subject) === n && p.grade === grade);
  if (candidates.length === 0) return null;
  const sem = currentSemester();
  return candidates.find((p) => p.semester === sem) ?? candidates[0];
}

/** Group flat prosem entries by topic, keeping first-appearance order. */
export function groupProsemByTopic(entries: ProsemEntry[]): { topic: string; items: ProsemEntry[] }[] {
  const groups: { topic: string; items: ProsemEntry[] }[] = [];
  for (const e of entries) {
    const t = e.topic || "(tanpa topik)";
    const last = groups[groups.length - 1];
    if (last && last.topic === t) {
      last.items.push(e);
    } else {
      groups.push({ topic: t, items: [e] });
    }
  }
  return groups;
}
