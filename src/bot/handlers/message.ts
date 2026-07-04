import type { Context } from "telegraf";
import { prisma } from "@/lib/prisma";
import { getSession } from "../session";
import { routeByState } from "../state-machine";
import { handleMessage } from "../agent/tutor";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Main entry point for all incoming Telegram messages.
 *
 * Flow:
 * 1. Look up Student by telegramId
 * 2. Get or create DB session
 * 3. Try state-based routing (quiz answer, etc.)
 * 4. Fall through to intent detection → handler dispatch
 */
export async function onMessage(ctx: Context): Promise<void> {
  if (!ctx.from) return;

  const telegramId = String(ctx.from.id);

  // Look up student by telegramId
  const student = await prisma.student.findUnique({
    where: { telegramId },
  });

  if (!student) {
    // Unknown user — prompt for registration
    await ctx.reply(
      `Halo! 👋 Sepertinya kamu belum terdaftar sebagai siswa.\n\n` +
        `Minta orang tua / wali kamu untuk mendaftarkan kamu dulu ya. ` +
        `Atau hubungi admin untuk info lebih lanjut. 🫶`,
    );
    return;
  }

  // Get or create session
  const session = await getSession(student.id);

  // Try state-based routing first (quiz_active → answer handler)
  const handled = await routeByState(ctx, session, student);

  if (!handled) {
    // Fall through to intent detection
    await handleMessage(ctx, session, student);
  }
}
