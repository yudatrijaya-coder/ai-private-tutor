/**
 * Error monitoring — structured logging + Telegram alerting.
 *
 * The app previously had ~90 bare `console.error` calls going to the PM2 log,
 * with nobody reading them. A FK-violation bug in the study heartbeat ran for
 * days at 100 occurrences before it was noticed by hand.
 *
 * This module gives errors three properties they lacked:
 *   1. Structure  — JSON lines, greppable and countable by `scope`
 *   2. Persistence — appended to logs/errors.jsonl for offline analysis
 *   3. Escalation  — deduped Telegram alert to the admin for real failures
 *
 * Deliberately dependency-free (no Sentry): this VPS has no budget for an
 * external APM, and the admin already receives Telegram messages.
 *
 * @module @/lib/monitoring
 */

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Severity = "warn" | "error" | "fatal";

export interface ErrorContext {
  /** Dotted subsystem id, e.g. "api/study" or "bot/webhook". Used for dedup. */
  scope: string;
  severity?: Severity;
  /** Any extra structured detail. Keep it small and non-sensitive. */
  meta?: Record<string, unknown>;
  /** Set false to skip the Telegram alert (noisy or expected failures). */
  alert?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "errors.jsonl");

/** Suppress repeat alerts for the same scope+message within this window. */
const ALERT_DEDUP_MS = 15 * 60 * 1000;

/** Hard ceiling on alerts per process, so a hot loop cannot spam Telegram. */
const ALERT_BUDGET_PER_HOUR = 20;

const alertHistory = new Map<string, number>();
let alertsThisHour = 0;
let alertHourStart = Date.now();

/** Redact anything that looks like a secret before it reaches a log or chat. */
const SECRET_PATTERN =
  /(password|passwordHash|token|secret|apiKey|api_key|authorization|cookie)("?\s*[:=]\s*"?)([^",}\s]+)/gi;

function redact(text: string): string {
  return text.replace(SECRET_PATTERN, "$1$2[REDACTED]");
}

/* ------------------------------------------------------------------ */
/*  Core                                                               */
/* ------------------------------------------------------------------ */

/**
 * Record an error: structured stderr line, JSONL file, and (optionally) a
 * deduped Telegram alert.
 *
 * Never throws — monitoring must not become a new failure source. Always
 * awaited-but-safe: callers may ignore the returned promise.
 */
export async function captureError(
  error: unknown,
  context: ErrorContext,
): Promise<void> {
  const severity = context.severity ?? "error";

  try {
    const err =
      error instanceof Error ? error : new Error(String(error));

    const entry = {
      ts: new Date().toISOString(),
      severity,
      scope: context.scope,
      message: redact(err.message),
      // Prisma and similar libraries attach a machine-readable code.
      code: (err as { code?: string }).code ?? null,
      stack: err.stack ? redact(err.stack).split("\n").slice(0, 6).join("\n") : null,
      meta: context.meta ? JSON.parse(redact(JSON.stringify(context.meta))) : null,
    };

    // 1. Structured stderr — still visible in `pm2 logs`, but parseable.
    console.error(JSON.stringify(entry));

    // 2. Durable JSONL for offline counting by scope.
    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");

    // 3. Escalate.
    if (context.alert !== false && severity !== "warn") {
      await maybeAlert(entry.scope, entry.message, entry.code, severity);
    }
  } catch (monitoringFailure) {
    // Last resort: a plain line, so a monitoring bug is still visible.
    console.error(
      "[monitoring] captureError failed:",
      monitoringFailure instanceof Error
        ? monitoringFailure.message
        : monitoringFailure,
      "| original scope:",
      context.scope,
    );
  }
}

/**
 * Send a Telegram alert unless this scope+message already alerted recently or
 * the hourly budget is exhausted.
 */
async function maybeAlert(
  scope: string,
  message: string,
  code: string | null,
  severity: Severity,
): Promise<void> {
  const chatId = process.env.ADMIN_TELEGRAM_ID;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!chatId || !botToken) return; // alerting not configured — file log still written

  const now = Date.now();

  // Reset the hourly budget.
  if (now - alertHourStart > 60 * 60 * 1000) {
    alertHourStart = now;
    alertsThisHour = 0;
  }
  if (alertsThisHour >= ALERT_BUDGET_PER_HOUR) return;

  // Dedup on scope + code + first line of the message.
  const key = `${scope}|${code ?? ""}|${message.slice(0, 120)}`;
  const last = alertHistory.get(key);
  if (last && now - last < ALERT_DEDUP_MS) return;
  alertHistory.set(key, now);
  alertsThisHour++;

  const icon = severity === "fatal" ? "🔥" : "⚠️";
  const text =
    `${icon} *${severity.toUpperCase()}* \`${scope}\`\n` +
    (code ? `Code: \`${code}\`\n` : "") +
    `\n${message.slice(0, 500)}`;

  try {
    // 5s timeout: alerting must never block a request handler.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
  } catch {
    // Swallow: the error is already on disk, and a failed alert must not
    // escalate into a request failure.
  }
}

/**
 * Convenience wrapper for an API route handler.
 *
 * Wraps the handler so any thrown error is captured with the right scope and
 * converted into a 500 instead of leaking a stack trace to the client.
 */
export function withMonitoring<T extends unknown[]>(
  scope: string,
  handler: (...args: T) => Promise<Response>,
): (...args: T) => Promise<Response> {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      await captureError(error, { scope });
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  };
}
