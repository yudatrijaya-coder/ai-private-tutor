import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { getPersona } from "../personas";

/**
 * Photo / vision handler — placeholder response.
 * Actual image analysis can be added when an AI vision pipeline is ready.
 */
export async function handleVision(ctx: Context, student: Student): Promise<void> {
  const persona = getPersona(student.persona);

  await ctx.reply(
    `${persona.emoji} Kakak lagi liat fotonya ya... 👀\n\n` +
      `Maaf, Kak ${persona.displayName} belum bisa liat gambar sekarang. ` +
      `Tapi nanti fitur ini bakal aktif ya! Tetep semangat belajar! 💪`,
  );
}
