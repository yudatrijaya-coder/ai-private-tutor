/**
 * Bot Launch (Polling) — DEVELOPMENT ONLY
 *
 * Starts the Telegram bot in long-polling mode.
 * Register all handlers before calling bot.launch().
 *
 * Usage: npx tsx src/bot/launch.ts
 */

import { bot } from "./bot";
import { onMessage } from "./handlers/message";

if (!bot) {
  console.error("[bot] TELEGRAM_BOT_TOKEN not set. Cannot start bot.");
  process.exit(1);
}

// Register the catch-all message handler
bot.on("message", onMessage);

// Graceful shutdown
process.once("SIGINT", () => {
  if (!bot) process.exit(0);
  console.log("\n[bot] SIGINT received. Stopping bot...");
  bot.stop("SIGINT");
  process.exit(0);
});
process.once("SIGTERM", () => {
  if (!bot) process.exit(0);
  console.log("\n[bot] SIGTERM received. Stopping bot...");
  bot.stop("SIGTERM");
  process.exit(0);
});

bot
  .launch()
  .then(() => {
    console.log("[bot] Bot started in polling mode. Press Ctrl+C to stop.");
  })
  .catch((err) => {
    console.error("[bot] Failed to launch bot:", err);
    process.exit(1);
  });
