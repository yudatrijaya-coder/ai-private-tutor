import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/bot/bot";

/**
 * POST /api/bot/webhook
 *
 * Receives Telegram update payloads via webhook.
 * The payload is passed to the Telegraf bot's handleUpdate method.
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
    await bot.handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhook] Error handling update:", error);
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
