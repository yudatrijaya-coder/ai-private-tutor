/**
 * Onboarding flow — pendaftaran murid baru via Telegram
 *
 * Flow:
 * 1. /daftar → tanya nama
 * 2. Nama → tanya kelas (SD/SMP/SMA)
 * 3. Kelas → tanya karakter favorit (Kak Budi/Dewi/Raka)
 * 4. Karakter → tanya hari belajar intensif
 * 5. Hari → konfirmasi + kirim ke admin untuk approval
 * 6. Admin /approve <studentId> → student jadi ACTIVE + welcome
 */

import type { Context } from "telegraf";
import { Markup } from "telegraf";
import type { BotSession } from "../session";
import { prisma } from "@/lib/prisma";
import { generateCurriculumDraft } from "@/agents/curriculum";
import { getSession, setSession, clearSession } from "../session";
import { bot } from "../bot";

// ─── Grade selection ─────────────────────────────────────────

const GRADE_OPTIONS = [
  { key: "SD_5", label: "SD Kelas 5", emoji: "🎒" },
  { key: "SMP_1", label: "SMP Kelas 1", emoji: "📚" },
  { key: "SMA_2", label: "SMA Kelas 2", emoji: "🎓" },
] as const;

const GRADE_LABELS: Record<string, string> = {
  SD_5: "SD Kelas 5",
  SMP_1: "SMP Kelas 1",
  SMA_2: "SMA Kelas 2",
};

// ─── Character options ────────────────────────────────────────

const CHARACTER_OPTIONS = [
  { key: "KAK_BUDI", label: "Kak Budi", emoji: "🦉", desc: "Seru & sabar — cocok buat SD" },
  { key: "KAK_DEWI", label: "Kak Dewi", emoji: "🌟", desc: "Asyik & santai — cocok buat SMP" },
  { key: "KAK_RAKA", label: "Kak Raka", emoji: "🔥", desc: "Gas pol! — cocok buat SMA" },
] as const;

// ─── Day options ──────────────────────────────────────────────

const DAYS = [
  "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu",
] as const;

// ─── Inline keyboard helpers ──────────────────────────────────

function gradeKeyboard() {
  return Markup.inlineKeyboard(
    GRADE_OPTIONS.map((g) =>
      Markup.button.callback(g.label, `onboard_grade:${g.key}`),
    ),
  );
}

function characterKeyboard() {
  return Markup.inlineKeyboard(
    CHARACTER_OPTIONS.map((c) =>
      Markup.button.callback(`${c.emoji} ${c.label}`, `onboard_char:${c.key}`),
    ),
  );
}

function dayKeyboard(selected: string[] = []) {
  const buttons = DAYS.map((d) => {
    const isSelected = selected.includes(d);
    return Markup.button.callback(
      `${isSelected ? "✅ " : ""}${d}`,
      `onboard_day:${d}`,
    );
  });

  // Split into 2 rows of 4 + 3
  return Markup.inlineKeyboard(
    [
      buttons.slice(0, 4),
      buttons.slice(4, 7),
      [Markup.button.callback(selected.length > 0 ? "✅ Selesai pilih hari" : "⏭ Lewati", "onboard_day:done")],
    ],
  );
}

function confirmKeyboard(studentId: string) {
  return Markup.inlineKeyboard([
    Markup.button.url("✅ Setujui", `https://senangbelajar.web.id/admin/approve?id=${studentId}`),
    Markup.button.callback("❌ Tolak", `onboard_reject:${studentId}`),
  ]);
}

// ─── Step handlers ────────────────────────────────────────────

async function stepName(ctx: Context): Promise<void> {
  await ctx.reply(
    `👋 *Halo!* Ayo daftar belajar bareng!\n\n` +
    `Siapa nama kamu? 🧒`,
    { parse_mode: "Markdown" },
  );
}

async function stepGrade(ctx: Context, name: string): Promise<void> {
  await ctx.reply(
    `Senang kenalan, *${name}!* 🎉\n\n` +
    `Sekarang kamu kelas berapa?`,
    { parse_mode: "Markdown", ...gradeKeyboard() },
  );
}

