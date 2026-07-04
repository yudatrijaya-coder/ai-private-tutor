import type { Context } from "telegraf";
import { prisma } from "@/lib/prisma";
import { getSession } from "../session";
import { routeByState } from "../state-machine";
import { handleMessage } from "../agent/tutor";
import { handleStart } from "./start";
import { handleRegister } from "./register";
import { handleQuizStart } from "./quiz";
import { handleSchedule } from "./schedule";
import { handleMaterial } from "./material";
import { handleProgress } from "./progress";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Main entry point for all incoming Telegram messages.
 *
 * Flow:
 * 1. Look up Student by telegramId
 * 2. Get or create DB session
 * 3. Try state-based routing (quiz answer, photo, etc.)
 * 4. Fall through to LLM-powered tutor intent detection
 * 5. Check LLM response for command brackets [QUIZ], [SCHEDULE], etc.
 */
export async function onMessage(ctx: Context): Promise<void> {
  if (!ctx.from) return;

  const telegramId = String(ctx.from.id);

  // ── /daftar command — MUST be handled before telegramId lookup ──
  const msg = ctx.message;
  if (msg && "text" in msg) {
    const text = msg.text.trim();
    const daftarMatch = text.match(/^\/daftar\s+(.+)$/i);
    if (daftarMatch) {
      await handleRegister(ctx, daftarMatch[1]);
      return;
    }
  }

  // Look up student by telegramId
  const student = await prisma.student.findUnique({
    where: { telegramId },
  });

  if (!student) {
    // Unknown user — prompt for registration
    await ctx.reply(
      `Halo! 👋 Sepertinya kamu belum terdaftar sebagai siswa.\n\n` +
        `Kalau kamu punya ID siswa, ketik:\n` +
        `/daftar _ID_SISWA_\n\n` +
        `Contoh: /daftar ANDI001\n\n` +
        `Atau minta orang tua / admin untuk mendaftarkan kamu. 🫶`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // Get or create session
  const session = await getSession(student.id);

  // Try state-based routing first (quiz_active → answer handler, photo → vision)
  const handled = await routeByState(ctx, session, student);

  if (!handled) {
    const msg = ctx.message;
    if (!msg) return;

    // /quiz command — direct routing
    if ("text" in msg && /^\/(quiz|kuis)$/i.test(msg.text.trim())) {
      await handleQuizStart(ctx, student);
      return;
    }

    // /start command — direct routing, bypass LLM
    if ("text" in msg && msg.text.trim() === "/start") {
      await handleStart(ctx, student);
      return;
    }

    // /help command — direct routing
    if ("text" in msg && msg.text.trim() === "/help") {
      const { getPersona } = await import("../personas");
      const persona = getPersona(student.persona);
      await ctx.reply(
        `${persona.emoji} *Bantuan Perintah*\n\n` +
          `/start — Mulai / daftar ulang\n` +
            `/daftar _ID_ — Hubungkan akun Telegram dengan ID siswa\n` +
            `/materi — Lihat materi pelajaran\n` +
          `/quiz — Kerjakan kuis\n` +
          `/jadwal — Cek jadwal belajar\n` +
          `/nilai — Lihat nilai dan progres\n` +
          `/help — Tampilkan bantuan ini\n\n` +
          `Atau cukup tanya aja langsung! 😊`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    // Fall through to LLM-powered tutor
    const response = await handleMessage(ctx, session, student);

    if (response) {
      // Intent detection from LLM response — check for command brackets
      const text = response;

      if (/\[QUIZ\]/i.test(text)) {
        await handleQuizStart(ctx, student);
        return;
      }
      if (/\[SCHEDULE\]/i.test(text)) {
        await handleSchedule(ctx, student);
        return;
      }
      if (/\[MATERIALS\]/i.test(text)) {
        await handleMaterial(ctx, student);
        return;
      }

      // Send the LLM response
      await ctx.reply(text);
    }
  }
}
