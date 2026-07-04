/**
 * Curriculum Review Worker — BullMQ processor for the `curriculum:review` queue.
 *
 * For each material with fresh scraped content (status=RAW):
 *   1. Load the material's rawContent and metadata
 *   2. Call LLM to verify content relevance vs expected topic
 *   3. If approved: status=PROCESSED, enqueue assessment:generate & media:render
 *   4. If rejected: retry (re-enqueue content:scrape with alternative sources) or flag for manual review
 *
 * @module @/agents/curriculum/worker
 */

import type { Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import type { CurriculumReviewJobPayload } from "@/queue/definitions";
import { QUEUES } from "@/queue/definitions";
import { getQueue, enqueue } from "@/queue/runner";
import { callLLM } from "@/llm/client";
import { getSystemPrompt } from "@/llm/prompts";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Max times a material can be sent back for re-scrape before manual flag. */
const MAX_SCRAPE_RETRIES = 2;

/** LLM prompt instructing it to judge content-topic fit. */
const REVIEW_PROMPT = `Kamu adalah reviewer materi ajar. Tugasmu adalah memeriksa apakah konten yang diambil dari internet benar-benar relevan dengan topik yang diminta.

Kriteria penilaian:
- Apakah konten membahas topik yang diminta?
- Apakah tingkat kesulitan sesuai dengan grade level yang ditentukan?
- Apakah konten aman untuk anak-anak (tidak mengandung kekerasan, konten dewasa, atau SARA)?
- Apakah konten ditulis dalam bahasa Indonesia yang baik dan benar?

Balas dengan JSON saja, tanpa markdown formatting:
{
  "approved": true/false,
  "confidence": 0.0-1.0,
  "reason": "Penjelasan singkat dalam bahasa Indonesia",
  "action": "approve" | "retry" | "manual"
}`;

/* ------------------------------------------------------------------ */
/*  Processor                                                          */
/* ------------------------------------------------------------------ */

export async function processCurriculumReviewJob(
  job: Job<CurriculumReviewJobPayload, unknown, string>,
): Promise<void> {
  const { materialId, topic, gradeLevel } = job.data;

  // 1. Load material
  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) {
    console.error(`[curriculum/worker] Material not found: ${materialId}`);
    return;
  }

  // Guard: only process materials with scraped raw content
  if (material.status !== "RAW" || !material.rawContent) {
    console.warn(
      `[curriculum/worker] Material=${materialId} status=${material.status} — skipping (no raw content)`,
    );
    return;
  }

  // 2. Determine scrape retry count from metadata
  const meta = (material.metadata ?? {}) as Record<string, unknown>;
  const scrapeAttempts = (meta.scrapeAttempts as number) ?? 0;

  // 3. LLM content verification
  const systemPrompt = getSystemPrompt("curriculum");
  const messages = [
    { role: "system" as const, content: systemPrompt },
    {
      role: "user" as const,
      content: `Topik yang diminta: ${topic} (grade: ${gradeLevel})\n\nKonten yang diambil:\n${material.rawContent.slice(0, 8_000)}`,
    },
    { role: "user" as const, content: REVIEW_PROMPT },
  ];

  let verdict: { approved: boolean; confidence: number; reason: string; action: string };
  try {
    const raw = await callLLM("curriculum", messages, {
      temperature: 0.1,
      maxTokens: 512,
    });

    if (!raw) {
      throw new Error("LLM returned empty response");
    }

    // Parse JSON from LLM output (strip markdown fences if present)
    const cleaned = raw.replace(/```(?:json)?\s*/gi, "").trim();
    verdict = JSON.parse(cleaned) as typeof verdict;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[curriculum/worker] LLM review failed for material=${materialId}: ${errorMsg}`);

    // On LLM failure, treat as uncertain — flag for manual review
    await prisma.material.update({
      where: { id: materialId },
      data: {
        status: "DRAFT",
        metadata: {
          ...meta,
          reviewError: errorMsg,
          reviewedAt: new Date().toISOString(),
        },
      },
    });
    return;
  }

  // 4. Act on verdict
  if (verdict.approved && verdict.action === "approve") {
    await handleApproved(materialId, material.curriculumId, topic, gradeLevel, meta);
  } else if (verdict.action === "retry" && scrapeAttempts < MAX_SCRAPE_RETRIES) {
    await handleRetry(materialId, topic, gradeLevel, meta, scrapeAttempts);
  } else {
    await handleManualFlag(materialId, verdict, meta);
  }
}

