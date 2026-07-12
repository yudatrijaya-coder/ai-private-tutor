import { NextRequest, NextResponse } from "next/server";
import { Context, Telegraf } from "telegraf";
import { onMessage } from "@/bot/handlers/message";
import { routeCallback } from "@/bot/state-machine";
import { bot } from "@/bot/bot";

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

  try {
    const update = await request.json();
    console.log("[webhook] Update:", update.update_id, "from", update.message?.from?.id);

    const ctx = new Context(update, (bot as any).telegram, (bot as any).botInfo || {});

    // Route callback queries (inline keyboard buttons)
    if (update.callback_query) {
      console.log("[webhook] Callback query:", update.callback_query.data);
      await routeCallback(ctx as any);
      return NextResponse.json({ ok: true });
    }

    console.log("[webhook] Calling onMessage...");
    await onMessage(ctx as any);
    console.log("[webhook] onMessage completed");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
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
