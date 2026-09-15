import { NextRequest, NextResponse } from "next/server";
import { sendMonthlyGuardianReports } from "@/services/guardian-monthly-report";
import { checkCronSecret, logCronRun } from "@/lib/cron/guard";

/**
 * POST /api/cron/guardian-monthly
 *
 * Sends the MONTHLY guardian digest (mastery trend per subject, quizzes taken
 * in the previous calendar month, persistent weaknesses). Run on the 1st of
 * each month, 17:00 server time (= 16:00 WIB).
 *
 * Same security + observability contract as guardian-report: fail-closed
 * checkCronSecret, real counts in the response, AgentLog record per run.
 */
export async function POST(request: NextRequest) {
  const denied = checkCronSecret(request);
  if (denied) return denied;

  try {
    const monthly = await sendMonthlyGuardianReports();

    await logCronRun({
      agentType: "GUARDIAN",
      action: "guardian-monthly",
      status: monthly.failed > 0 ? "FAILED" : "COMPLETED",
      output: { ...monthly },
      error: monthly.failed > 0 ? monthly.errors.join("; ") : undefined,
    });

    return NextResponse.json({
      success: monthly.failed === 0,
      message: `Guardian monthly: sent=${monthly.sent} failed=${monthly.failed} skipped=${monthly.skipped}`,
      monthly,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GuardianMonthlyCron] Error:", err);
    await logCronRun({
      agentType: "GUARDIAN",
      action: "guardian-monthly",
      status: "FAILED",
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
