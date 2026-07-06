import "dotenv/config";
import { bot } from "./bot";

const WEBHOOK_URL = process.env.BOT_WEBHOOK_URL;

async function main() {
  if (!bot) {
    console.error("[setup-webhook] Bot not configured. Set TELEGRAM_BOT_TOKEN.");
    process.exit(1);
  }
  if (!WEBHOOK_URL) {
    console.error("[setup-webhook] BOT_WEBHOOK_URL not set.");
    console.error("  Export it in .env.production or pass via env:");
    console.error("  BOT_WEBHOOK_URL=https://tutor.example.com npx tsx src/bot/setup-webhook.ts");
    process.exit(1);
  }

  const fullUrl = `${WEBHOOK_URL}/api/bot/webhook`;

  // Check current webhook
  const info = await bot.telegram.getWebhookInfo();
  console.log("Current webhook:", info.url || "(none)");
  console.log("Pending updates:", info.pending_update_count);

  // Set new webhook
  await bot.telegram.setWebhook(fullUrl, {
    drop_pending_updates: true,
  });

  console.log(`✅ Webhook set to: ${fullUrl}`);
  console.log("ℹ️  Bot will now receive updates via webhook.");
  console.log("   Stop any local polling instance first!");
}

main().catch((err) => {
  console.error("[setup-webhook] Failed:", err.message);
  process.exit(1);
});
