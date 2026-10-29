import { NextResponse } from "next/server";
import { hasPanelSession } from "@/lib/system/auth";
import { heavyProcesses } from "@/lib/system/processes";

export const dynamic = "force-dynamic";

/**
 * GET /api/system/processes — agent instances above the memory threshold.
 *
 * Only candidates (agent CLIs) are returned, and each carries `killable` plus
 * a reason when it is not, so the UI can disable the button rather than let
 * the operator discover the refusal after clicking.
 */
export async function GET() {
  if (!(await hasPanelSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processes = await heavyProcesses();
    return NextResponse.json(
      { processes },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[system/processes]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
