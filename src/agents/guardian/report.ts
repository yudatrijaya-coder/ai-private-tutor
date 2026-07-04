/**
 * Guardian — Weekly Report Generator
 *
 * Generate a weekly summary per student:
 * - Aggregate mastery by subject from ProgressSnap
 * - Identify weak areas (mastery < 50%)
 * - Count missed sessions
 * - Try LLM for personalized recommendation, fallback to template
 *
 * @module @/agents/guardian/report
 */

import { prisma } from "@/lib/prisma";
import { callLLM } from "@/llm/client";
import { getSystemPrompt } from "@/llm/prompts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SubjectSummary {
  subject: string;
  /** Latest mastery level 0.0 – 1.0 */
  mastery: number;
  quizzesTaken: number;
  totalScore: number;
  totalMax: number;
  studyMinutes: number;
}

export interface WeakArea {
  subject: string;
  topic?: string;
  mastery: number;
}

export interface WeeklyReport {
  studentId: string;
  studentName: string;
  periodStart: string; // ISO date
  periodEnd: string;   // ISO date
  summary: string;     // natural language summary
  subjects: SubjectSummary[];
  weakAreas: WeakArea[];
  missedSessions: number;
  recommendations: string[];
  generatedAt: string;
  llmGenerated: boolean;
}

/* ------------------------------------------------------------------ */
/*  Report generator                                                   */
/* ------------------------------------------------------------------ */

/** Mastery threshold below which a subject is considered a "weak area". */
const WEAK_MASTERY_THRESHOLD = 0.5;

/** Max characters of report data to send to the LLM. */
const LLM_INPUT_CHAR_LIMIT = 10_000;

/**
 * Generate a weekly progress report for a student.
 *
 * Steps:
 *   1. Fetch latest ProgressSnap per subject
 *   2. Count missed sessions in the period
 *   3. Identify weak areas (mastery < 50%)
 *   4. Try LLM for personalised recommendation, fallback to template
 *   5. Return the assembled report
 */
export async function generateWeeklyReport(
  studentId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<WeeklyReport> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, name: true },
  });
  if (!student) {
    throw new Error(`Student not found: ${studentId}`);
  }

  // 1. Aggregate mastery by subject from ProgressSnap
  const snaps = await prisma.progressSnap.findMany({
    where: {
      studentId,
      snapDate: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { snapDate: "desc" },
  });

  const subjectsMap = new Map<string, SubjectSummary>();
  for (const snap of snaps) {
    const existing = subjectsMap.get(snap.subject);
    if (!existing || snap.snapDate > new Date(existing.studyMinutes)) {
      // Keep the latest snap's mastery per subject
      subjectsMap.set(snap.subject, {
        subject: snap.subject,
        mastery: snap.mastery,
        quizzesTaken: snap.quizCount,
        totalScore: snap.totalScore,
        totalMax: snap.totalMax,
        studyMinutes: snap.studyMinutes,
      });
    }
  }
  const subjects = Array.from(subjectsMap.values());

  // 2. Count missed sessions
  const missedSessions = await prisma.scheduleSession.count({
    where: {
      studentId,
      scheduledAt: { gte: periodStart, lte: periodEnd },
      status: "MISSED",
    },
  });

  // 3. Identify weak areas
  const weakAreas: WeakArea[] = subjects
    .filter((s) => s.mastery < WEAK_MASTERY_THRESHOLD)
    .map((s) => ({ subject: s.subject, mastery: s.mastery }));

  // 4. Generate recommendations
  const { recommendations, llmGenerated } = await generateRecommendations(
    student.name,
    subjects,
    weakAreas,
    missedSessions,
  );

  // 5. Build summary text
  const summary = buildSummary(student.name, subjects, weakAreas, missedSessions);

  return {
    studentId,
    studentName: student.name,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    summary,
    subjects,
    weakAreas,
    missedSessions,
    recommendations,
    generatedAt: new Date().toISOString(),
    llmGenerated,
  };
}

/* ------------------------------------------------------------------ */
/*  Recommendation generation                                          */
/* ------------------------------------------------------------------ */

/**
 * Try LLM for personalised recommendation, fallback to template.
 */