async function stepCharacter(ctx: Context): Promise<void> {
  await ctx.reply(
    `Mau belajar sama siapa? Pilih tutor favorit kamu! 🎯\n\n` +
    CHARACTER_OPTIONS.map((c) => `${c.emoji} *${c.label}* — ${c.desc}`).join("\n"),
    { parse_mode: "Markdown", ...characterKeyboard() },
  );
}

async function stepDays(ctx: Context): Promise<void> {
  await ctx.reply(
    `Hari apa aja kamu mau belajar intensif? (Bisa pilih lebih dari satu) 🗓️\n\n` +
    `Kalau belum tahu, bisa dilewati dulu.`,
    { parse_mode: "Markdown", ...dayKeyboard() },
  );
}

async function stepConfirm(ctx: Context, data: RegistrationData): Promise<void> {
  const daysText = data.intensiveDays && data.intensiveDays.length > 0
    ? data.intensiveDays.join(", ")
    : "Belum ditentukan";

  await ctx.reply(
    `*Konfirmasi Pendaftaran* 📋\n\n` +
    `👤 Nama: *${data.name}*\n` +
    `📖 Kelas: *${GRADE_LABELS[data.grade] ?? data.grade}*\n` +
    `🎯 Karakter: *${data.character.replace("KAK_", "Kak ")}*\n` +
    `📅 Hari belajar: ${daysText}\n\n` +
    `Udah bener? Kalau iya, aku kirim ke admin buat disetujui ya! 🫶\n\n` +
    `Atau ketik /batal untuk ulang dari awal.`,
    { parse_mode: "Markdown" },
  );

  // Kirim ke admin untuk approval
  await notifyAdmin(ctx, data);
}

// ─── Notify admin ─────────────────────────────────────────────

async function notifyAdmin(ctx: Context, data: RegistrationData): Promise<void> {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId) {
    console.warn("[onboarding] ADMIN_TELEGRAM_ID not set — skipping admin notification");
    // Auto-approve for now
    await autoApprove(ctx, data);
    return;
  }

  const daysText = data.intensiveDays && data.intensiveDays.length > 0
    ? data.intensiveDays.join(", ")
    : "Belum ditentukan";

  try {
    await bot?.telegram.sendMessage(
      adminId,
      `🆕 *Pendaftaran Baru!*\n\n` +
      `👤 Nama: *${data.name}*\n` +
      `📖 Kelas: *${GRADE_LABELS[data.grade] ?? data.grade}*\n` +
      `🎯 Karakter: *${data.character.replace("KAK_", "Kak ")}*\n` +
      `📅 Hari belajar: ${daysText}\n` +
      `🆔 Telegram: @${ctx.from?.username ?? ctx.from?.id}\n\n` +
      `Setujui pendaftaran ini?`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ Setujui", `approve:${data.studentId}`),
            Markup.button.callback("❌ Tolak", `reject:${data.studentId}`),
          ],
        ]),
      },
    );

    await ctx.reply(
      `✅ Data kamu udah dikirim ke admin! Tunggu sebentar ya, admin akan menyetujui pendaftaran kamu 🙏`,
    );
  } catch (err) {
    console.error("[onboarding] Failed to notify admin:", err);
    await autoApprove(ctx, data);
  }
}

// ─── Auto-approve (fallback) ──────────────────────────────────

