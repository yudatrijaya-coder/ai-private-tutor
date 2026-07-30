import { NextRequest, NextResponse } from "next/server";
import { Context, Telegraf } from "telegraf";
import { onMessage } from "@/bot/handlers/message";
import { routeCallback } from "@/bot/state-machine";
import { bot } from "@/bot/bot";

// ── In-memory dedupe: update_id → expiry timestamp ───────────────────────────
const dedupe = new Map<number, number>();
const DEDUPE_TTL_MS = 60 * 60 * 1000; // 1 hour

function dedupeCheck(updateId: number): boolean {
  const now = Date.now();
  // Clean expired entries lazily
  if (dedupe.size > 0) {
    for (const [id, expiry] of dedupe) {
      if (expiry < now) dedupe.delete(id);
    }
  }
  if (dedupe.has(updateId)) return true; // duplicate
  dedupe.set(updateId, now + DEDUPE_TTL_MS);
  return false;
}

/**
 * POST /api/bot/webhook
 *
 * Receives Telegram update payloads via webhook.
 * Creates a Telegraf Context manually and dispatches to onMessage.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!bot) {
    return NextResponse.json(
      { error: "Bot not configured. Set TELEGRAM_BOT_TOKEN." },
      { status: 500 },
    );
  }

  // ── 1. Secret token verification ───────────────────────────────────────────
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secretToken) {
    const provided = request.headers.get("x-telegram-bot-api-secret-token");
    if (provided !== secretToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // ── 2. Parse update (must happen before early return) ──────────────────────
  let update: any;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // ── 3. Dedup by update_id ─────────────────────────────────────────────────
  if (update.update_id !== undefined && dedupeCheck(update.update_id)) {
    return NextResponse.json({ ok: true }); // already processed
  }

  // ── 4. Ack-first: always return 200 immediately ─────────────────────────────
  const ackResponse = NextResponse.json({ ok: true });

  // ── 5. Async processing (don't await before responding) ────────────────────
  processUpdate(update).catch((error) => {
    console.error("[webhook] Processing error:", error);
  });

  return ackResponse;
}

async function processUpdate(update: any): Promise<void> {
  try {
    console.log("[webhook] Update:", update.update_id, "from", update.message?.from?.id);

    const ctx = new Context(update, (bot as any).telegram, (bot as any).botInfo || {});

    // Route callback queries (inline keyboard buttons)
    if (update.callback_query) {
      console.log("[webhook] Callback query:", update.callback_query.data);
      await routeCallback(ctx as any);
      return;
    }

    console.log("[webhook] Calling onMessage...");
    await onMessage(ctx as any);
    console.log("[webhook] onMessage completed");
  } catch (error) {
    console.error("[webhook] Error:", error);
  }
}

/**
 * GET /api/bot/webhook
 *
 * Health check endpoint.
 */
export async function GET(): Promise<NextResponse> {
  if (!bot) {
    return NextResponse.json(
      { status: "inactive", message: "Bot not configured" },
      { status: 503 },
    );
  }

  return NextResponse.json({ status: "active" });
}
