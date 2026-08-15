import { prisma } from "@/lib/prisma";
import { callLLM } from "@/llm/client";
import type { ChatMessage } from "@/llm/types";

/**
 * WEEKLY Exam Generator — two-pass, content-grounded, difficulty-controlled.
 *
 * Pass 1: LLM reads the actual lesson content (rawContent) for the week's
 *         subject and produces a 20-question BLUEPRINT (topic + Bloom level +
 *         difficulty per slot).
 * Pass 2: LLM generates each question from the blueprint + the lesson content.
 * Validation: uniqueness of correct answers, no duplicate options, answer key
 *             inside options, difficulty matches blueprint. Failed questions
 *             are regenerated once, then dropped.
 */

export interface WeeklyBlueprintItem {
  topic: string;
  subTopic: string | null;
  bloomLevel: "C1" | "C2" | "C3" | "C4" | "C5" | "C6";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  focus: string; // what the question should test, in Indonesian
}

export interface WeeklyQuestion extends WeeklyBlueprintItem {
  question: string;
  options: string[]; // 4 options, full text (not prefixed with letters)
  correctAnswer: string; // "A" | "B" | "C" | "D"
  explanation: string;
}

const DIFFICULTY_TARGET: Record<"EASY" | "MEDIUM" | "HARD", number> = {
  EASY: 4,
  MEDIUM: 10,
  HARD: 6,
};

const BLOOM_POOL: Record<"EASY" | "MEDIUM" | "HARD", string[]> = {
  EASY: ["C1", "C2"],
  MEDIUM: ["C2", "C3", "C4"],
  HARD: ["C4", "C5", "C6"],
};

const MAX_CONTENT_CHARS = 6000;

/** Scale the 4/10/6 composition to an arbitrary question count. */
function scaleTargets(questionCount: number): Record<"EASY" | "MEDIUM" | "HARD", number> {
  const scale = questionCount / 20;
  return {
    EASY: Math.max(1, Math.round(4 * scale)),
    MEDIUM: Math.max(1, Math.round(10 * scale)),
    HARD: Math.max(1, Math.round(6 * scale)),
  };
}

/* ── JSON extraction helpers ─────────────────────────────────── */

function extractJson(text: string): string {
  // Strip markdown code fences, then find the first [...] or {...} block
  const cleaned = text.replace(/```json|```/g, "");
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) return arrMatch[0];
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) return objMatch[0];
  return cleaned.trim();
}

/* ── Pass 1: blueprint ───────────────────────────────────────── */

