/**
 * Multi-source Fallback
 *
 * Provides priority-ordered source URLs per grade level and topic-based
 * URL discovery for the Content Agent.  Phase 1 uses hardcoded URLs;
 * Phase 2 will integrate Tavily/MCP search for dynamic discovery.
 */

import type { ScrapeJobPayload } from "@/queue/definitions";
import { isAllowedDomain } from "./scrape";

/* ------------------------------------------------------------------ */
/*  Source priority by grade level                                     */
/* ------------------------------------------------------------------ */

/**
 * Priority-ordered source URLs for each grade level.
 * The Content Worker iterates through these in order until one succeeds.
 */
export const SOURCE_PRIORITY: Record<string, string[]> = {
  SD: [
    "https://www.kemdikbud.go.id/",
    "https://www.ruangguru.com/",
    "https://www.zenius.net/",
    "https://id.wikipedia.org/",
  ],
  SMP: [
    "https://www.kemdikbud.go.id/",
    "https://www.ruangguru.com/",
    "https://www.zenius.net/",
    "https://id.wikipedia.org/",
    // Phase 2: school websites via Tavily search
  ],
  SMA: [
    "https://www.kemdikbud.go.id/",
    "https://www.ruangguru.com/",
    "https://www.zenius.net/",
    "https://id.wikipedia.org/",
    // Phase 2: university & academic sources
  ],
};

/* ------------------------------------------------------------------ */
/*  Topic-to-URL mapper                                                */
/* ------------------------------------------------------------------ */

/**
 * Best-effort mapping from known subjects/topics to specific educational
 * content URLs.  Used as a secondary source list when the priority URLs
 * fail.
 */
export const TOPIC_SOURCE_MAP: Record<string, string[]> = {
  Matematika: [
    "https://www.ruangguru.com/blog/matematika-sd",
    "https://www.zenius.net/blog/matematika",
    "https://id.wikipedia.org/wiki/Matematika",
  ],
  "Bahasa Indonesia": [
    "https://www.ruangguru.com/blog/bahasa-indonesia",
    "https://id.wikipedia.org/wiki/Bahasa_Indonesia",
  ],
  IPA: [
    "https://www.ruangguru.com/blog/ipa",
    "https://www.zenius.net/blog/ipa",
    "https://id.wikipedia.org/wiki/Ilmu_pengetahuan_alam",
  ],
  IPS: [
    "https://www.ruangguru.com/blog/ips",
    "https://id.wikipedia.org/wiki/Ilmu_pengetahuan_sosial",
  ],
  PPKn: [
    "https://www.ruangguru.com/blog/pkn",
    "https://id.wikipedia.org/wiki/Pendidikan_Pancasila_dan_Kewarganegaraan",
  ],
};

/* ------------------------------------------------------------------ */
/*  Lookup helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Resolve the best candidate URLs for a given scrape job.
 *
 * Strategy:
 * 1. Use job-level `sources[]` if provided (highest priority).
 * 2. Fall back to grade-level priority list.
 * 3. If the topic matches a known subject, merge in topic-specific URLs.
 * 4. Filter out any blocked domains.
 *
 * Safe bootstrap: returns an empty array (no crash, no endless loops)
 * when all sources are blocked or no sources match.
 */
export function resolveSources(payload: ScrapeJobPayload): string[] {
  const { sources, topic, gradeLevel } = payload;

  const candidates: string[] = [];

  // Job-level sources take priority
  if (sources && sources.length > 0) {
    candidates.push(...sources);
  }

  // Grade-level priority fallback
  const gradeSources = SOURCE_PRIORITY[gradeLevel];
  if (gradeSources) {
    candidates.push(...gradeSources);
  }

  // Topic-specific URLs (avoid duplicates)
  const topicSources = TOPIC_SOURCE_MAP[topic];
  if (topicSources) {
    for (const url of topicSources) {
      if (!candidates.includes(url)) {
        candidates.push(url);
      }
    }
  }

  // Deduplicate and filter blocked domains
  const seen = new Set<string>();
  return candidates.filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return isAllowedDomain(url);
  });
}

/**
 * Graceful noop fallback — returns an empty result set.
 * Use when the network is unavailable.
 */
export function emptyFallback(): string[] {
  return [];
}
