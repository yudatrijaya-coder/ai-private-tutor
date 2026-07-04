/**
 * FFmpeg Render Pipeline — placeholder for video assembly.
 *
 * Phase 4 will wire real FFmpeg calls to combine TTS audio, background
 * visuals, subtitles, and transitions into a final `.mp4` file.
 *
 * @module @/agents/media/renderer
 */

import { prisma } from "@/lib/prisma";
import { estimateSpeechDuration } from "./tts";

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface RenderInput {
  materialId: string;
  script: string;
  characterKey: string;
  /** Optional YouTube thumbnail file path */
  thumbnailPath?: string;
}

/**
 * Render a finished video for the given material.
 *
 * Current: marks the material as VIDEO_READY and logs the render intent.
 * Phase 4: actual FFmpeg pipeline → upload to CDN/Youtube.
 */
export async function renderVideo(materialId: string): Promise<void> {
  const material = await prisma.material.findUnique({
    where: { id: materialId },
  });

  if (!material) {
    throw new Error(`Material not found: ${materialId}`);
  }

  console.log(
    `[Media] Would render video for material ${materialId} (topic=${material.topic})`,
  );

  await prisma.material.update({
    where: { id: materialId },
    data: { status: "VIDEO_READY" },
  });
}

/**
 * Validate that a script is renderable — checks length and structure.
 *
 * @returns Array of warning messages (empty = all good).
 */
export function validateScriptForRender(script: string): string[] {
  const warnings: string[] = [];

  if (!script || script.trim().length < 50) {
    warnings.push("Script too short (< 50 chars) — may produce very short video");
  }

  const estDuration = estimateSpeechDuration(script);
  if (estDuration < 10) {
    warnings.push(`Estimated duration (${estDuration}s) is very short`);
  }
  if (estDuration > 600) {
    warnings.push(
      `Estimated duration (${estDuration}s) exceeds 10 minute target`,
    );
  }

  return warnings;
}