async function generateRecommendations(
  studentName: string,
  subjects: SubjectSummary[],
  weakAreas: WeakArea[],
  missedSessions: number,
): Promise<{ recommendations: string[]; llmGenerated: boolean }> {
  try {
    const systemPrompt = getSystemPrompt("guardian");

    const subjectsText = subjects
      .map((s) => `- ${s.subject}: mastery ${(s.mastery * 100).toFixed(0)}%, ${s.quizzesTaken} quiz(es), ${s.studyMinutes} menit`)
      .join("\n");

    const weakText =
      weakAreas.length > 0
        ? weakAreas.map((w) => `- ${w.subject} (mastery ${(w.mastery * 100).toFixed(0)}%)`).join("\n")
        : "Tidak ada area lemah yang terdeteksi.";

    const prompt = `Buat rekomendasi belajar untuk ${studentName} selama seminggu ke depan.

Ringkasan minggu ini:
${subjectsText}

Area yang perlu perhatian:
${weakText}

Sesi terlewat: ${missedSessions}

Format output: berikan 3-5 poin rekomendasi dalam bahasa Indonesia, satu poin per baris, diawali dengan tanda "-".`;

    const raw = await callLLM("guardian", [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt.slice(0, LLM_INPUT_CHAR_LIMIT) },
    ]);

    if (raw && raw.trim().length > 0) {
      const recommendations = raw
        .split("\n")
        .map((l) => l.replace(/^[-*]\s*/, "").trim())
        .filter((l) => l.length > 0);
      return { recommendations, llmGenerated: true };
    }
  } catch (err) {
    console.warn(
      "[guardian/report] LLM recommendation failed, using template fallback:",
      err instanceof Error ? err.message : String(err),
    );
  }

  // Fallback template
  return {
    recommendations: getTemplateRecommendations(subjects, weakAreas, missedSessions),
    llmGenerated: false,
  };
}

/**
 * Template-based recommendations when LLM is unavailable.
 */
function getTemplateRecommendations(
  subjects: SubjectSummary[],
  weakAreas: WeakArea[],
  missedSessions: number,
): string[] {
  const recs: string[] = [];

  if (weakAreas.length > 0) {
    for (const w of weakAreas) {
      recs.push(`Fokus ulang materi ${w.subject} — mastery masih ${(w.mastery * 100).toFixed(0)}%. Coba ulangi kuis dan diskusikan dengan orang tua.`);
    }
  }

  if (missedSessions > 2) {
    recs.push(`Dalam seminggu terakhir ada ${missedSessions} sesi terlewat. Coba tetapkan jadwal belajar yang lebih konsisten.`);
  }

  const strongSubjects = subjects.filter((s) => s.mastery >= 0.8);
  for (const s of strongSubjects) {
    recs.push(`${s.subject} sudah bagus (${(s.mastery * 100).toFixed(0)}%). Lanjutkan dengan tantangan soal yang lebih sulit.`);
  }

  if (recs.length === 0) {
    recs.push("Pertahankan semangat belajar! Evaluasi minggu depan untuk melihat perkembangan.");
  }

  return recs;
}

/* ------------------------------------------------------------------ */
/*  Summary builder                                                    */
/* ------------------------------------------------------------------ */

/**
 * Build a short natural-language summary without LLM.
 */
function buildSummary(
  name: string,
  subjects: SubjectSummary[],
  weakAreas: WeakArea[],
  missedSessions: number,
): string {
  const avgMastery =
    subjects.length > 0
      ? (subjects.reduce((sum, s) => sum + s.mastery, 0) / subjects.length * 100).toFixed(0)
      : "N/A";

  let summary = `Ringkasan belajar ${name} minggu ini: `;
  summary += `rata-rata mastery ${avgMastery}%`;
  summary += subjects.length > 0 ? ` dari ${subjects.length} mata pelajaran.` : ".";

  if (weakAreas.length > 0) {
    summary += ` Perlu pendampingan di: ${weakAreas.map((w) => `${w.subject} (${(w.mastery * 100).toFixed(0)}%)`).join(", ")}.`;
  }

  if (missedSessions > 0) {
    summary += ` ${missedSessions} sesi terlewat minggu ini.`;
  }

  return summary;
}
