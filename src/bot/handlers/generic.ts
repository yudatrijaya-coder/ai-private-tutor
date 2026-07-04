import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { getPersona } from "../personas";

/**
 * Generic catch-all message handler.
 * Responds with persona greeting and offers help.
 */
export async function handleGeneric(ctx: Context, student: Student): Promise<void> {
  const persona = getPersona(student.persona);

  if (!student.telegramId) {
    await ctx.reply(
      `Halo! 👋 Sepertinya kamu belum terdaftar. ` +
        `Minta orang tua / wali untuk daftarkan kamu dulu ya!`,
    );
    return;
  }

  await ctx.reply(
    `${persona.emoji} *${persona.greeting}*\n\n` +
      `Ada yang bisa ${persona.displayName} bantu?\n\n` +
      `📚 /materi — Lihat materi\n` +
      `📝 /quiz — Kerjakan kuis\n` +
      `📅 /jadwal — Cek jadwal\n` +
      `📊 /nilai — Lihat nilai\n` +
      `❓ /help — Bantuan`,
    { parse_mode: "Markdown" },
  );
}
