/**
 * Onboarding flow — pendaftaran murid baru via Telegram
 *
 * Flow:
 * 1. /daftar → tanya nama
 * 2. Nama → tanya kelas (SD/SMP/SMA) via inline keyboard
 * 3. Kelas → tanya karakter favorit (Kak Budi/Dewi/Raka)
 * 4. Karakter → tanya hari belajar intensif (multi-select)
 * 5. Hari → konfirmasi + kirim ke admin untuk approval
 * 6. Admin tap "Setujui" → student ACTIVE + welcome
 *
 * State disimpan di in-memory Map (bukan DB SessionState) karena
 * SessionState.studentId punya FK ke Student.id — belum ada student record-nya.
 */

import type { Context } from "telegraf";
import { Markup } from "telegraf";
import { prisma } from "@/lib/prisma";
import { tryCopyFromTemplate } from "@/agents/guardian/admission";
import { createInitialSchedule } from "@/agents/guardian/admission";
import { bot } from "../bot";
import bcrypt from "bcryptjs";

// ─── Types ────────────────────────────────────────────────────

export type OnboardingState =
  | "registering_name"
  | "registering_grade"
  | "registering_character"
  | "registering_days"
  | "registering_confirm";

interface RegistrationData {
  state: OnboardingState;
  telegramId: string;
  name: string;
  grade: string;
  character: string;
  intensiveDays: string[];
  interests?: string;
  studentId: string;
}

// ─── In-memory store ──────────────────────────────────────────

const sessions = new Map<string, RegistrationData>();

/** Auto-expire after 1 hour */
function setSession(telegramId: string, data: RegistrationData): void {
  sessions.set(telegramId, data);
  setTimeout(() => sessions.delete(telegramId), 3600_000);
}

function getSession(telegramId: string): RegistrationData | undefined {
  return sessions.get(telegramId);
}

function deleteSession(telegramId: string): void {
  sessions.delete(telegramId);
}

// ─── Pending registrations awaiting admin approval ────────────

const pendingRegistrations = new Map<string, RegistrationData & { messageId?: number }>();

export function storePendingRegistration(studentId: string, data: any): void {
  pendingRegistrations.set(studentId, data);
  setTimeout(() => pendingRegistrations.delete(studentId), 3600_000);
}

function getPendingRegistration(studentId: string): (RegistrationData & { messageId?: number }) | undefined {
  return pendingRegistrations.get(studentId);
}

// ─── Options ──────────────────────────────────────────────────

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

const CHARACTER_OPTIONS = [
  { key: "KAK_BUDI", label: "Kak Budi", emoji: "🦉", desc: "Seru & sabar — cocok buat SD" },
  { key: "KAK_DEWI", label: "Kak Dewi", emoji: "🌟", desc: "Asyik & santai — cocok buat SMP" },
  { key: "KAK_RAKA", label: "Kak Raka", emoji: "🔥", desc: "Gas pol! — cocok buat SMA" },
] as const;

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;

// ─── Inline keyboards ─────────────────────────────────────────

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

  return Markup.inlineKeyboard([
    buttons.slice(0, 4),
    buttons.slice(4, 7),
    [Markup.button.callback(
      selected.length > 0 ? "✅ Selesai pilih hari" : "⏭ Lewati",
      "onboard_day:done",
    )],
  ]);
}

// ─── Step functions ───────────────────────────────────────────

async function stepName(ctx: Context): Promise<void> {
  await ctx.reply(
    `👋 *Halo!* Ayo daftar belajar bareng!\n\nSiapa nama kamu? 🧒`,
    { parse_mode: "Markdown" },
  );
}

