import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { getPersona } from "../personas";
import { handleQuizStart } from "./quiz";

/**
 * /start — admission check.
 * If the student's telegramId is in DB they can proceed;
 * otherwise ask them to register via a parent.
 *
 * Deep links: /start quiz → auto-open the quiz picker.
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

  // Deep-link: t.me/senangbelajar_bot?start=quiz → open quiz picker directly
  const startPayload =
    ctx.message && "text" in ctx.message
      ? ctx.message.text.replace(/^\/start(?:\s+|@\w+)?/, "").trim()
      : "";
  if (/^quiz$/i.test(startPayload)) {
    await handleQuizStart(ctx, student);
    return;
  }

  // Deep-link: t.me/senangbelajar_bot?start=trial → start 7-day trial onboarding
  if (/^trial$/i.test(startPayload)) {
    const { handleTrialStart } = await import("./onboarding");
    await handleTrialStart(ctx);
    return;
  }

  await ctx.reply(
    `${persona.emoji} *${persona.greeting}*\n\n` +
      `Aku siap bantu kamu belajar! Berikut yang bisa kamu lakukan:\n\n` +
      `📚 /materi — Lihat materi pelajaran\n` +
      `📝 /quiz — Kerjakan kuis\n` +
      `📅 /jadwal — Cek jadwal belajar\n` +
      `📊 /nilai — Lihat nilai terakhir\n` +
      `🌐 /web — Buka dashboard di browser\n` +
      `❓ /help — Bantuan perintah\n\n` +
      `Ada yang mau ditanyakan? 😊`,
    { parse_mode: "Markdown" },
  );
}