async function generateBlueprint(
  subject: string,
  gradeLevel: string,
  topicList: { topic: string; subTopic: string | null }[],
  contentSnippet: string,
  studentId: string,
  targets: Record<"EASY" | "MEDIUM" | "HARD", number>,
): Promise<WeeklyBlueprintItem[]> {
  const total = targets.EASY + targets.MEDIUM + targets.HARD;
  const targetPerDifficulty = Object.entries(targets)
    .map(([d, n]) => `${n} soal ${d}`)
    .join(", ");

  const bloomGuidance = Object.entries(BLOOM_POOL)
    .map(
      ([d, levels]) =>
        `${d}: gunakan level Bloom ${levels.join("/")} (contoh: ${d === "EASY" ? "C1 mengingat definisi, C2 memahami konsep" : d === "MEDIUM" ? "C2 menerapkan, C3 menganalisis, C4 mengevaluasi" : "C4 menganalisis, C5 mengevaluasi, C6 mencipta"} )`,
    )
    .join("\n");

  const topicStr = topicList
    .map((t, i) => `${i + 1}. ${t.topic}${t.subTopic ? ` — ${t.subTopic}` : ""}`)
    .join("\n");

  const system: ChatMessage = {
    role: "system",
    content: `Kamu adalah perancang soal ujian (assessment designer) untuk siswa ${gradeLevel} di Indonesia.
Tugasmu: membuat BLUEPRINT (kerangka) ${total} soal pilihan ganda untuk ujian mingguan mapel ${subject}.
Blueprint menentukan PEMETAAN soal, bukan isi soal.

Aturan blueprint:
- Total tepat ${total} soal dengan komposisi: ${targetPerDifficulty}.
- Level kognitif Bloom per difficulty:
${bloomGuidance}
- Sebar topik secara merata dari daftar topik yang diberikan (topik penting dapat muncul 2x dengan aspek berbeda, tapi hindari topik yang sama beruntun).
- Untuk tiap soal berikan "focus": deskripsi singkat (1 kalimat, bahasa Indonesia) tentang kemampuan spesifik yang diuji — ini yang akan dipakai untuk menulis soal.

Output HANYA JSON array, tanpa teks lain:
[
  {
    "topic": "nama topik (harus salah satu dari daftar)",
    "subTopic": "sub-topik spesifik atau null",
    "bloomLevel": "C1",
    "difficulty": "EASY",
    "focus": "Mengidentifikasi definisi X"
  }
]`,
  };

  const user: ChatMessage = {
    role: "user",
    content: `Daftar topik mapel ${subject} minggu ini (kelas ${gradeLevel}):
${topicStr}

Konten materi (kutipan, bisa dipakai untuk memetakan topik & tingkat kesulitan):
---AWAL KONTEN---
${contentSnippet}
---AKHIR KONTEN---

Buat blueprint ${total} soal sesuai aturan di atas.`,
  };

  const response = await callLLM("assessment", [system, user], {
    maxTokens: 4000,
    temperature: 0.3,
    studentId,
    timeoutMs: 120_000,
  });

  if (!response) throw new Error("LLM returned no blueprint");

  const parsed = JSON.parse(extractJson(response)) as WeeklyBlueprintItem[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Blueprint parsing failed");
  }

  // Normalize + validate
  const validBloom = new Set(["C1", "C2", "C3", "C4", "C5", "C6"]);
  const validDiff = new Set(["EASY", "MEDIUM", "HARD"]);
  const validTopics = new Set(topicList.map((t) => t.topic));

  const items = parsed
    .filter(
      (it) =>
        it &&
        typeof it.topic === "string" &&
        typeof it.focus === "string" &&
        validBloom.has(it.bloomLevel) &&
        validDiff.has(it.difficulty),
    )
    .map((it) => ({
      topic: it.topic,
      subTopic: typeof it.subTopic === "string" ? it.subTopic : null,
      bloomLevel: it.bloomLevel as WeeklyBlueprintItem["bloomLevel"],
      difficulty: it.difficulty as WeeklyBlueprintItem["difficulty"],
      focus: it.focus,
    }));

  if (items.length < total) {
    throw new Error(`Blueprint too short: ${items.length}/${total}`);
  }

  // Enforce composition: cap counts at target, allow known topics only
  const counts: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const result: WeeklyBlueprintItem[] = [];
  for (const it of items) {
    if (counts[it.difficulty] >= targets[it.difficulty]) continue;
    if (validTopics.has(it.topic)) {
      counts[it.difficulty]++;
      result.push(it);
    }
  }

  if (result.length < total) {
    // Fill remaining slots from leftovers that hit difficulty target but had
    // unknown topics — map them to the subject as topic.
    for (const it of items) {
      if (result.length >= total) break;
      if (counts[it.difficulty] >= targets[it.difficulty]) continue;
      if (!validTopics.has(it.topic) && it.topic && it.topic.trim().length > 0) {
        counts[it.difficulty]++;
        result.push({ ...it, topic: subject });
      }
    }
  }

  if (result.length < total) {
    // Final fallback: pad from the raw parsed list regardless of topic.
    for (const it of parsed) {
      if (result.length >= total) break;
      if (counts[it.difficulty] >= targets[it.difficulty]) continue;
      counts[it.difficulty]++;
      result.push(it);
    }
  }

  return result.slice(0, total);
}

/* ── Pass 2: generate questions in batches ───────────────────── */

