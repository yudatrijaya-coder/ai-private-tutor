import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import type { BotSession } from "../session";
import { getPersona } from "../personas";
import { handleStart } from "../handlers/start";
import { handleQuizStart } from "../handlers/quiz";
import { handleSchedule } from "../handlers/schedule";
import { handleProgress } from "../handlers/progress";
import { handleMaterial } from "../handlers/material";
import { handleVision } from "../handlers/vision";
import { handleGeneric } from "../handlers/generic";

/**
 * Detect intent and route to the correct handler.
 * Called AFTER the state machine has checked for state-specific routing.
 */
export async function handleMessage(
  ctx: Context,
  session: BotSession,
  student: Student,
): Promise<void> {
  const msg = ctx.message;
  if (!msg) return;

  const persona = getPersona(student.persona);

  // --- Command routing ---
  if ("text" in msg) {
    const text = msg.text.trim();

    // /start command
    if (text === "/start") {
      await handleStart(ctx, student);
      return;
    }

    // /quiz command
    if (text === "/quiz") {
      await handleQuizStart(ctx, student);
      return;
    }

    // /jadwal command
    if (text === "/jadwal") {
      await handleSchedule(ctx, student);
      return;
    }

    // /nilai command
    if (text === "/nilai") {
      await handleProgress(ctx, student);
      return;
    }

    // /materi command
    if (text === "/materi") {
      await handleMaterial(ctx, student);
      return;
    }

    // /help command
    if (text === "/help") {
      await ctx.reply(
        `${persona.emoji} *Bantuan Perintah*\n\n` +
          `/start — Mulai / daftar ulang\n` +
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

    // --- Keyword-based intent detection (NLU placeholder) ---

    // "PR" keyword — check if material has quiz
    if (/^.*\bpr\b.*$/i.test(text)) {
      await ctx.reply(
        `${persona.emoji} Mau ngerjakan PR? Coba cek /materi dulu, ` +
          `terus kerjain kuisnya pakai /quiz ya! 📝🔥`,
      );
      return;
    }

    // "susah" / "nggak ngerti" — encouragement
    if (/\b(susah|nggak\s*ngerti|sulit|pusing|bingung)\b/i.test(text)) {
      await ctx.reply(
        `${persona.emoji} Tenang aja, ${student.name}! Semua butuh proses kok. ` +
          `Coba pelan-pelan lagi, atau minta tolong ${persona.displayName} ` +
          `ulangin materinya? 🫶💪`,
      );
      return;
    }

    // Generic — catch all with persona greeting
    await handleGeneric(ctx, student);
    return;
  }

  // --- Photo message ---
  if ("photo" in msg) {
    await handleVision(ctx, student);
    return;
  }

  // --- Other media types ---
  await handleGeneric(ctx, student);
}
