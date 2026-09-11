import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyGuardianReports } from "@/services/guardian-report";
import { sendWeeklyStudentReports } from "@/services/student-weekly-report";
import { checkCronSecret, logCronRun } from "@/lib/cron/guard";

/**
 * POST /api/cron/guardian-report
 *
 * Sends weekly guardian progress reports to parents via Telegram.
 * Secured with CRON_SECRET (header `x-cron-secret` or `?token=`), fail closed.
 *
 * Ledger C-05: this route used to answer `{success: true}` without reporting
 * whether anything was actually sent, and wrote no AgentLog — so a run with a
 * missing bot token, or with zero configured parents, looked exactly like a
 * successful digest. It now returns the real counts and records the run.
 */
export async function POST(request: NextRequest) {
  const denied = checkCronSecret(request);
  if (denied) return denied;

  try {
    const guardianReport = await sendWeeklyGuardianReports();
    const studentReport = await sendWeeklyStudentReports();

    const failed = guardianReport.failed + (studentReport?.failed ?? 0);
    const sent = guardianReport.sent + (studentReport?.sent ?? 0);

    await logCronRun({
      agentType: "GUARDIAN",
      action: "guardian-report",
      status: failed > 0 ? "FAILED" : "COMPLETED",
      output: { guardianReport, studentReport, sent, failed },
      error: failed > 0 ? guardianReport.errors.join("; ") || `${failed} send(s) failed` : undefined,
    });

    return NextResponse.json({
      success: failed === 0,
      message: `Guardian reports: sent=${guardianReport.sent} failed=${guardianReport.failed}`,
      guardianReport,
      studentReport,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GuardianCron] Error:", err);
    await logCronRun({
      agentType: "GUARDIAN",
      action: "guardian-report",
      status: "FAILED",
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