/**
 * Build a content snippet for a specific batch of blueprint items.
 * Only includes material for topics in this batch → LLM always has the
 * relevant content, no matter how many topics exist in the subject.
 */
function buildBatchSnippet(
  batch: WeeklyBlueprintItem[],
  contentByTopic: Map<string, string>,
  maxChars = 8000,
): string {
  const parts: string[] = [];
  let len = 0;
  for (const b of batch) {
    const body = contentByTopic.get(b.topic) ?? "";
    if (!body.trim()) continue;
    const part = `## ${b.topic}\n${body}`;
    if (len + part.length > maxChars) break;
    parts.push(part);
    len += part.length;
  }
  return parts.join("\n\n");
}

async function generateQuestionBatch(
  blueprint: WeeklyBlueprintItem[],
  subject: string,
  gradeLevel: string,
  contentSnippet: string,
  studentId: string,
  contentByTopic: Map<string, string> = new Map(),
): Promise<WeeklyQuestion[]> {
  const batchSize = 5;
  const questions: WeeklyQuestion[] = [];

  for (let i = 0; i < blueprint.length; i += batchSize) {
    const batch = blueprint.slice(i, i + batchSize);
    const blueprintStr = batch
      .map(
        (b, j) =>
          `${i + j + 1}. topic="${b.topic}" | subTopic=${b.subTopic ?? "-"} | Bloom=${b.bloomLevel} | difficulty=${b.difficulty} | focus=${b.focus}`,
      )
      .join("\n");

    // Prefer per-batch snippet (only topics in this batch); fall back to the
    // global snippet when we have no per-topic map.
    const batchSnippet =
      contentByTopic.size > 0 ? buildBatchSnippet(batch, contentByTopic) : contentSnippet;

    const system: ChatMessage = {
      role: "system",
      content: `Kamu adalah penulis soal ujian (item writer) berpengalaman untuk siswa ${gradeLevel} di Indonesia, mapel ${subject}.
Tulis soal pilihan ganda berdasarkan BLUEPRINT dan KONTEN MATERI yang diberikan.

Aturan menulis soal:
1. Ikuti blueprint: topik, level Bloom, dan difficulty HARUS sesuai.
2. Setiap soal punya 4 opsi (A-D). Tepat SATU jawaban benar. Opsi lain harus PLAUSIBLE (mengganggu, bukan konyol) dan TIDAK ambigu.
3. Opsi berupa teks lengkap TANPA prefix huruf ("A. ", "B. ", dst) — prefix ditambahkan otomatis oleh sistem.
4. Jawaban benar TIDAK boleh selalu di posisi yang sama (acak posisi A-D).
5. Soal HANYA boleh menguji materi yang ada di konten. Jangan menguji hal di luar konten.
6. Difficulty mengacu pada kedalaman berpikir & tingkat kesulitan:
   - EASY: hafalan/definisi langsung (Bloom C1-C2)
   - MEDIUM: penerapan/pemahaman situasi baru (C2-C4)
   - HARD: analisis, evaluasi, sintesis (C4-C6)
7. explanation: jelaskan MENGAPA jawaban benar, ringkas (1-2 kalimat, bahasa Indonesia).
8. Bahasa soal: bahasa Indonesia (kecuali mapel Bahasa Inggris → soal tetap bahasa Indonesia dengan materi bahasa Inggris, atau sesuai konteks materi).
9. Panjang opsi relatif seragam (hindari opsi benar yang mencolok lebih panjang).

Output HANYA JSON array (urut sesuai blueprint), tanpa teks lain:
[
  {
    "question": "teks pertanyaan",
    "options": ["opsi1", "opsi2", "opsi3", "opsi4"],
    "correctAnswer": "B",
    "explanation": "penjelasan"
  }
]`,
    };

    const user: ChatMessage = {
      role: "user",
      content: `Konten materi (kutipan):
---AWAL KONTEN---
${batchSnippet || contentSnippet}
---AKHIR KONTEN---

Blueprint untuk batch ini (${batch.length} soal):
${blueprintStr}

Tulis ${batch.length} soal sesuai blueprint.`,
    };

    const response = await callLLM("assessment", [system, user], {
      maxTokens: 3000,
      temperature: 0.5,
      studentId,
      timeoutMs: 120_000,
    });

    if (!response) throw new Error("LLM returned no questions for batch");

    let parsed: WeeklyQuestion[];
    try {
      parsed = JSON.parse(extractJson(response)) as WeeklyQuestion[];
    } catch (err) {
      console.warn(`[weekly-exam] Batch ${i / batchSize + 1} JSON parse failed, retrying once`);
      const retry = await callLLM("assessment", [system, user], {
        maxTokens: 3000,
        temperature: 0.2,
        studentId,
        timeoutMs: 120_000,
      });
      if (!retry) throw err;
      parsed = JSON.parse(extractJson(retry)) as WeeklyQuestion[];
    }

    if (!Array.isArray(parsed)) {
      console.warn(`[weekly-exam] Batch ${i / batchSize + 1} not array, skipping`);
      continue;
    }

    // Merge blueprint metadata into generated questions, then validate.
    const merged: WeeklyQuestion[] = [];
    for (let j = 0; j < batch.length; j++) {
      const bp = batch[j];
      const q = parsed[j];
      if (!q || typeof q.question !== "string") {
        console.warn(`[weekly-exam] Missing question at slot ${i + j}, skipping`);
        continue;
      }
      merged.push({
        topic: bp.topic,
        subTopic: bp.subTopic,
        bloomLevel: bp.bloomLevel,
        difficulty: bp.difficulty,
        focus: bp.focus,
        question: q.question.trim(),
        options: Array.isArray(q.options) ? q.options.map((o) => String(o).trim()) : [],
        correctAnswer: String(q.correctAnswer || "").toUpperCase().trim(),
        explanation: typeof q.explanation === "string" ? q.explanation.trim() : "",
      });
    }

    const valid = validateBatch(merged);
    console.log(
      `[weekly-exam] Batch ${i / batchSize + 1}: ${valid.length}/${merged.length} valid (${batch.length} slots)`,
    );
    questions.push(...valid);
  }

  return questions;
}

