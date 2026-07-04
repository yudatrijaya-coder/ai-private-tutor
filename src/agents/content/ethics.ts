/**
 * Scraping Ethics Rules
 *
 * Defines ethical scraping constraints: respect robots.txt, rate limits,
 * max content length, and proper UA identification.
 */

export const ETHICS = {
  /** Respect robots.txt directives when available */
  respectRobotsTxt: true,
  /** Minimum delay (ms) between requests to the same domain */
  minDelayMs: 2_000,
  /** Maximum pages scraped per domain in a single session */
  maxPagesPerDomain: 50,
  /** User-Agent string identifying this educational scraper */
  userAgent:
    "AI-Private-Tutor/1.0 (Educational Project; contact@tutor.ai)",
  /** Maximum raw content length to store per scrape (100 KB) */
  maxContentLength: 100_000,
} as const;

/**
 * Check whether the given content length respects the ethics limit.
 */
export function isWithinEthicsLimit(length: number): boolean {
  return length <= ETHICS.maxContentLength;
}

/**
 * Truncate content to the ethics limit, preserving whole lines.
 */
export function truncateToEthicsLimit(content: string): string {
  if (content.length <= ETHICS.maxContentLength) return content;
  return content.slice(0, ETHICS.maxContentLength);
}
