import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  if (!url || !url.startsWith("https://")) {
    return NextResponse.json(
      { error: "URL harus dimulai dengan https://" },
      { status: 400 },
    );
  }

  // Save to .env (local dev override)
  const envPath = join(process.cwd(), ".env");
  let envContent = "";
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, "utf-8");
  }

  const lines = envContent.split("\n").filter(
    (l) => !l.startsWith("TELEGRAM_WEBHOOK_URL="),
  );
  lines.push(`TELEGRAM_WEBHOOK_URL=${url}`);
  writeFileSync(envPath, lines.join("\n") + "\n");

  process.env.TELEGRAM_WEBHOOK_URL = url;

  return NextResponse.json({ ok: true, webhookUrl: url });
}
