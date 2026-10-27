import { NextRequest, NextResponse } from "next/server";
import { hasPanelSession } from "@/lib/system/auth";
import { findService, performAction, type ServiceAction } from "@/lib/system/services";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS: ServiceAction[] = ["start", "stop", "restart"];

/**
 * POST /api/system/services/action — start/stop/restart one registered service.
 *
 * Body: `{ "id": "hermes", "action": "restart" }`
 *
 * The `id` is looked up in the registry and the `action` is checked against a
 * fixed list. Neither value ever reaches a shell: `performAction` spawns a
 * fixed argv with no interpolation, so even a crafted id cannot become an
 * argument — it just fails the lookup.
 */
export async function POST(request: NextRequest) {
  if (!(await hasPanelSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let id = "";
  let action = "";

  try {
    const body = (await request.json()) as { id?: unknown; action?: unknown };
    id = typeof body.id === "string" ? body.id : "";
    action = typeof body.action === "string" ? body.action : "";
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  if (!ALLOWED_ACTIONS.includes(action as ServiceAction)) {
    return NextResponse.json(
      { error: `Aksi tidak dikenal. Pilih salah satu: ${ALLOWED_ACTIONS.join(", ")}` },
      { status: 400 },
    );
  }

  const target = findService(id);
  if (!target) {
    // Deliberately does not echo the supplied id back into the message.
    return NextResponse.json({ error: "Service tidak terdaftar." }, { status: 404 });
  }

  console.log(
    `[system] action=${action} id=${target.id} unit=${target.unit} kind=${target.kind}`,
  );

  try {
    const result = await performAction(target, action as ServiceAction);
    return NextResponse.json(result, { status: result.ok ? 200 : result.blocked ? 409 : 500 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[system/action]", err);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
