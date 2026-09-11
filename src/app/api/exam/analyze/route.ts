
import { NextResponse } from "next/server";
import { analyzeExamAttempt } from "@/services/improvement-analysis";
import { resolveScope, isAdmin } from "@/lib/auth/scope";

export async function POST(request: Request) {
  // Admin only — re-running AI analysis mutates an attempt's improvement plan.
  if (!isAdmin(await resolveScope())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { attemptId } = await request.json();

    if (!attemptId) {
      return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
    }

    // Trigger the analysis
    await analyzeExamAttempt(attemptId);

    return NextResponse.json({ 
        message: "AI analysis triggered successfully.", 
        attemptId: attemptId 
    }, { status: 200 });

  } catch (err) {
    console.error(`Error triggering AI analysis for attempt:`, err);
    return NextResponse.json(
      { error: "Failed to trigger AI analysis" },
      { status: 500 }
    );
  }
}
