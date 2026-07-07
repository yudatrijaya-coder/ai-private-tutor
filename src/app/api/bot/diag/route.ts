import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const results: Record<string, any> = {};

  // Method 1: Direct HTTPS request
  try {
    const https = require("https");
    const url = `https://api.telegram.org/bot${token}/getMe`;
    const resp = await new Promise<any>((resolve, reject) => {
      https.get(url, (res: any) => {
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data.substring(0, 100) });
          }
        });
      }).on("error", reject);
    });
    results.https = resp;
  } catch (e: any) {
    results.https = { error: e.message };
  }

  // Method 2: fetch API
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const body = await resp.json();
    results.fetch = { status: resp.status, body };
  } catch (e: any) {
    results.fetch = { error: e.message };
  }

  return NextResponse.json(results);
}
