import { NextResponse } from "next/server";
import { hasPanelSession } from "@/lib/system/auth";
import { allServiceStatuses } from "@/lib/system/services";

export const dynamic = "force-dynamic";

/** GET /api/system/services — status of every service in the registry. */
export async function GET() {
  if (!(await hasPanelSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const services = await allServiceStatuses();
    return NextResponse.json({ services }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[system/services]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
