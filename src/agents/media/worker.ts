/**
 * Media Worker — BullMQ processor for `media:render` and `media:yt-fallback` queues.
 *
 * @module @/agents/media/worker
 */

import type { Job } from "bullmq";
import type { RenderJobPayload, YtFallbackJobPayload } from "@/queue/definitions";
import { renderVideo } from "./renderer";
import { searchYouTubeFallback } from "./youtube";
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  Processor: media:render                                           */
/* ------------------------------------------------------------------ */

/**
 * BullMQ processor for the `media:render` queue.
 *
 * Workflow:
 *   1. Receives a material with a pre-generated script
 *   2. Calls the render pipeline (FFmpeg placeholder in Phase 3)
 *   3. Uploads the result to YouTube (placeholder in Phase 3)
 *   4. Updates material status to VIDEO_READY or READY
 */
export async function processMediaRender(
  job: Job<RenderJobPayload, unknown, string>,
): Promise<void> {
  const { materialId, characterPreference, script } = job.data;

  console.log(
    `[media/worker] Rendering material=${materialId} for character=${characterPreference}`,
  );

  // 1. Save the script and character preference on the material
  await prisma.material.update({
    where: { id: materialId },
    data: {
      videoScript: script,
      characterUsed: characterPreference,
    },
  });

  // 2. Render the video (Phase 4: real FFmpeg)
  await renderVideo(materialId);

  // 3. (Phase 4: upload to YouTube)

  job.returnvalue = {
    materialId,
    character: characterPreference,
    status: "VIDEO_READY",
  };
}

/* ------------------------------------------------------------------ */
/*  Processor: media:yt-fallback                                      */
/* ------------------------------------------------------------------ */

/**
 * BullMQ processor for the `media:yt-fallback` queue.
 *
 * When a material is marked as TEXT_AND_VIDEO but the render pipeline
 * is unavailable, this processor searches YouTube for a suitable
 * educational video and links it as a fallback.
 */
export async function processMediaYtFallback(
  job: Job<YtFallbackJobPayload, unknown, string>,
): Promise<void> {
  const { materialId, topic, gradeLevel } = job.data;

  console.log(
    `[media/worker] Searching YouTube fallback for material=${materialId}, topic="${topic}"`,
  );

  const results = await searchYouTubeFallback(topic, gradeLevel);

  if (results.length > 0) {
    const best = results[0];

    await prisma.material.update({
      where: { id: materialId },
      data: {
        videoUrl: best.url,
        status: "READY",
      },
    });

    console.log(
      `[media/worker] Fallback video found for material=${materialId}: ${best.title}`,
    );

    job.returnvalue = {
      materialId,
      found: true,
      videoId: best.videoId,
      title: best.title,
    };
  } else {
    console.log(`[media/worker] No fallback video found for material=${materialId}`);

    // Still mark READY even without video — text content exists
    await prisma.material.update({
      where: { id: materialId },
      data: { status: "READY" },
    });

    job.returnvalue = {
      materialId,
      found: false,
    };
  }
}
