/** Input sanitization utility — strip dangerous content before DB storage. */

const SUSPICIOUS_PATTERNS = [
  /(\bSELECT\b.*\bFROM\b)/i,
  /(\bDROP\b.*\bTABLE\b)/i,
  /(\bDELETE\b.*\bFROM\b)/i,
  /(\bINSERT\b.*\bINTO\b)/i,
  /(\bUPDATE\b.*\bSET\b)/i,
  /(\bUNION\b.*\bSELECT\b)/i,
  /(\bALTER\b.*\bTABLE\b)/i,
  /(\bCREATE\b.*\bTABLE\b)/i,
  /(\bEXEC\b|\bEXECUTE\b)/i,
  /(\bxp_cmdshell\b)/i,
  /(\bWAITFOR\b.*\bDELAY\b)/i,
  /(<script[\s>])/i,
  /(javascript\s*:)/i,
  /(onerror\s*=)/i,
  /(onload\s*=)/i,
  /(onclick\s*=)/i,
  /(onmouseover\s*=)/i,
];

/**
 * Strip HTML tags from a string.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Check if input contains suspicious SQL/XSS patterns.
 * Returns the matched pattern or null if clean.
 */
export function detectSuspicious(input: string): string | null {
  for (const pattern of SUSPICIOUS_PATTERNS) {
    const match = input.match(pattern);
    if (match) return match[0];
  }
  return null;
}

/**
 * Sanitize a user input string:
 * 1. Trim whitespace
 * 2. Strip HTML tags
 * 3. Reject suspicious patterns
 *
 * @returns { cleaned: string; rejected: boolean; reason?: string }
 */
export function sanitize(input: string): {
  cleaned: string;
  rejected: boolean;
  reason?: string;
} {
  const trimmed = input.trim();

  // Check for suspicious patterns first
  const found = detectSuspicious(trimmed);
  if (found) {
    return {
      cleaned: trimmed,
      rejected: true,
      reason: `Suspicious pattern detected: ${found}`,
    };
  }

  // Strip HTML tags
  const cleaned = stripHtml(trimmed);

  return { cleaned, rejected: false };
}

/**
 * Safe string: full sanitization, throws on suspicious input.
 */
export function safeString(input: string): string {
  const result = sanitize(input);
  if (result.rejected) {
    throw new Error(result.reason ?? "Input rejected");
  }
  return result.cleaned;
}
