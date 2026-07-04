/**
 * Content Scrape Worker — BullMQ processor for the `content:scrape` queue.
 *
 * For each source URL in the job payload:
 *   1. Validate domain (isAllowedDomain)
 *   2. Rate-limit per domain
 *   3. Fetch + parse content via Cheerio
 *   4. Filter for adult/blocked content
 *   5. If passed, store raw_content on the Material record
 *   6. If failed, try the next source (multi-source fallback)
 *   7. If all sources fail, log FAILED status
 *   8. If at least one succeeds, enqueue a `curriculum:review` job
 */

import type { Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import type {
  ScrapeJobPayload,
  CurriculumReviewJobPayload,
} from "@/queue/definitions";
import { enqueue } from "@/queue/runner";
import { QUEUES } from "@/queue/definitions";
import {
  isAllowedDomain,
  filterContent,
  RateLimiter,
  fetchWithCheerio,
} from "./scrape";
import { resolveSources } from "./fallback";

/* ------------------------------------------------------------------ */
/*  Singleton rate limiter (shared across all worker invocations)       */
/* ------------------------------------------------------------------ */

const rateLimiter = new RateLimiter(5 /* max requests */, 10_000 /* window ms */);

/* ------------------------------------------------------------------ */
/*  Processor                                                          */
/* ------------------------------------------------------------------ */

export async function processScrapeJob(
  job: Job<ScrapeJobPayload, unknown, string>,
): Promise<void> {
  const { materialId, topic, subTopic, gradeLevel } = job.data;

  // 1. Resolve candidate URLs (multi-source fallback)
  const urls = resolveSources(job.data);

  if (urls.length === 0) {
    console.warn(
      `[content/worker] No allowed sources for material=${materialId} topic=${topic}`,
    );
    await markFailed(materialId, "No allowed sources found");
    return;
  }

  // 2. Iterate through sources until one succeeds
  let scraped: string | null = null;
  let sourceUrl: string | null = null;

  for (const url of urls) {
    // Domain validation (double-check; resolveSources already filters)
    if (!isAllowedDomain(url)) {
      console.warn(`[content/worker] Domain blocked: ${url}`);
      continue;
    }

    // Rate limit per domain
    const domain = new URL(url).hostname;
    await rateLimiter.acquire(domain);

    // Fetch + parse
    const page = await fetchWithCheerio(url);
    if (!page) {
      console.warn(`[content/worker] Fetch failed, trying next source: ${url}`);
      continue;
    }

    // Content filter (adult/keyword detection)
    const filterResult = filterContent(page.text);
    if (!filterResult.passed) {
      console.warn(
        `[content/worker] Content filtered: ${url} — ${filterResult.reason}`,
      );
      continue;
    }

    // Success — use this source
    scraped = page.text;
    sourceUrl = url;
    break;
  }

  // 3. Persist result
  if (scraped && sourceUrl) {
    await prisma.material.update({
      where: { id: materialId },
      data: {
        rawContent: scraped,
        sourceUrls: [sourceUrl],
        status: "RAW",
      },
    });

    console.log(
      `[content/worker] Scraped material=${materialId} from ${sourceUrl}`,
    );

    // 4. Enqueue curriculum:review job
    await enqueue({
      queue: QUEUES.CURRICULUM_REVIEW,
      data: {
        materialId,
        topic,
        gradeLevel,
        subTopic,
      } as CurriculumReviewJobPayload,
    });
  } else {
    await markFailed(
      materialId,
      `All ${urls.length} source(s) exhausted`,
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function markFailed(materialId: string, reason: string): Promise<void> {
  await prisma.material.update({
    where: { id: materialId },
    data: { status: "DRAFT" },
  });

  console.error(`[content/worker] All sources failed for material=${materialId}: ${reason}`);
}
