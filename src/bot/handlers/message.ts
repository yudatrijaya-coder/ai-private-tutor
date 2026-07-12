import type { Context } from "telegraf";
import { prisma } from "@/lib/prisma";
import { getSession } from "../session";
import { routeByState } from "../state-machine";
import { handleMessage } from "../agent/tutor";
import { handleStart } from "./start";
import { handleRegister } from "./register";
import { handleReminderCommand, processPendingReminders } from "../agent/reminder";
import { handleQuizStart } from "./quiz";
import { handleSchedule } from "./schedule";
import { handleMaterial } from "./material";
import {
  handleParentRegister,
  handleProgress,
  handleReport,
  handleWarning,
} from "./parent";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/** Parent-only commands */
const PARENT_COMMANDS = new Set([
  "/progres", "/progress",
  "/laporan", "/report",
  "/peringatan", "/warning",
]);

/**
 * Route a parent command to the appropriate handler.
 */
async function handleParentCommand(
  ctx: Context,
  text: string,
  student: { id: string; name: string },
): Promise<void> {
  switch (text) {
    case "/progres":
    case "/progress":
      await handleProgress(ctx, student as any);
      break;
    case "/laporan":
    case "/report":
      await handleReport(ctx, student as any);
      break;
    case "/peringatan":
    case "/warning":
      await handleWarning(ctx, student as any);
      break;
    default:
      await ctx.reply(
        `Halo! Kamu terdaftar sebagai orang tua dari *${student.name}*.\n\n` +
          `Ketik /help untuk melihat perintah yang tersedia.`,
        { parse_mode: "Markdown" },
      );
  }
}

/**
 * Main entry point for all incoming Telegram messages.
 *
 * Role detection order:
 * 1. Registration commands (/daftar, /parent_daftar)
 * 2. Parent commands → check parentTelegramId
 * 3. Student → check telegramId
 * 4. Not registered → prompt
 */
export async function onMessage(ctx: Context): Promise<void> {
  try {
    if (!ctx.from) return;

    const telegramId = String(ctx.from.id);
    const msg = ctx.message;
    const text = msg && "text" in msg ? (msg.text?.trim() ?? "") : "";

    // ── Step 1: Registration commands ──
    if (text) {
      const daftar = text.match(/^\/daftar\s+(.+)$/i);
      if (daftar) {
        await handleRegister(ctx, daftar[1]);
        return;
      }

      const parentDaftar = text.match(/^\/parent_daftar\s+(.+)$/i);
      if (parentDaftar) {
        await handleParentRegister(ctx, parentDaftar[1]);
        return;
      }
    }

    // ── Step 2: Parent commands (check parentTelegramId first) ──
    if (text && PARENT_COMMANDS.has(text)) {
      const parentStudent = await prisma.student.findFirst({
        where: { parentTelegramId: telegramId },
      });
      if (parentStudent) {
        if (text === "/help") {
          await ctx.reply(
            `*Bantuan Orang Tua*\n\n` +
              `/parent_daftar _ID_ — Hubungkan ke siswa\n` +
              `/progres — Lihat progress belajar\n` +
              `/laporan — Laporan mingguan\n` +
              `/peringatan — Early warning\n` +
              `/help — Bantuan ini`,
            { parse_mode: "Markdown" },
          );
          return;
        }
        await handleParentCommand(ctx, text, parentStudent);
        return;
      }
    }

    // ── Step 3: Look up by telegramId (student) ──
    const student = await prisma.student.findUnique({
      where: { telegramId },
    });

    if (student) {
      const session = await getSession(student.id);
      const handled = await routeByState(ctx, session, student);

      if (!handled) {
        const msg = ctx.message;
        if (!msg) return;

        if ("text" in msg && /^\/(quiz|kuis)$/i.test(msg.text?.trim() ?? "")) {
          await handleQuizStart(ctx, student);
          return;
        }

        if ("text" in msg && msg.text?.trim() === "/start") {
          await handleStart(ctx, student);
          return;
        }

        if ("text" in msg && msg.text?.trim() === "/help") {
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
          const respText = response;

          // ── Check for REMINDER / HOMEWORK intents (multi-line JSON) ──
          if (/\[REMINDER/i.test(respText) || /\[HOMEWORK/i.test(respText)) {
            await handleReminderCommand(ctx, student, respText);
            return;
          }

          if (/\[QUIZ\]/i.test(respText)) {
            await handleQuizStart(ctx, student);
            return;
          }
          if (/\[SCHEDULE\]/i.test(respText)) {
            await handleSchedule(ctx, student);
            return;
          }
          if (/\[MATERIALS\]/i.test(respText)) {
            await handleMaterial(ctx, student);
            return;
          }

          await ctx.reply(respText);
        }
      }
      return;
    }

    // ── Step 4: Check parentTelegramId for non-parent-command messages ──
    if (text) {
      const parentStudent = await prisma.student.findFirst({
        where: { parentTelegramId: telegramId },
      });
      if (parentStudent) {
        if (text === "/help") {
          await ctx.reply(
            `*Bantuan Orang Tua*\n\n` +
              `/parent_daftar _ID_ — Hubungkan ke siswa\n` +
              `/progres — Lihat progress belajar\n` +
              `/laporan — Laporan mingguan\n` +
              `/peringatan — Early warning\n` +
              `/help — Bantuan ini`,
            { parse_mode: "Markdown" },
          );
          return;
        }
        // Unknown parent command — show help
        await ctx.reply(
          `Halo! Kamu terdaftar sebagai orang tua dari *${parentStudent.name}*.\n\n` +
            `Ketik /help untuk melihat perintah yang tersedia.`,
          { parse_mode: "Markdown" },
        );
        return;
      }
    }

    // ── Step 5: Not registered ──
    await ctx.reply(
      [
        "Halo! 👋 Sepertinya kamu belum terdaftar.",
        "",
        "📌 *Untuk siswa:*",
        "/daftar ID_SISWA — Contoh: /daftar ANDI001",
        "",
        "📌 *Untuk orang tua:*",
        "/parent_daftar ID_SISWA — Contoh: /parent_daftar ANDI001",
        "",
        "Atau minta admin untuk mendaftarkan kamu 🫶",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
  } catch (err) {
    console.error("[bot/onMessage] UNCAUGHT:", err instanceof Error ? err.message : String(err));
  }
}
