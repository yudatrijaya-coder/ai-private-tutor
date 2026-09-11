/**
 * Shared cron-endpoint guard (ledger A-14 / C-05).
 *
 * Two problems this module closes, both observed in `src/app/api/cron/*`:
 *
 * 1. **Fail-open secret check (A-14).** The pattern
 *    `if (expectedSecret && secret !== expectedSecret) return 401` returns
 *    *success* when `CRON_SECRET` is unset, because the first operand is falsy.
 *    An unset env var — a very ordinary deployment mistake — turned a cron
 *    endpoint into a public one that sends mass Telegram notifications.
 *    `checkCronSecret()` fails closed instead: no secret configured means no
 *    caller is authorized.
 *
 * 2. **No audit trail (C-05).** None of the cron routes wrote `AgentLog`, so
 *    `AgentLog` showed GUARDIAN last active 2026-07-30 and SCHEDULER 2026-07-15
 *    while the weekly job kept reporting `ok`. A job that reports success but
 *    leaves no trace cannot be distinguished from one that silently did
 *    nothing. `logCronRun()` writes one row per run.
 *
 * Both helpers are dependency-light so any route can import them.
 */

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/** Extracts the caller-supplied secret from a header or `?token=`. */
function presentedSecret(request: NextRequest): string | null {
  return request.headers.get("x-cron-secret") ?? request.nextUrl.searchParams.get("token");
}

/**
 * Fail-closed cron authentication.
 *
 * @returns `null` when the caller may proceed, otherwise the 401 response.
 */
export function checkCronSecret(request: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron] CRON_SECRET is not configured — refusing to run (fail closed).");
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 503 });
  }
  if (presentedSecret(request) !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export type CronAgentType = "GUARDIAN" | "SCHEDULER";

interface CronRunLog {
  agentType: CronAgentType;
  /** Route/action name, e.g. "guardian-report". */
  action: string;
  status: "COMPLETED" | "FAILED";
  input?: unknown;
  output?: unknown;
  error?: string;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

/**
 * Record one cron run in `AgentLog`. Never throws — a logging failure must not
 * fail the run it is describing.
 */
export async function logCronRun(entry: CronRunLog): Promise<void> {
  try {
    await prisma.agentLog.create({
      data: {
        agentType: entry.agentType as never,
        action: entry.action,
        status: entry.status as never,
        input: toJson(entry.input),
        output: toJson(entry.output),
        error: entry.error ?? null,
      },
    });
  } catch (err) {
    console.error("[cron] failed to write AgentLog:", err);
  }
}
