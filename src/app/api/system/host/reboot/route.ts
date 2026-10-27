import { NextRequest, NextResponse } from "next/server";
import { hasPanelSession } from "@/lib/system/auth";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

/** The exact phrase the operator must type. Deliberately not a button label. */
const CONFIRM_PHRASE = "REBOOT VPS";

/**
 * POST /api/system/host/reboot — reboot the host.
 *
 * This is the one action that cannot be undone from the panel, because it
 * takes the panel down with it. Three independent guards:
 *
 * 1. A panel session (the same cookie as every other /api/system route).
 * 2. A literal confirmation phrase in the body. A single misclick cannot send
 *    it: the UI requires typing the phrase, and this route rejects anything
 *    that is not an exact match.
 * 3. A deliberate delay before `reboot` is invoked, so the HTTP response has
 *    already been flushed and the browser is not left with a hanging request
 *    that looks like a failure.
 *
 * `sudo -n` (non-interactive) is used so a missing NOPASSWD rule fails fast
 * with a message instead of hanging until the request times out.
 */
export async function POST(request: NextRequest) {
  if (!(await hasPanelSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let confirm = "";
  try {
    const body = (await request.json()) as { confirm?: unknown };
    confirm = typeof body.confirm === "string" ? body.confirm : "";
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  if (confirm !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `Konfirmasi tidak cocok. Ketik persis: ${CONFIRM_PHRASE}` },
      { status: 400 },
    );
  }

  console.log("[system] host reboot diminta dari panel — 2 detik lagi");

  // Answer first, reboot second. The caller gets a normal 200 and the box goes
  // down once the response is on the wire.
  setTimeout(() => {
    void (async () => {
      try {
        await execFileAsync("sudo", ["-n", "systemctl", "reboot"], { timeout: 20_000 });
      } catch (err) {
        // Reaching here after the response was sent means the only record is
        // the server log; nothing can be returned to the client.
        console.error("[system] reboot gagal:", err instanceof Error ? err.message : err);
      }
    })();
  }, 2000);

  return NextResponse.json({
    ok: true,
    message: "VPS akan reboot dalam ~2 detik. Panel tidak akan bisa diakses sampai host hidup lagi.",
  });
}