async function stepGrade(ctx: Context, name: string): Promise<void> {
  await ctx.reply(
    `Senang kenalan, *${name}!* 🎉\n\nSekarang kamu kelas berapa?`,
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
  const daysText = data.intensiveDays?.length
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

  await notifyAdmin(ctx, data);
}

// ─── Notify admin ─────────────────────────────────────────────

async function notifyAdmin(ctx: Context, data: RegistrationData): Promise<void> {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId) {
    console.warn("[onboarding] ADMIN_TELEGRAM_ID not set — auto-approving");
    await approveStudent(ctx, data);
    return;
  }

  const daysText = data.intensiveDays?.length
    ? data.intensiveDays.join(", ")
    : "Belum ditentukan";

  // Store in pending map so admin approval can pick it up
  pendingRegistrations.set(data.studentId, { ...data, messageId: ctx.message?.message_id });

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
    await approveStudent(ctx, data);
  }
}

// ─── Approve (create student + welcome) ───────────────────────

async function approveStudent(ctx: Context, data: RegistrationData): Promise<void> {
  // Clear registration data
  deleteSession(data.telegramId);

  const student = await prisma.student.create({
    data: {
      studentId: data.studentId,
      name: data.name,
      gradeLevel: data.grade as any,
      persona: data.character as any,
      interests: data.interests,
      scheduleConfig: { intensiveDays: data.intensiveDays },
      telegramId: data.telegramId,
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

  // Try template copy first (fast, 99-157 topics ready), fallback to AI draft
  const copied = await tryCopyFromTemplate(student.id, data.grade as any);
  if (!copied) {
    const { generateCurriculumDraft } = await import("@/agents/curriculum");
    await generateCurriculumDraft(student.id);
  }

  // Create initial schedule
  await createInitialSchedule(student.id, data.intensiveDays ?? []);

  await ctx.reply(
    `Siap! Sekarang kamu bisa:\n` +
    `📚 /materi — Lihat materi\n📝 /quiz — Kerjakan kuis\n📅 /jadwal — Jadwal belajar\n❓ /help — Bantuan\n\n` +
    `Semangat belajarnya! 💪🔥`,
  );
}

// ─── Entry point: /daftar ─────────────────────────────────────

export async function handleOnboardingStart(ctx: Context): Promise<void> {
  const telegramId = String(ctx.from!.id);

  // Check if already registered
  const existing = await prisma.student.findFirst({
    where: {
      telegramId,
      status: { in: ["ACTIVE", "PENDING"] as any },
    },
  });

  if (existing) {
    await ctx.reply(
      `Kamu sudah terdaftar sebagai *${existing.name}* 🙋\n\nKetik /start untuk mulai belajar.`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // Init registration session
  setSession(telegramId, {
    state: "registering_name",
    telegramId,
    name: "",
    grade: "",
    character: "",
    intensiveDays: [],
    studentId: `STU_${Date.now().toString(36).toUpperCase()}`,
  });

  await stepName(ctx);
}

// ─── Route text messages during registration ──────────────────

export async function handleOnboardingMessage(
  ctx: Context,
): Promise<boolean> {
  const msg = ctx.message;
  if (!msg || !("text" in msg)) return false;

  const telegramId = String(ctx.from!.id);
  const session = getSession(telegramId);
  if (!session) return false;

  const text = msg.text?.trim() ?? "";

  switch (session.state) {
    case "registering_name": {
      const name = text;
      if (name.length < 2) {
        await ctx.reply("Nama kamu terlalu pendek. Coba tulis lagi ya 😊");
        return true;
      }

      session.state = "registering_grade";
      session.name = name;
      setSession(telegramId, session);
      await stepGrade(ctx, name);
      return true;
    }

    default:
      return false;
  }
}

// ─── Route callback queries ──────────────────────────────────

export async function handleOnboardingCallback(ctx: Context): Promise<boolean> {
  if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return false;

  const callbackData = ctx.callbackQuery.data;
  const [action, value] = callbackData.split(":", 2);
  if (!action) return false;

  const telegramId = String(ctx.from!.id);
  const session = getSession(telegramId);

  switch (action) {
    // ── Grade selection ──
    case "onboard_grade": {
      if (!session) return false;
      session.state = "registering_character";
      session.grade = value;
      setSession(telegramId, session);
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
      await stepCharacter(ctx);
      return true;
    }

    // ── Character selection ──
    case "onboard_char": {
      if (!session) return false;
      session.state = "registering_days";
      session.character = value;
      setSession(telegramId, session);
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
      await stepDays(ctx);
      return true;
    }

    // ── Day toggle ──
    case "onboard_day": {
      if (!session) return false;

      if (value === "done") {
        session.state = "registering_confirm";
        setSession(telegramId, session);
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
        await stepConfirm(ctx, session);
      } else {
        // Toggle day
        const days = session.intensiveDays ?? [];
        const idx = days.indexOf(value);
        if (idx >= 0) days.splice(idx, 1);
        else days.push(value);
        session.intensiveDays = days;
        setSession(telegramId, session);
        // Re-render keyboard
        await ctx.editMessageReplyMarkup({
          inline_keyboard: dayKeyboard(days).reply_markup.inline_keyboard,
        }).catch(() => {});
      }
      return true;
    }

    // ── Admin approve ──
    case "approve": {
      await handleAdminApprove(ctx, value);
      return true;
    }

    // ── Admin reject ──
    case "reject": {
      await handleAdminReject(ctx, value);
      return true;
    }

    default:
      return false;
  }
}

// ─── Cancel registration ─────────────────────────────────────

export function cancelRegistration(telegramId: string): boolean {
  const had = sessions.has(telegramId);
  deleteSession(telegramId);
  return had;
}

export function hasActiveRegistration(telegramId: string): boolean {
  return sessions.has(telegramId);
}

// ─── Admin approval handlers ──────────────────────────────────

async function handleAdminApprove(ctx: Context, studentId: string): Promise<void> {
  const regData = getPendingRegistration(studentId);
  if (!regData) {
    await ctx.answerCbQuery("❌ Data pendaftaran tidak ditemukan / kadaluarsa");
    return;
  }

  const DEFAULT_PASSWORD = "belajar123";

  try {
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
        `🌐 *Dashboard Online:* [Buka Dashboard](https://senangbelajar.web.id/login/student)\n` +
        `🆔 ID Siswa: \`${student.studentId}\`\n` +
        `🔑 Password: \`${DEFAULT_PASSWORD}\`\n\n` +
        `*Jangan lupa ganti password setelah login pertama ya!* 🔐\n\n` +
        `Ketik /start untuk mulai chatting, atau buka dashboard di atas! 💪🔥`,
        { parse_mode: "Markdown" },
      );

      // Try template copy first (fast), fallback to AI draft
      const copied = await tryCopyFromTemplate(student.id, regData.grade as any);
      if (!copied) {
        const { generateCurriculumDraft } = await import("@/agents/curriculum");
        await generateCurriculumDraft(student.id);
      }
      await createInitialSchedule(student.id, regData.intensiveDays ?? []);
    }

    // Kirim notif credentials
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await prisma.student.update({
      where: { id: student.id },
      data: { passwordHash },
    });

    await ctx.editMessageText(
      `✅ *Pendaftaran Disetujui!*\n\n👤 ${student.name}\n📖 ${GRADE_LABELS[regData.grade] ?? regData.grade}\n🎯 ${regData.character.replace("KAK_", "Kak ")}`,
      { parse_mode: "Markdown" },
    );

    await ctx.answerCbQuery("✅ Pendaftaran disetujui!");
    pendingRegistrations.delete(studentId);
  } catch (err) {
    console.error("[onboarding] Admin approve error:", err);
    await ctx.answerCbQuery("❌ Gagal menyetujui");
  }
}

async function handleAdminReject(ctx: Context, studentId: string): Promise<void> {
  await ctx.editMessageText("❌ Pendaftaran ditolak.");

  const regData = getPendingRegistration(studentId);
  if (regData?.telegramId) {
    await bot?.telegram.sendMessage(
      regData.telegramId,
      `Maaf, pendaftaran kamu belum bisa disetujui. 😅\n\nCoba daftar lagi atau hubungi admin untuk info lebih lanjut.`,
    );
  }

  await ctx.answerCbQuery("❌ Pendaftaran ditolak");
  pendingRegistrations.delete(studentId);
}
