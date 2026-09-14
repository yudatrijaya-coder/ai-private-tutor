/**
 * Weekly motivation cron — proactive, prosem-aware encouragement messages.
 * Distinct from daily-nudge (which targets 2+ day inactivity): this reaches
 * every ACTIVE student on a schedule.
 *
 * Slots: Monday 16:00 WIB (start-of-week plan) and Friday 16:00 WIB
 * (week-end encouragement). Idempotent via CronClaim per student per ISO
 * week per type — a re-run cannot double-send.
 *
 * Work-performing endpoint: requires checkCronSecret; only ever exercised
 * by the real scheduler, never probed with the valid secret (ops rule).
 */
import { NextRequest, NextResponse } from "next/server";
import { checkCronSecret, logCronRun } from "@/lib/cron/guard";
import { runMotivationNudge, type MotivationType } from "@/services/motivation-nudge";

export async function POST(request: NextRequest) {
  const denied = checkCronSecret(request);
  if (denied) return denied;

  const type: MotivationType = request.nextUrl.searchParams.get("type") === "friday" ? "friday" : "monday";

  const { sent, failed, skipped, results } = await runMotivationNudge(type);

  await logCronRun({
    agentType: "GUARDIAN",
    action: `motivation-${type}`,
    status: failed > 0 ? "FAILED" : "COMPLETED",
    output: { sent, failed, skipped, results: results.slice(0, 20) },
    error: failed > 0 ? `${failed} send(s) failed` : undefined,
  });

  return NextResponse.json({ ok: failed === 0, type, sent, failed, skipped, results });
}

export async function GET(request: NextRequest) {
  const denied = checkCronSecret(request);
  if (denied) return denied;
  return NextResponse.json({ ok: true, hint: "POST with ?type=monday|friday" });
}