async function autoApprove(ctx: Context, data: RegistrationData): Promise<void> {
  try {
    // Buat student record
    const student = await prisma.student.create({
      data: {
        studentId: data.studentId,
        name: data.name,
        gradeLevel: data.grade as any,
        persona: data.character as any,
        interests: data.interests,
        scheduleConfig: { intensiveDays: data.intensiveDays },
        telegramId: String(ctx.from!.id),
        status: "ACTIVE",
      },
    });

    await ctx.reply(
      `🎉 *Selamat datang, ${data.name}!* Kamu udah terdaftar!\n\n` +
      `📖 Kelas: *${GRADE_LABELS[data.grade] ?? data.grade}*\n` +
      `🎯 Tutor: *${data.character.replace("KAK_", "Kak ")}*\n\n` +
      `Lagi nyiapin kurikulum untukmu... 📚`,
      { parse_mode: "Markdown" },
    );

    // Generate curriculum
    await generateCurriculumDraft(student.id);

    await ctx.reply(
      `Siap! Sekarang kamu bisa:\n` +
      `📚 /materi — Lihat materi\n📝 /quiz — Kerjakan kuis\n📅 /jadwal — Jadwal belajar\n❓ /help — Bantuan\n\n` +
      `Semangat belajarnya! 💪🔥`,
    );
  } catch (err) {
    console.error("[onboarding] Auto-approve failed:", err);
    await ctx.reply("Maaf, terjadi kesalahan. Coba lagi nanti ya 🙏");
  }
}

// ─── Registration data type ───────────────────────────────────

interface RegistrationData {
  name: string;
  grade: string;
  character: string;
  intensiveDays: string[];
  interests?: string;
  studentId: string;
}

// ─── Main entry — start registration ──────────────────────────

