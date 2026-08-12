import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyGuardianReports } from "@/services/guardian-report";

/**
 * POST /api/cron/guardian-report
 * 
 * Sends weekly guardian progress reports to parents via Telegram.
 * Secured with CRON_SECRET header.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await sendWeeklyGuardianReports();
    return NextResponse.json({ success: true, message: "Guardian reports sent." });
  } catch (err) {
    console.error("[GuardianCron] Error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
