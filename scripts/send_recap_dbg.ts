import { prisma } from "../src/lib/prisma";

async function main() {
  const a = await prisma.examAttempt.findUnique({
    where: { id: "9375e21d-5e40-4a8e-a4c0-4eff403344ae" },
    include: { student: true, exam: true },
  });
  if (!a) { console.log("attempt tidak ada"); return; }
  console.log("telegramId student:", JSON.stringify(a.student.telegramId));
  console.log("parentTelegramId:", JSON.stringify(a.student.parentTelegramId));
  console.log("score:", a.score, "max:", a.maxScore);

  // Test kirim langsung
  const token = process.env.TELEGRAM_BOT_TOKEN;
  console.log("token ada:", !!token);
  if (token && a.student.telegramId) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: a.student.telegramId, text: "🔧 test recap" }),
    });
    const body = await res.json();
    console.log("send test:", res.status, JSON.stringify(body).slice(0, 200));
  }
}
main().finally(() => process.exit(0));
