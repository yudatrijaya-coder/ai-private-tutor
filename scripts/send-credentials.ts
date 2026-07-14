/**
 * Send web credentials (student ID + default password) to all active students
 * who have Telegram linked.
 *
 * Usage: npx tsx scripts/send-credentials.ts
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const DEFAULT_PASSWORD = "belajar123";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function main() {
  const pool = new pg.Pool({
    host: "localhost",
    port: 5432,
    database: "ai_private_tutor",
    user: "tutor",
    password: "tutor123",
  });
  const adapter = new PrismaPg(pool);
  const p = new PrismaClient({ adapter });

  const students = await p.student.findMany({
    where: {
      telegramId: { not: null },
      status: "ACTIVE",
    },
  });

  const gradeLabels: Record<string, string> = {
    SD_5: "SD Kelas 5",
    SMP_1: "SMP Kelas 1",
    SMA_2: "SMA Kelas 2",
  };

  for (const s of students) {
    const label = gradeLabels[s.gradeLevel] || s.gradeLevel;
    let password = DEFAULT_PASSWORD;
    let isNewPassword = false;

    // Kalau belum punya password, set default
    if (!s.passwordHash) {
      const hash = await bcrypt.hash(password, 10);
      await p.student.update({
        where: { id: s.id },
        data: { passwordHash: hash },
      });
      isNewPassword = true;
      console.log(`🔑 Set password for ${s.name} (${s.studentId}): ${password}`);
    } else {
      password = "[existing]";
      console.log(`✅ ${s.name} (${s.studentId}) — already has a password`);
    }

    // Kirim notif via Telegram bot API directly (without importing Telegraf)
    if (s.telegramId && BOT_TOKEN) {
      const msg =
        `🌐 *Dashboard Belajar Kamu!*\n\n` +
        `Halo *${s.name}!*\n\n` +
        `Sekarang kamu bisa akses dashboard belajar online di:\n` +
        `[Buka Dashboard](https://senangbelajar.web.id/login/student)\n\n` +
        `📋 *Data Login Kamu:*\n` +
        `🆔 ID Siswa: \`${s.studentId}\`\n` +
        `🔑 Password: \`${password}\` ${
          isNewPassword ? "(default)" : "(kalo lupa, minta ganti ke admin ya)"
        }\n` +
        `📖 Kelas: ${label}\n\n` +
        `Di dashboard kamu bisa:\n` +
        `📚 Baca materi pelajaran\n` +
        `🧠 Lihat mindmap interaktif\n` +
        `📝 Kerjakan quiz & latihan\n` +
        `📅 Cek jadwal belajar\n` +
        `📊 Lihat progress belajar\n\n` +
        `*Jangan lupa ganti password setelah login pertama ya!* 🔐\n\n` +
        `Semangat belajarnya! 💪🔥`;

      try {
        const res = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: s.telegramId,
              text: msg,
              parse_mode: "Markdown",
            }),
          },
        );
        const data = await res.json();
        if (data.ok) {
          console.log(`📨 Sent credentials to ${s.name} (@${s.telegramId})`);
        } else {
          console.error(
            `❌ Failed to send to ${s.name} (@${s.telegramId}): ${data.description}`,
          );
        }
      } catch (err) {
        console.error(
          `❌ Failed to send to ${s.name} (@${s.telegramId}):`,
          err instanceof Error ? err.message : String(err),
        );
      }
    } else {
      if (!s.telegramId)
        console.log(
          `⚠️  ${s.name} (${s.studentId}) has no telegramId — can't send`,
        );
      if (!BOT_TOKEN) console.log(`⚠️  BOT_TOKEN not set — can't send`);
    }
  }

  await p.$disconnect();
  console.log("\n✅ All done!");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
