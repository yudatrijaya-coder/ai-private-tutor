/**
 * Bot Launch (Polling) — DEVELOPMENT ONLY
 *
 * Starts the Telegram bot in long-polling mode.
 * Uses dynamic import to ensure dotenv is loaded before bot.ts reads env.
 *
 * Usage: npx tsx src/bot/launch.ts
 */

import "dotenv/config";

async function main() {
  const { bot } = await import("./bot");
  const { onMessage } = await import("./handlers/message");

  if (!bot) {
    console.error("[bot] TELEGRAM_BOT_TOKEN not set. Cannot start bot.");
    process.exit(1);
  }

  // Register the catch-all message handler
  bot.on("message", onMessage);

  // Graceful shutdown
  process.once("SIGINT", () => {
    console.log("\n[bot] SIGINT received. Stopping bot...");
    bot.stop("SIGINT");
    process.exit(0);
  });
  process.once("SIGTERM", () => {
    console.log("\n[bot] SIGTERM received. Stopping bot...");
    bot.stop("SIGTERM");
    process.exit(0);
  });

  console.log(`[bot] Bot @senangbelajar_bot started in polling mode. Press Ctrl+C to stop.`);
  await bot.launch();
}

main().catch((err) => {
  console.error("[bot] Failed to launch bot:", err);
  process.exit(1);
});
