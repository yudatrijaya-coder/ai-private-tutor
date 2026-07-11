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

    const raw = await Promise.race([
      callLLM("guardian", [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Buat 3 rekomendasi belajar personal untuk ${studentName} minggu depan berdasarkan data berikut.

Data minggu ini:
${subjectsText}

Area lemah:
${weakText}

Sesi terlewat: ${missedSessions}

ATURAN:
- Langsung tulis rekomendasi, TANPA preamble, TANPA <think>, TANPA markdown
- Satu rekomendasi per baris
- Jangan pakai tanda "-" atau "*" di awal baris
- Fokus pada actionable steps spesifik, bukan saran umum
- Bahasa Indonesia hangat seperti orang tua bicara ke anaknya`,
        },
      ]),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("LLM timeout after 25s")), 25_000),
      ),
    ]);

    if (raw && raw.trim().length > 0) {
      // Strip <think> blocks and clean markdown
      const cleaned = raw
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .replace(/\*\*/g, "")
        .replace(/^[-*\s]+/gm, "")
        .trim();
      const recommendations = cleaned
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (recommendations.length >= 1) {
        return { recommendations: recommendations.slice(0, 5), llmGenerated: true };
      }
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
 * Falls back to rule-based suggestions derived from actual data.
 */
function getTemplateRecommendations(
  subjects: SubjectSummary[],
  weakAreas: WeakArea[],
  missedSessions: number,
): string[] {
  const recs: string[] = [];

  for (const w of weakAreas) {
    const pct = (w.mastery * 100).toFixed(0);
    const templates = [
      `Coba ulang materi ${w.subject} pelan-pelan ya, mastery masih ${pct}%. Baca ulang ringkasannya, lalu kerjakan latihan soalnya.`,
      `${w.subject} perlu sedikit perhatian lebih (${pct}%). Ajak anak diskusi tentang materi yang dirasa sulit, lalu coba kuis lagi.`,
      `Untuk ${w.subject} yang masih ${pct}%, coba gunakan flashcards atau gambar untuk membantu mengingat konsepnya.`,
    ];
    recs.push(templates[Math.floor(Math.random() * templates.length)]);
  }

  if (missedSessions > 2) {
    recs.push(`Sudah ${missedSessions} sesi terlewat minggu ini. Coba buat jadwal belajar rutin setiap hari, misal 15 menit setelah mandi sore.`);
  } else if (missedSessions > 0) {
    recs.push(`Ada ${missedSessions} sesi terlewat. Yuk ajak anak komitmen belajar setiap hari walau cuma sebentar.`);
  }

  for (const s of subjects) {
    const pct = Math.round(s.mastery * 100);
    if (pct >= 80) {
      recs.push(`${s.subject} sudah mantap (${pct}%). Tantang anak dengan soal cerita yang lebih menantang biar tambah jago!`);
    } else if (pct >= 50 && pct < 80) {
      recs.push(`${s.subject} sudah cukup baik (${pct}%). Lanjutkan belajar rutin, dan coba bahas soal-soal yang lebih variatif.`);
    }
  }

  if (recs.length === 0) {
    recs.push("Pertahankan semangat belajar! Yuk minggu depan coba target belajar lebih rutin lagi.");
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
