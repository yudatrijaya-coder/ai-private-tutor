/**
 * Daily nudge cron — sends a reminder if student hasn't studied today.
 * Max 1 nudge per day per student.
 * Triggered once per day (configurable).
 *
 * Ledger A-07: this endpoint had **no authentication at all**. Any anonymous
 * request to `/api/cron/daily-nudge` ran the whole sweep, sending Telegram
 * messages to every inactive student — a free spam/abuse vector and a way to
 * burn the bot's Telegram rate limit. It now goes through the shared
 * `checkCronSecret()` guard (fail-closed) and records each run in `AgentLog`.
 *
 * Ledger C-13b: the sweep itself now lives in `runDailyNudge()`, which claims
 * one slot per student per day. Before that the "max 1 nudge per day" promise
 * in the line above was documentation only — the loop gated on the student's
 * last *activity*, so every run of the day re-nudged the same inactive student.
 */
import { NextRequest, NextResponse } from "next/server";
import { checkCronSecret, logCronRun } from "@/lib/cron/guard";
import { runDailyNudge } from "@/services/daily-nudge";
import { pruneClaims } from "@/lib/cron/idempotency";

/** Claims older than this are housekeeping garbage — periods never recur. */
const CLAIM_RETENTION_DAYS = 60;

export async function GET(request: NextRequest) {
  const denied = checkCronSecret(request);
  if (denied) return denied;

  const { sent, failed, skipped, results } = await runDailyNudge();

  // `CronClaim` keys embed their period, so a row can never be matched again
  // once its period has passed. Piggy-back the sweep on the daily job: it runs
  // once a day, which is ample for a table that grows by a handful of rows a
  // week.
  const cutoff = new Date(Date.now() - CLAIM_RETENTION_DAYS * 86400000);
  const pruned = await pruneClaims(cutoff);

  await logCronRun({
    agentType: "GUARDIAN",
    action: "daily-nudge",
    status: failed > 0 ? "FAILED" : "COMPLETED",
    output: { nudged: sent, failed, skipped, prunedClaims: pruned, results: results.slice(0, 20) },
    error: failed > 0 ? `${failed} nudge(s) failed` : undefined,
  });

  // Report `ok: false` when any send failed. The old handler always returned
  // `ok: true`, so a run where every Telegram call failed still looked healthy.
  return NextResponse.json({ ok: failed === 0, sent, failed, skipped, results });
}
