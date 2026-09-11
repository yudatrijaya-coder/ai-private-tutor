import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handlers } from "@/lib/auth/auth";

export const GET = handlers.GET;

/**
 * POST /api/auth/* — with a guard for the malformed `callback` shape.
 *
 * `@auth/core` 0.41.3 dereferences `options.provider.type` for the `callback`
 * action *before* validating that a provider id was supplied
 * (`node_modules/@auth/core/lib/index.js:53`):
 *
 *     case "callback":
 *         if (options.provider.type === "credentials")   // options.provider undefined
 *
 * A POST to `/api/auth/callback` with no provider segment therefore throws
 * `TypeError: Cannot read properties of undefined (reading 'type')`. The
 * library catches it, logs `[auth][error]` and turns it into a 302 to the error
 * page — 34 such entries had accumulated in `logs/err.log` (ledger C-02).
 *
 * The provider id is a path segment, so the malformed shape is fully detectable
 * before delegating. A callback without a provider id is never a valid request,
 * so answer 400 instead of 500/302.
 */
export async function POST(req: NextRequest) {
  if (/\/callback\/?$/.test(new URL(req.url).pathname)) {
    return NextResponse.json({ error: "MissingProviderId" }, { status: 400 });
  }
  return handlers.POST(req);
}
