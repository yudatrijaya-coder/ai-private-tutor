import { NextRequest, NextResponse } from "next/server";
import {
  createPanelSession,
  isPanelConfigured,
  panelCookieOptions,
  verifyPanelPassword,
  SYSTEM_COOKIE,
} from "@/lib/system/auth";
import { rateLimit } from "@/lib/rate-limit";
import { delay } from "@/lib/system/delay";

export const dynamic = "force-dynamic";

/**
 * POST /api/system/auth — open a panel session.
 *
 * This is the only unauthenticated endpoint in the /api/system family, so it is
 * the one that has to resist guessing. Two limits apply:
 *
 * - a per-IP attempt limit, so a single host cannot walk a dictionary quickly;
 * - bcrypt itself, which costs ~100ms per comparison at cost 10.
 *
 * The response is deliberately identical for "wrong password" and "panel not
 * configured": telling an anonymous caller which of the two it is hands them a
 * map of the deployment.
 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  // 10 attempts per minute per IP. A human never needs more.
  const limit = rateLimit(`system-auth:${ip}`, 10);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi sebentar lagi." },
      { status: 429 },
    );
  }

  if (!isPanelConfigured()) {
    console.error(
      "[system] SYSTEM_PANEL_SECRET atau SYSTEM_PANEL_PASSWORD_HASH belum diset — panel dinonaktifkan",
    );
    return NextResponse.json({ error: "Panel tidak tersedia." }, { status: 503 });
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: "Password wajib diisi." }, { status: 400 });
  }

  const ok = await verifyPanelPassword(password);
  if (!ok) {
    // No detail about which part failed, and no timing signal beyond bcrypt's.
    await delay(250);
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }

  const { token, maxAge } = await createPanelSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ ...panelCookieOptions(maxAge), value: token });
  return response;
}

/** DELETE /api/system/auth — close the session. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    ...panelCookieOptions(0),
    name: SYSTEM_COOKIE,
    value: "",
  });
  return response;
}
