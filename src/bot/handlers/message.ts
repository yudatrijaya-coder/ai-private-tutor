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
import { handleSchoolSchedule, handleNextSubject } from "./school-schedule";
import { handleMaterial } from "./material";
import { handleYoutubeSummary, handleVideoRecommendation } from "./youtube";
import {
  handleParentRegister,
  handleProgress,
  handleReport,
  handleWarning,
} from "./parent";
import { handleOnboardingStart } from "./onboarding";
import { hasActiveRegistration, cancelRegistration, handleOnboardingMessage } from "./onboarding";
import { routeCallback } from "../state-machine";

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
      // /daftar with ID — link existing student record
      const daftarWithId = text.match(/^\/daftar\s+(.+)$/i);
      if (daftarWithId) {
        await handleRegister(ctx, daftarWithId[1]);
        return;
      }

      // /daftar without args — start onboarding flow
      if (/^\/daftar$/i.test(text)) {
        await handleOnboardingStart(ctx);
        return;
      }

      // /batal — cancel any ongoing registration
      if (/^\/batal$/i.test(text)) {
        if (cancelRegistration(telegramId)) {
          await ctx.reply("Pendaftaran dibatalkan. Ketik /daftar kalau mau mulai lagi 😊");
          return;
        }
        // If not registering, let it fall through
      }

      const parentDaftar = text.match(/^\/parent_daftar\s+(.+)$/i);
      if (parentDaftar) {
        await handleParentRegister(ctx, parentDaftar[1]);
        return;
      }
    }

    // ── Step 1.5: Check active registration (before student lookup) ──
    // If user is in registration flow, they don't have a student record yet.
    if (hasActiveRegistration(telegramId)) {
      const handled = await handleOnboardingMessage(ctx);
      if (handled) return;
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
      // ── Check if student is PAUSED ──
      if (student.status === "PAUSED") {
        const mode = (student as any).holdMode === "HARD" ? "🔒 *Hard Hold*" : "⏸️ *Hold/Pause*";
        const msg = (student as any).holdMode === "HARD"
          ? `${mode}\n\nAkun kamu diblokir sepenuhnya. Semua fitur belajar tidak bisa diakses.\nHubungi admin untuk info lebih lanjut.\n\nKalau kamu merasa ini salah, hubungi orang tua ya! 😊`
          : `${mode}\n\nSaat ini kamu tidak bisa mengakses fitur belajar. Hubungi admin untuk info lebih lanjut.\n\nKalau kamu merasa ini salah, hubungi orang tua ya! 😊`;
        await ctx.reply(msg, { parse_mode: "Markdown" });
        return;
      }

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
                          `/jadwal_sekolah — Cek jadwal sekolah asli 🏫\n` +
                          `/web — Buka dashboard di browser\n` +
                          `/nilai — Lihat nilai dan progres\n` +
                          `/help — Tampilkan bantuan ini\n\n` +
                          `Atau cukup tanya aja langsung! 😊`,
            { parse_mode: "Markdown" },
          );
          return;
        }

        // /web command — send dashboard link
        if ("text" in msg && /^\/web$/i.test(msg.text?.trim() ?? "")) {
          const dashboardUrl = `https://senangbelajar.web.id/student`;
          const parts = [
            "🌐 *Dashboard Belajar*",
            "",
            "Klik link di bawah untuk buka dashboard kamu:",
            `[Buka Dashboard](${dashboardUrl})`,
            "",
            "Di dashboard kamu bisa:",
            "📚 Lihat materi pelajaran",
            "🧠 Mindmap interaktif",
            "📝 Quiz & latihan",
            "📊 Progress belajar",
            "📅 Jadwal belajar",
            "",
            "Login pakai ID siswa dan password kamu ya! 🔑",
          ];
          await ctx.reply(parts.join("\n"), { parse_mode: "Markdown" });
          return;
        }

        // Fall through to LLM-powered tutor
        const response = await handleMessage(ctx, session, student);

        if (response) {
          const respText = response;

          // ── Check for REMINDER / HOMEWORK / PASSWORD intents ──
          if (/\[REMINDER/i.test(respText) || /\[HOMEWORK/i.test(respText) || /\[PASSWORD/i.test(respText)) {
            await handleReminderCommand(ctx, student, respText);
            return;
          }

          if (/\[QUIZ\]/i.test(respText)) {
            await handleQuizStart(ctx, student);
            return;
          }
          if (/\[SCHEDULE\]/i.test(respText)) {
            await handleSchedule(ctx, student, respText);
            return;
          }

          // ── SCHOOL_SCHEDULE intent — jadwal sekolah asli ──
          const schoolSchedMatch = respText.match(/\[SCHOOL_SCHEDULE(?::([^\]]+))?\]/i);
          if (schoolSchedMatch) {
            const subCmd = schoolSchedMatch[1] ?? "";
            // Check for NEXT:subject
            const nextMatch = subCmd.match(/^NEXT:(.+)$/i);
            if (nextMatch) {
              await handleNextSubject(ctx, student, nextMatch[1].trim());
            } else {
              await handleSchoolSchedule(ctx, student, respText);
            }
            return;
          }
          if (/\[MATERIALS\]/i.test(respText)) {
            await handleMaterial(ctx, student);
            return;
          }

          // ── Check for YOUTUBE intent ──
          const ytMatch = respText.match(/\[YOUTUBE:([a-zA-Z0-9_-]{11})\]/);
          if (ytMatch) {
            await handleYoutubeSummary(ctx, student, ytMatch[1]);
            return;
          }

          // ── Check for VIDEOS intent (recommend from curated database) ──
          const videoMatch = respText.match(/\[VIDEOS:(.+?)\]/i);
          if (videoMatch) {
            await handleVideoRecommendation(ctx, student, videoMatch[1].trim());
            return;
          }

          // ── Check for DASHBOARD intent ──
          if (/\[DASHBOARD\]/i.test(respText)) {
            const cleaned = respText.replace(/\[DASHBOARD\]/gi, "").trim();
            const dashboardUrl = "https://senangbelajar.web.id/student";
            const msg = cleaned
              ? `${cleaned}\n\n🌐 *Dashboard:* [Klik di sini](${dashboardUrl})`
              : `🌐 *Dashboard Belajar*\nKlik link di bawah:\n[Buka Dashboard](${dashboardUrl})`;
            await ctx.reply(msg, { parse_mode: "Markdown" });
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
