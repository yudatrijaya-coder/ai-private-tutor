/**
 * YouTube Handler — placeholder for YouTube API integration.
 *
 * Phase 4 will wire real YouTube Data API v3 calls to:
 *  - Upload rendered videos to a dedicated channel
 *  - Search for and embed existing educational videos as fallback content
 *  - Manage playlist metadata
 *
 * @module @/agents/media/youtube
 */

import { prisma } from "@/lib/prisma";
import { getCharacter } from "./characters";

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface YouTubeUploadResult {
  videoId: string;
  url: string;
  title: string;
}

/**
 * Upload a rendered video to YouTube.
 *
 * Current: placeholder that logs intent and updates the Material record.
 * Phase 4: real YouTube Data API upload with OAuth2.
 */
export async function uploadToYouTube(
  materialId: string,
  videoFilePath: string,
): Promise<YouTubeUploadResult | null> {
  const material = await prisma.material.findUnique({
    where: { id: materialId },
  });

  if (!material) {
    throw new Error(`Material not found: ${materialId}`);
  }

  console.log(
    `[Media/YouTube] Would upload: ${videoFilePath} for material ${materialId}`,
  );

  // Generate placeholder values
  const videoId = `placeholder_${materialId.slice(0, 8)}`;
  const title = `${material.topic}${material.subTopic ? ` — ${material.subTopic}` : ""} | ${material.subject}`;

  // Update material with the placeholder video URL
  await prisma.material.update({
    where: { id: materialId },
    data: {
      videoUrl: `https://youtube.com/watch?v=${videoId}`,
      status: "READY",
    },
  });

  return { videoId, url: `https://youtube.com/watch?v=${videoId}`, title };
}

/* ------------------------------------------------------------------ */
/*  YouTube Search Fallback                                             */
/* ------------------------------------------------------------------ */

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
}

/**
 * Search YouTube for existing educational videos on a topic.
 *
 * Current: returns empty array (placeholder).
 * Phase 4: real YouTube Search API call with topic + grade-level filters.
 */
export async function searchYouTubeFallback(
  topic: string,
  gradeLevel: string,
): Promise<YouTubeSearchResult[]> {
  console.log(
    `[Media/YouTube] Would search: topic="${topic}", grade="${gradeLevel}"`,
  );
  return [];
}
