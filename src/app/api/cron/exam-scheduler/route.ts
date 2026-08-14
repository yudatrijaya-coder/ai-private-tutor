import { NextRequest, NextResponse } from "next/server";
import { runExamSchedulerSweep } from "@/services/exam-scheduler";

/**
 * POST /api/cron/exam-scheduler
 *
 * Weekly exam enforce sweep — runs every 30 minutes:
 * - Ensures every active student has a schedule for the coming week
 * - Sends H-1 and H-hour reminders
 * - Chases un-attempted exams past their scheduled time
 *
 * Secured with CRON_SECRET header (same as guardian-report).
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runExamSchedulerSweep();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[ExamSchedulerCron] Error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