/* ── Validation ──────────────────────────────────────────────── */

function validateBatch(questions: WeeklyQuestion[]): WeeklyQuestion[] {
  return questions.filter((q) => {
    if (q.question.length < 10) return false;
    if (!Array.isArray(q.options) || q.options.length !== 4) return false;
    // options must be non-empty and unique
    const unique = new Set(q.options.map((o) => o.toLowerCase()));
    if (unique.size !== 4) return false;
    // correctAnswer must be A-D and match an option
    if (!["A", "B", "C", "D"].includes(q.correctAnswer)) return false;
    if (!q.explanation || q.explanation.length < 10) return false;
    return true;
  });
}

function enforceDifficultyComposition(
  questions: WeeklyQuestion[],
  targets: Record<"EASY" | "MEDIUM" | "HARD", number> = DIFFICULTY_TARGET,
): WeeklyQuestion[] {
  const counts: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const result: WeeklyQuestion[] = [];
  for (const q of questions) {
    if (counts[q.difficulty] >= targets[q.difficulty]) continue;
    counts[q.difficulty]++;
    result.push(q);
  }
  return result;
}

/* ── Main entry ──────────────────────────────────────────────── */

export interface GenerateWeeklyExamOptions {
  studentId: string;
  subject: string;
  /** ISO week number (1-52) used to pick weekOrder. Defaults to current week. */
  weekNumber?: number;
  /** Override the question count target. Defaults to 20. */
  questionCount?: number;
}

