import { NextRequest, NextResponse } from "next/server";
import { hasPanelSession } from "@/lib/system/auth";
import { signalProcess, type ProcessAction } from "@/lib/system/processes";

export const dynamic = "force-dynamic";

const ALLOWED: ProcessAction[] = ["term", "kill"];

/**
 * POST /api/system/processes/action — signal one process.
 *
 * Body: `{ "pid": 1234, "action": "term" | "kill" }`
 *
 * The PID is re-validated against a fresh process list inside `signalProcess`
 * (protected unit, owning user, still an agent instance) before any signal is
 * sent, so a recycled PID cannot be used to kill something unintended.
 */
export async function POST(request: NextRequest) {
  if (!(await hasPanelSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let pid = 0;
  let action = "";

  try {
    const body = (await request.json()) as { pid?: unknown; action?: unknown };
    pid = typeof body.pid === "number" ? body.pid : Number(body.pid);
    action = typeof body.action === "string" ? body.action : "";
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  if (!Number.isInteger(pid) || pid <= 1) {
    return NextResponse.json({ error: "PID tidak valid." }, { status: 400 });
  }

  if (!ALLOWED.includes(action as ProcessAction)) {
    return NextResponse.json(
      { error: `Aksi tidak dikenal. Pilih: ${ALLOWED.join(", ")}` },
      { status: 400 },
    );
  }

  console.log(`[system] process action=${action} pid=${pid}`);

  try {
    const result = await signalProcess(pid, action as ProcessAction);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (err) {
    console.error("[system/processes/action]", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
