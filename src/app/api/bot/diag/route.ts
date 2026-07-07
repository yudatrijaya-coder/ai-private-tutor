import { NextRequest, NextResponse } from "next/server";
import { Telegraf } from "telegraf";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fresh = searchParams.get("fresh") === "1";

  const results: Record<string, any> = {
    envHasToken: !!process.env.TELEGRAM_BOT_TOKEN,
    tokenLen: process.env.TELEGRAM_BOT_TOKEN?.length,
  };

  if (fresh) {
    // Create a FRESH bot instance from process.env within the request
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      try {
        const bot = new Telegraf(token);
        const me = await bot.telegram.getMe();
        results.fresh = { ok: true, username: me.username, id: me.id };
      } catch (e: any) {
        results.fresh = { ok: false, error: e.description || e.message, code: e.code };
      }
    }
  } else {
    // Use the pre-imported bot
    const { bot } = await import("@/bot/bot");
    results.hasBot = !!bot;
    if (bot) {
      try {
        const me = await bot.telegram.getMe();
        results.imported = { ok: true, username: me.username };
      } catch (e: any) {
        results.imported = { ok: false, error: e.description || e.message, code: e.code };
      }
    }
  }

  return NextResponse.json(results);
}
