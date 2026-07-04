/**
 * Curriculum Service — generate draft curriculum, topic classification.
 *
 * @module @/agents/curriculum/service
 */

import { prisma } from "@/lib/prisma";
import { getQueue } from "@/queue/runner";
import { QUEUES } from "@/queue/definitions";

/* ------------------------------------------------------------------ */
/*  Grade-level topic maps                                             */
/* ------------------------------------------------------------------ */

interface TopicEntry {
  subject: string;
  topic: string;
  subTopic?: string;
  weekOrder: number;
  priority?: number;
}

const GRADE_TOPICS: Record<string, TopicEntry[]> = {
  SD_5: [
    { subject: "Matematika", topic: "Pecahan", subTopic: "Mengenal Pecahan", weekOrder: 1, priority: 10 },
    { subject: "Matematika", topic: "Penjumlahan", subTopic: "Penjumlahan Pecahan", weekOrder: 2, priority: 8 },
    { subject: "Bahasa Indonesia", topic: "Membaca Pemahaman", subTopic: "Ide Pokok", weekOrder: 1, priority: 10 },
    { subject: "IPA", topic: "Sistem Pencernaan", subTopic: "Organ Pencernaan", weekOrder: 2, priority: 7 },
  ],
  SMP_1: [
    { subject: "Matematika", topic: "Aljabar", subTopic: "Bentuk Aljabar", weekOrder: 1, priority: 10 },
    { subject: "Bahasa Inggris", topic: "Tenses", subTopic: "Simple Present", weekOrder: 1, priority: 10 },
    { subject: "IPA", topic: "Sistem Pernapasan", subTopic: "Organ Pernapasan", weekOrder: 2, priority: 7 },
    { subject: "IPS", topic: "Kerajaan Hindu-Buddha", subTopic: "Kerajaan Kutai", weekOrder: 3, priority: 5 },
  ],
  SMA_2: [
    { subject: "Matematika", topic: "Fungsi Komposisi", subTopic: "Definisi Fungsi", weekOrder: 1, priority: 10 },
    { subject: "Fisika", topic: "Hukum Newton", subTopic: "Hukum I Newton", weekOrder: 1, priority: 10 },
    { subject: "Kimia", topic: "Ikatan Kimia", subTopic: "Ikatan Ion", weekOrder: 2, priority: 7 },
    { subject: "Biologi", topic: "Sistem Ekskresi", subTopic: "Ginjal", weekOrder: 2, priority: 7 },
  ],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getGradeTopics(grade: string): TopicEntry[] {
  return GRADE_TOPICS[grade] ?? [];
}

const VIDEO_SUBJECTS = new Set(["IPA", "Fisika", "Biologi", "Kimia"]);

function classifyDelivery(topic: { subject: string }): "TEXT" | "TEXT_AND_VIDEO" {
  return VIDEO_SUBJECTS.has(topic.subject) ? "TEXT_AND_VIDEO" : "TEXT";
}

function serializeGradeLevel(grade: string): "SD_5" | "SMP_1" | "SMA_2" {
  if (grade === "SD_5" || grade === "SMP_1" || grade === "SMA_2") return grade;
  throw new Error(`Invalid grade level: ${grade}`);
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Generate an initial curriculum draft for a newly enrolled student.
 *
 * Admission trigger — called by Guardian Agent when a new student is enrolled.
 *
 * 1. Looks up hardcoded topic lists per grade level
 * 2. Creates Curriculum + Material records in DRAFT status
 * 3. Queues content scraping for all week_1 materials
 */
export async function generateCurriculumDraft(studentId: string): Promise<void> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error("Student not found");

  const topics = getGradeTopics(student.gradeLevel);

  if (topics.length === 0) {
    console.warn(
      `[curriculum/service] No topic mapping for grade=${student.gradeLevel}; skipping curriculum generation`,
    );
    return;
  }

  // 1. Create curriculum + materials in DRAFT status
  const curriculum = await prisma.curriculum.create({
    data: {
      studentId,
      gradeLevel: serializeGradeLevel(student.gradeLevel),
      version: 1,
      changelog: "Initial curriculum draft",
      materials: {
        create: topics.map((t) => ({
          topic: t.topic,
          subTopic: t.subTopic,
          subject: t.subject,
          gradeLevel: serializeGradeLevel(student.gradeLevel),
          weekOrder: t.weekOrder,
          priority: t.priority ?? 0,
          delivery: classifyDelivery(t),
          status: "DRAFT",
        })),
      },
    },
    include: { materials: true },
  });

  console.log(
    `[curriculum/service] Created curriculum=${curriculum.id} with ${curriculum.materials.length} material(s) for student=${studentId}`,
  );

  // 2. Queue content scraping for week_1 materials
  const weekOneMaterials = curriculum.materials.filter((m) => m.weekOrder === 1);
  const queue = getQueue(QUEUES.CONTENT_SCRAPE.name);

  for (const material of weekOneMaterials) {
    const jobId = await queue.add("scrape", {
      materialId: material.id,
      topic: material.topic,
      subTopic: material.subTopic ?? undefined,
      gradeLevel: material.gradeLevel,
      sources: [],
    });

    console.log(
      `[curriculum/service] Enqueued content:scrape job=${jobId.id} for material=${material.id}`,
    );
  }
}
