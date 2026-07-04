import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  return NextResponse.json({
    configured: !!token,
    mode: token ? "polling" : "off",
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || "",
  });
}
