import { NextRequest, NextResponse } from "next/server";
import { processPendingReminders } from "@/bot/agent/reminder";

/**
 * GET /api/reminders/check
 *
 * Cron endpoint — cek reminder yang harus dikirim sekarang.
 * Panggil dari cron job tiap 1 menit.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Simple auth — check for cron secret
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET || "local-cron"}`;

  if (auth !== expected && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await processPendingReminders();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[reminder/cron] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
