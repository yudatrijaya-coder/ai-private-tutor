import { NextResponse } from "next/server";
import { hasPanelSession } from "@/lib/system/auth";
import { hostMetrics } from "@/lib/system/metrics";
import { delay } from "@/lib/system/delay";

export const dynamic = "force-dynamic";

/**
 * GET /api/system/metrics — CPU, memory, disk, load.
 *
 * CPU percentage is a delta between two `/proc/stat` reads, so the first call
 * after a process start has no baseline. Rather than seed it with a fake
 * sample (which would report a meaningless number), the handler takes two
 * samples 250ms apart when no previous sample exists.
 */
export async function GET() {
  if (!(await hasPanelSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let metrics = await hostMetrics();
    if (metrics.cpu.percent === null) {
      await delay(250);
      metrics = await hostMetrics();
    }
    return NextResponse.json(metrics, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[system/metrics]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
