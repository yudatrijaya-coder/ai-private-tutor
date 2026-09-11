import { NextRequest, NextResponse } from "next/server";
import { processPendingReminders } from "@/bot/agent/reminder";

/**
 * GET /api/reminders/check
 *
 * Cron endpoint — cek reminder yang harus dikirim sekarang.
 * Panggil dari cron job tiap 1 menit.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Shared-secret auth. Fail closed: the old `process.env.CRON_SECRET ||
  // "local-cron"` default was guessable, so an unset env var let anyone run the
  // reminder pass. There is now nothing to match against when it is unset.
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");

  if (!secret || provided !== `Bearer ${secret}`) {
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