export async function handleOnboardingStart(ctx: Context): Promise<void> {
  const telegramId = String(ctx.from!.id);

  // Check if already registered
  const existing = await prisma.student.findFirst({
    where: { telegramId, status: { in: ["ACTIVE", "PENDING"] } },
  });

  if (existing) {
    await ctx.reply(
      `Kamu sudah terdaftar sebagai *${existing.name}* 🙋\n\n` +
      `Ketik /start untuk mulai belajar.`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // Generate temporary studentId
  const tempId = `NEW_${Date.now().toString(36).toUpperCase()}`;

  // Simpan state awal
  const sessionId = `anon_${telegramId}`;
  await setSession(sessionId, {
    currentMode: "registering_name",
    context: { registrationData: { studentId: tempId } },
  });

  await stepName(ctx);
}

// ─── Route onboarding messages by state ───────────────────────

export async function handleOnboardingMessage(
  ctx: Context,
  session: BotSession,
): Promise<boolean> {
  const msg = ctx.message;
  if (!msg || !("text" in msg)) return false;

  const text = msg.text?.trim() ?? "";
  const context = session.context ?? {};
  const data = (context.registrationData ?? { studentId: null }) as RegistrationData;

  switch (session.currentMode) {
    case "registering_name": {
      if (text.length < 2) {
        await ctx.reply("Nama kamu terlalu pendek. Coba tulis lagi ya 😊");
        return true;
      }
      data.name = text;
      data.studentId = `STU_${Date.now().toString(36).toUpperCase()}`;
      await setSession(session.studentId, {
        currentMode: "registering_grade",
        context: { registrationData: data },
      });
      await stepGrade(ctx, text);
      return true;
    }

    default:
      return false;
  }
}

// ─── Handle callback queries ──────────────────────────────────

export async function handleOnboardingCallback(ctx: Context): Promise<void> {
  if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return;

  const callbackData = ctx.callbackQuery.data;
  const [action, value] = callbackData.split(":", 2);
  if (!action) return;

  // Extract telegramId from callback query
  const telegramId = String(ctx.from!.id);
  const sessionId = `anon_${telegramId}`;
  const session = await getSession(sessionId);
  const regData = (session.context?.registrationData ?? {}) as RegistrationData;

  switch (action) {
    case "onboard_grade": {
      regData.grade = value;
      await setSession(sessionId, {
        currentMode: "registering_character",
        context: { registrationData: regData },
      });
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      await stepCharacter(ctx);
      break;
    }

    case "onboard_char": {
      regData.character = value;
      await setSession(sessionId, {
        currentMode: "registering_days",
        context: { registrationData: regData },
      });
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      await stepDays(ctx);
      break;
    }

    case "onboard_day": {
      if (value === "done") {
        await setSession(sessionId, {
          currentMode: "registering_confirm",
          context: { registrationData: regData },
        });
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await stepConfirm(ctx, regData);
      } else {
        // Toggle day selection
        const days = regData.intensiveDays ?? [];
        const idx = days.indexOf(value);
        if (idx >= 0) days.splice(idx, 1);
        else days.push(value);
        regData.intensiveDays = days;
        await setSession(sessionId, {
          currentMode: "registering_days",
          context: { registrationData: regData },
        });
        // Re-render keyboard
        await ctx.editMessageReplyMarkup({
          inline_keyboard: dayKeyboard(days).reply_markup.inline_keyboard,
        });
      }
      break;
    }

    case "approve": {
      await handleAdminApprove(ctx, value);
      break;
    }

    case "reject": {
      await handleAdminReject(ctx, value);
      break;
    }

    case "onboard_reject": {
      await ctx.editMessageText("❌ Pendaftaran ditolak.");
      break;
    }
  }
}

// ─── Admin approval ───────────────────────────────────────────

async function handleAdminApprove(ctx: Context, studentId: string): Promise<void> {
  try {
    // Find the pending student record (created during autoApprove or pending)
    // Actually, for the flow where admin approves after notification, the student
    // was not yet created. We need to look for the studentId from registrationData.

    // For now, let's use the simpler approach: admin receives notification,
    // we create the student when they approve.

    // Extract registration data from the message context
    const regData = await getPendingRegistration(studentId);
    if (!regData) {
      await ctx.answerCbQuery("❌ Data pendaftaran tidak ditemukan");
      return;
    }

    const student = await prisma.student.create({
      data: {
        studentId: regData.studentId,
        name: regData.name,
        gradeLevel: regData.grade as any,
        persona: regData.character as any,
        interests: regData.interests,
        scheduleConfig: { intensiveDays: regData.intensiveDays },
        telegramId: regData.telegramId,
        status: "ACTIVE",
      },
    });

    // Notify student
    if (student.telegramId) {
      await bot?.telegram.sendMessage(
        student.telegramId,
        `🎉 *Selamat!* Kamu udah diterima!\n\n` +
        `Halo *${student.name}*, admin sudah menyetujui pendaftaran kamu. Sekarang kamu bisa mulai belajar! 🚀\n\n` +
        `Ketik /start untuk memulai!`,
        { parse_mode: "Markdown" },
      );

      // Generate curriculum
      await generateCurriculumDraft(student.id);
    }

    await ctx.editMessageText(
      ctx.callbackQuery && "message" in ctx.callbackQuery
        ? `✅ *Pendaftaran Disetujui!*\n\n👤 ${student.name}\n📖 ${GRADE_LABELS[regData.grade] ?? regData.grade}\n🎯 ${regData.character.replace("KAK_", "Kak ")}`
        : "✅ Disetujui!",
      { parse_mode: "Markdown" },
    );

    await ctx.answerCbQuery("✅ Pendaftaran disetujui!");
  } catch (err) {
    console.error("[onboarding] Admin approve error:", err);
    await ctx.answerCbQuery("❌ Gagal menyetujui");
  }
}

async function handleAdminReject(ctx: Context, studentId: string): Promise<void> {
  try {
    await ctx.editMessageText("❌ Pendaftaran ditolak.");

    const regData = await getPendingRegistration(studentId);
    if (regData?.telegramId) {
      await bot?.telegram.sendMessage(
        regData.telegramId,
        `Maaf, pendaftaran kamu belum bisa disetujui. 😅\n\n` +
        `Coba daftar lagi atau hubungi admin untuk info lebih lanjut.`,
      );
    }

    await ctx.answerCbQuery("❌ Pendaftaran ditolak");
  } catch (err) {
    console.error("[onboarding] Admin reject error:", err);
  }
}

// Simple in-memory store for pending registrations (since they're not in DB yet)
const pendingRegistrations = new Map<string, any>();

export function storePendingRegistration(studentId: string, data: any): void {
  pendingRegistrations.set(studentId, data);
  // Auto-expire after 1 hour
  setTimeout(() => pendingRegistrations.delete(studentId), 3600_000);
}

async function getPendingRegistration(studentId: string): Promise<any | null> {
  return pendingRegistrations.get(studentId) ?? null;
}
