import { NextRequest, NextResponse } from "next/server";
import { runExamSchedulerSweep } from "@/services/exam-scheduler";
import { checkCronSecret, logCronRun } from "@/lib/cron/guard";

/**
 * POST /api/cron/exam-scheduler
 *
 * Weekly exam enforce sweep — runs every 30 minutes:
 * - Ensures every active student has a schedule for the coming week
 * - Sends H-1 and H-hour reminders
 * - Chases un-attempted exams past their scheduled time
 *
 * Secured with CRON_SECRET (header `x-cron-secret` or `?token=`), fail closed
 * (ledger A-14). The previous check was `if (expectedSecret && ...)`, which
 * authorized every caller whenever the env var was unset.
 */
export async function POST(request: NextRequest) {
  const denied = checkCronSecret(request);
  if (denied) return denied;

  try {
    const result = await runExamSchedulerSweep();
    await logCronRun({
      agentType: "SCHEDULER",
      action: "exam-scheduler",
      status: "COMPLETED",
      output: result,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ExamSchedulerCron] Error:", err);
    await logCronRun({
      agentType: "SCHEDULER",
      action: "exam-scheduler",
      status: "FAILED",
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
