import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { getPersona } from "../personas";

/**
 * /start — admission check.
 * If the student's telegramId is in DB they can proceed;
 * otherwise ask them to register via a parent.
 */
export async function handleStart(ctx: Context, student: Student): Promise<void> {
  const persona = getPersona(student.persona);

  if (!student.telegramId) {
    await ctx.reply(
      `Halo! Sepertinya kamu belum terdaftar. 🤔\n\n` +
        `Minta orang tua / wali kamu untuk mendaftarkan kamu dulu ya. ` +
        `Kakak ${persona.displayName} tunggu! 🫶`,
    );
    return;
  }

  await ctx.reply(
    `${persona.emoji} *${persona.greeting}*\n\n` +
      `Aku siap bantu kamu belajar! Berikut yang bisa kamu lakukan:\n\n` +
      `📚 /materi — Lihat materi pelajaran\n` +
      `📝 /quiz — Kerjakan kuis\n` +
      `📅 /jadwal — Cek jadwal belajar\n` +
      `📊 /nilai — Lihat nilai terakhir\n` +
      `❓ /help — Bantuan perintah\n\n` +
      `Ada yang mau ditanyakan? 😊`,
    { parse_mode: "Markdown" },
  );
}
