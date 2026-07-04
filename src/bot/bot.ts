import { Telegraf } from "telegraf";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN && process.env.NODE_ENV !== "test") {
  console.warn(
    "[bot] TELEGRAM_BOT_TOKEN is not set. Bot will not be fully functional.",
  );
}

export const bot = BOT_TOKEN ? new Telegraf(BOT_TOKEN) : null;

/**
 * Configure the bot for webhook mode (production) or polling (development).
 * - Webhook: call `configureWebhook()` during server startup.
 * - Polling: call `bot.launch()` directly (dev only).
 */
export async function configureWebhook(): Promise<void> {
  if (!bot) return;

  const url = process.env.BOT_WEBHOOK_URL;
  if (!url) {
    console.warn("[bot] BOT_WEBHOOK_URL not set, skipping webhook setup");
    return;
  }

  try {
    await bot.telegram.setWebhook(`${url}/api/bot/webhook`);
    console.log(`[bot] Webhook set to ${url}/api/bot/webhook`);
  } catch (err) {
    console.error("[bot] Failed to set webhook:", err);
  }
}

/**
 * Graceful shutdown handler.
 */
export function stopBot(signal?: string): void {
  if (!bot) return;
  console.log(`[bot] Stopping bot (signal: ${signal ?? "manual"})...`);
  bot.stop(signal);
}
