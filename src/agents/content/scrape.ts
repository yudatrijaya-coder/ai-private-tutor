/**
 * Content Scraper — domain validation, content filtering, rate limiting.
 *
 * Provides:
 * - isAllowedDomain()  – domain allowlist/blocklist checks
 * - filterContent()    – adult/keyword content filter
 * - RateLimiter class  – domain-aware rate limiter
 * - fetchWithCheerio() – fetch + parse HTML via Cheerio
 */

import { ETHICS, truncateToEthicsLimit } from "./ethics";
import * as cheerio from "cheerio";

/* ------------------------------------------------------------------ */
/*  Domain rules                                                       */
/* ------------------------------------------------------------------ */

/** Verifed educational domains (allowlist). Supports `*` wildcards. */
export const ALLOWED_DOMAINS = [
  "kemdikbud.go.id",
  "ruangguru.com",
  "quipper.com",
  "zenius.net",
  "academia.edu",
  "scholar.google.com",
  "wikipedia.org", // used with caution
  // SMP/SMA school websites
  "sma*.sch.id", // pattern — matches sma1.sch.id, sman1.sch.id, etc.
  "smp*.sch.id",
];

/** Explicitly blocked domain fragments (adult/gambling/social). */
export const BLOCKED_DOMAIN_FRAGMENTS = [
  "porn",
  "sex",
  "adult",
  "gambling",
  "forum",
  "chat",
  "social-media",
];

/** Keywords that cause content to be filtered out. */
export const BLOCKED_KEYWORDS = [
  "dewasa",
  "porno",
  "judol",
];

/* ------------------------------------------------------------------ */
/*  Content filter                                                     */
/* ------------------------------------------------------------------ */

export interface FilterResult {
  passed: boolean;
  reason?: string;
}

/**
 * Check raw content for blocked keywords (case-insensitive).
 */
export function filterContent(raw: string): FilterResult {
  const lower = raw.toLowerCase();

  for (const kw of BLOCKED_KEYWORDS) {
    if (lower.includes(kw)) {
      return { passed: false, reason: `Blocked keyword: ${kw}` };
    }
  }

  return { passed: true };
}

/* ------------------------------------------------------------------ */
/*  Domain validation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Validate whether a URL's domain is allowed for scraping.
 *
 * 1. Parse the URL hostname.
 * 2. Reject if hostname contains any blocked fragment.
 * 3. Accept if hostname matches an allowed domain (wildcards supported).
 */
export function isAllowedDomain(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }

  // Blocklist check — reject on any fragment match
  for (const frag of BLOCKED_DOMAIN_FRAGMENTS) {
    if (host.includes(frag)) return false;
  }

  // Allowlist check — match against patterns
  for (const ad of ALLOWED_DOMAINS) {
    if (ad.includes("*")) {
      // Convert glob-style wildcard to regex
      const escaped = ad.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`^${escaped.replace(/\*/g, "[a-zA-Z0-9-]+")}$`);
      if (pattern.test(host)) return true;
    } else if (host === ad || host.endsWith(`.${ad}`)) {
      return true;
    }
  }

  return false;
}

/* ------------------------------------------------------------------ */
/*  Rate limiter                                                       */
/* ------------------------------------------------------------------ */

/**
 * Domain-aware rate limiter.
 *
 * Tracks request timestamps per domain and blocks (with back-off)
 * when the per-window limit is exceeded.
 */
export class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 5, windowMs = 10_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Wait until a token is available for the given domain.
   * Blocks the caller when the domain has exceeded its rate limit
   * within the current sliding window.
   */
  async acquire(domain: string): Promise<void> {
    const now = Date.now();
    const timestamps = this.timestamps.get(domain) ?? [];
    const recent = timestamps.filter((t) => now - t < this.windowMs);

    if (recent.length >= this.maxRequests) {
      const wait = this.windowMs - (now - recent[0]);
      // Small jitter to avoid thundering herd on identical wait times
      await new Promise((r) => setTimeout(r, wait + Math.random() * 100));
    }

    recent.push(now);
    this.timestamps.set(domain, recent);
  }

  /** Clear all rate-limit state (e.g. during testing or session reset). */
  reset(): void {
    this.timestamps.clear();
  }
}

/* ------------------------------------------------------------------ */
/*  Fetch helpers                                                      */
/* ------------------------------------------------------------------ */

export interface ScrapedPage {
  url: string;
  title: string;
  text: string;
  html: string;
}

/**
 * Fetch a URL and extract meaningful content using Cheerio.
 *
 * Falls back gracefully when the network is unavailable — returns
 * `null` instead of throwing.
 */
export async function fetchWithCheerio(url: string): Promise<ScrapedPage | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": ETHICS.userAgent,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.warn(`[content/scrape] HTTP ${response.status} for ${url}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script, style, nav, and other non-content elements
    $("script, style, nav, footer, header, aside, .sidebar, .advertisement, .ad").remove();

    const title = $("title").first().text().trim() || $("h1").first().text().trim() || "";
    const text = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    return {
      url,
      title,
      text: truncateToEthicsLimit(text),
      html: truncateToEthicsLimit($.html()),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[content/scrape] fetch error for ${url}: ${msg}`);
    return null;
  }
}

/**
 * Safe fetch wrapper that returns null instead of throwing.
 * Use when Cheerio parsing is not needed (e.g. API-style endpoints).
 */
export async function safeFetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": ETHICS.userAgent },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const text = await response.text();
    return truncateToEthicsLimit(text);
  } catch {
    return null;
  }
}
