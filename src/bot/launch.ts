/**
 * Bot Launch — Dual Mode
 *
 * - If BOT_WEBHOOK_URL is set → webhook mode (for VPS / production)
 * - Otherwise → polling mode (for local development)
 *
 * In polling mode, the bot runs standalone (no Next.js needed).
 * In webhook mode, the bot runs INSIDE the Next.js app at /api/bot/webhook.
 * Use launch.ts locally and next start for production.
 *
 * Usage:
 *   npx tsx src/bot/launch.ts              # polling (local dev)
 *   BOT_WEBHOOK_URL=... npx tsx src/bot/launch.ts  # webhook setup (one-time)
 */

import "dotenv/config";

async function main() {
  const { bot, configureWebhook } = await import("./bot");
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

  const webhookUrl = process.env.BOT_WEBHOOK_URL;

  if (webhookUrl) {
    // ── Webhook mode (production / VPS) ──
    await configureWebhook();
    console.log(`[bot] Webhook configured at ${webhookUrl}/api/bot/webhook`);
    console.log(`[bot] Bot @senangbelajar_bot ready (webhook mode).`);
    // Bot keeps running to handle signals; webhook responses come via Next.js
    await new Promise(() => {}); // hang forever
  } else {
    // ── Polling mode (local dev) ──
    console.log(`[bot] Bot @senangbelajar_bot started in polling mode. Press Ctrl+C to stop.`);
    await bot.launch();
  }
}

main().catch((err) => {
  console.error("[bot] Failed to launch bot:", err);
  process.exit(1);
});
