/**
 * Content Agent — barrel exports.
 *
 * @module @/agents/content
 */

export { ETHICS, isWithinEthicsLimit, truncateToEthicsLimit } from "./ethics";
export {
  ALLOWED_DOMAINS,
  BLOCKED_DOMAIN_FRAGMENTS,
  BLOCKED_KEYWORDS,
  filterContent,
  isAllowedDomain,
  RateLimiter,
  fetchWithCheerio,
  safeFetchText,
  type FilterResult,
  type ScrapedPage,
} from "./scrape";
export {
  SOURCE_PRIORITY,
  TOPIC_SOURCE_MAP,
  resolveSources,
  emptyFallback,
} from "./fallback";
export { processScrapeJob } from "./worker";