/* ------------------------------------------------------------------ */
/*  Decision handlers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Content approved — mark as PROCESSED and enqueue downstream jobs.
 */
async function handleApproved(
  materialId: string,
  curriculumId: string,
  topic: string,
  gradeLevel: string,
  meta: Record<string, unknown>,
): Promise<void> {
  await prisma.material.update({
    where: { id: materialId },
    data: {
      status: "PROCESSED",
      metadata: {
        ...meta,
        reviewedAt: new Date().toISOString(),
        approved: true,
      },
    },
  });

  console.log(`[curriculum/worker] Approved material=${materialId}`);

  // Enqueue assessment:generate for this material
  // Look up the student from the curriculum to get studentId
  const curriculum = await prisma.curriculum.findUnique({
    where: { id: curriculumId },
    select: { studentId: true },
  });

  if (!curriculum) {
    console.error(`[curriculum/worker] Curriculum not found: ${curriculumId}`);
    return;
  }

  await enqueue({
    queue: QUEUES.ASSESSMENT_GENERATE,
    data: {
      studentId: curriculum.studentId,
      topic,
      gradeLevel,
    },
  });

  // If delivery includes VIDEO, also enqueue media:render
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { delivery: true, processedContent: true },
  });

  if (material && (material.delivery === "VIDEO" || material.delivery === "TEXT_AND_VIDEO")) {
    await enqueue({
      queue: QUEUES.MEDIA_RENDER,
      data: {
        materialId,
        characterPreference: "",
        script: material.processedContent ?? "",
      },
    });
  }
}

/**
 * Content rejected but retries remain — re-enqueue content:scrape with back-off.
 */
async function handleRetry(
  materialId: string,
  topic: string,
  gradeLevel: string,
  meta: Record<string, unknown>,
  scrapeAttempts: number,
): Promise<void> {
  const newAttempts = scrapeAttempts + 1;

  await prisma.material.update({
    where: { id: materialId },
    data: {
      status: "DRAFT",
      rawContent: null, // clear failed content so scraper re-fetches
      sourceUrls: [],
      metadata: {
        ...meta,
        scrapeAttempts: newAttempts,
        reviewedAt: new Date().toISOString(),
        approved: false,
        retryReason: `Scraped content didn't match topic — retry ${newAttempts}/${MAX_SCRAPE_RETRIES}`,
      },
    },
  });

  console.log(
    `[curriculum/worker] Retry ${newAttempts}/${MAX_SCRAPE_RETRIES} for material=${materialId}`,
  );

  // Re-enqueue content:scrape
  const queue = getQueue(QUEUES.CONTENT_SCRAPE.name);
  await queue.add("scrape", {
    materialId,
    topic,
    gradeLevel,
    sources: [],
  });
}

/**
 * Content rejected and retries exhausted — flag for manual review.
 */
async function handleManualFlag(
  materialId: string,
  verdict: { approved: boolean; confidence: number; reason: string; action: string },
  meta: Record<string, unknown>,
): Promise<void> {
  await prisma.material.update({
    where: { id: materialId },
    data: {
      status: "DRAFT",
      metadata: {
        ...meta,
        reviewedAt: new Date().toISOString(),
        approved: false,
        manualReviewRequired: true,
        reviewReason: verdict.reason,
        reviewConfidence: verdict.confidence,
      },
    },
  });

  console.warn(
    `[curriculum/worker] Manual review required for material=${materialId}: ${verdict.reason}`,
  );
}