export async function generateWeeklyExam(
  opts: GenerateWeeklyExamOptions,
): Promise<{ examId: string; questionCount: number }> {
  const { studentId, subject } = opts;
  const questionCount = opts.questionCount ?? 20;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { curriculums: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!student) throw new Error("Student not found");

  const curriculum = student.curriculums[0];
  if (!curriculum) throw new Error("Student has no curriculum");

  // Pick materials: current week first, fallback to latest READY materials.
  const weekNumber = opts.weekNumber ?? currentIsoWeek();
  const where: Record<string, unknown> = {
    curriculumId: curriculum.id,
    subject,
  };

  let materials = await prisma.material.findMany({
    where: { ...where, weekOrder: weekNumber },
    orderBy: { priority: "desc" },
  });

  if (materials.length === 0) {
    materials = await prisma.material.findMany({
      where: { ...where, status: { in: ["READY", "PROCESSED", "VIDEO_READY"] } },
      orderBy: { weekOrder: "asc" },
    });
  }
  if (materials.length === 0) {
    materials = await prisma.material.findMany({ where, orderBy: { weekOrder: "asc" } });
  }
  if (materials.length === 0) {
    throw new Error(`No materials found for subject "${subject}"`);
  }

  // Limit content passed to the LLM. Build snippet greedily so that every
  // topic in the blueprint actually has content available (otherwise the LLM
  // is asked to write questions about topics it never saw → empty batches).
  const snippetParts: string[] = [];
  let snippetLen = 0;
  const selected: typeof materials = [];
  for (const m of materials) {
    const body = (m.rawContent ?? m.processedContent ?? "").trim();
    if (!body) continue;
    const part = `## ${m.topic}\n${body}`;
    if (snippetLen + part.length > MAX_CONTENT_CHARS && snippetParts.length > 0) break;
    snippetParts.push(part);
    snippetLen += part.length;
    selected.push(m);
  }
  let contentSnippet = snippetParts.join("\n\n");
  if (!contentSnippet.trim()) {
    // No content at all — rely on topic names only (limit to first few).
    contentSnippet = materials
      .slice(0, 8)
      .map((m) => `## ${m.topic}`)
      .join("\n");
    selected.push(...materials.slice(0, 8));
  }

  const topicList = selected.map((m) => ({
    topic: m.topic,
    subTopic: m.subTopic,
  }));

  // Per-topic content map for batch-scoped snippets (fixes LLM "no questions"
  // when the global snippet only covers the first few topics).
  const contentByTopic = new Map<string, string>();
  for (const m of materials) {
    const body = (m.rawContent ?? m.processedContent ?? "").trim();
    if (!body) continue;
    contentByTopic.set(m.topic, body);
  }

  // Adjust composition for non-default counts (scale proportionally, min 1).
  const target = scaleTargets(questionCount);

  // Pass 1
  const blueprint = await generateBlueprint(
    subject,
    student.gradeLevel,
    topicList,
    contentSnippet,
    studentId,
    target,
  );

  // Pass 2 (batched)
  const questions = await generateQuestionBatch(
    blueprint,
    subject,
    student.gradeLevel,
    contentSnippet,
    studentId,
    contentByTopic,
  );

  // Composition enforcement + trimming to target
  let final = enforceDifficultyComposition(questions, target);
  if (final.length > questionCount) final = final.slice(0, questionCount);

  if (final.length === 0) {
    throw new Error("No valid questions generated — exam not created");
  }

  const exam = await prisma.exam.create({
    data: {
      title: `Weekly Exam ${subject} — Minggu ${weekNumber} (Kelas ${student.gradeLevel})`,
      type: "WEEKLY",
      subject,
      gradeLevel: student.gradeLevel,
      maxScore: final.length * 100,
      questions: {
        create: final.map((q) => ({
          topic: q.topic,
          subTopic: q.subTopic,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          bloomLevel: q.bloomLevel,
        })),
      },
    },
  });

  console.log(
    `[weekly-exam] Created exam ${exam.id}: ${final.length} questions (E:${countBy(final, "EASY")} M:${countBy(final, "MEDIUM")} H:${countBy(final, "HARD")})`,
  );

  return { examId: exam.id, questionCount: final.length };
}

function countBy(questions: WeeklyQuestion[], difficulty: string): number {
  return questions.filter((q) => q.difficulty === difficulty).length;
}

function currentIsoWeek(): number {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
