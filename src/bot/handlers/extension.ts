import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { addMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { EXTENSION_PLANS, BCA_ACCOUNT, BCA_HOLDER, PLAN_BULLETS } from "@/data/subscription";

/**
 * Price plan & extension config (BCA transfer).
 * Single source of truth lives in `src/data/subscription.ts` so the tutor LLM
 * prompt and this expiry flow can never disagree. Re-exported here for
 * backwards compatibility with existing importers.
 */
export { EXTENSION_PLANS, BCA_ACCOUNT };

/** Shortcut text shown to the student at trial expiry. */
export const TRIAL_EXPIRED_TEXT = `⏰ *Masa trial kamu sudah habis.*

Untuk melanjutkan belajar, transfer ke:
🏦 *BCA* — ${BCA_ACCOUNT}
a.n. *Yuda Trijaya*

💰 Harga langganan:
${PLAN_BULLETS}

Setelah transfer, klik tombol di bawah untuk memberi tahu admin.`;

/** Send a trial-expiry message with a quick "Request extension" button. */
export async function sendTrialExpiredWithButton(ctx: Context): Promise<void> {
  await ctx.reply(TRIAL_EXPIRED_TEXT, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🕐 Request Perpanjangan ke Admin", callback_data: "ext:request" }],
      ],
    },
  });
}

/**
 * Resolve the admin chat id: env ADMIN_TELEGRAM_ID, else the first student's
 * parentTelegramId on record.
 */
export async function getAdminChatId(): Promise<string | null> {
  const envId = process.env.ADMIN_TELEGRAM_ID;
  if (envId) return envId;

  const student = await prisma.student.findFirst({
    where: { parentTelegramId: { not: null } },
    select: { parentTelegramId: true },
  });
  return student?.parentTelegramId ?? null;
}

/**
 * Quick button pressed by the student to ask the admin for an extension.
 * Sends a message to the admin chat, then confirms to the student.
 */
export async function handleExtensionRequest(ctx: Context, student: Student): Promise<void> {
  const adminId = await getAdminChatId();

  if (!adminId) {
    await ctx
      .answerCbQuery("Admin belum tersedia. Hubungi admin lewat web ya 🙏")
      .catch(() => {});
    return;
  }

  try {
    await ctx.telegram.sendMessage(
      adminId,
      `🔔 *Permintaan Perpanjangan Akun*\n\n👤 Nama: *${student.name}*\n🆔 ID Siswa: \`${student.studentId}\`\n📱 Telegram ID: \`${student.telegramId ?? "-"}\`\n⏰ Masa trial sudah habis\n\n💰 Harga langganan:\n${PLAN_BULLETS}\n\nSetelah siswa transfer ke BCA ${BCA_ACCOUNT}, aktifkan akunnya lewat tombol:`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "1 bulan — Rp 100rb", callback_data: `ext:set:${student.studentId}:1` },
              { text: "3 bulan — Rp 250rb", callback_data: `ext:set:${student.studentId}:3` },
            ],
            [
              { text: "6 bulan — Rp 500rb", callback_data: `ext:set:${student.studentId}:6` },
              { text: "1 tahun — Rp 800rb", callback_data: `ext:set:${student.studentId}:12` },
            ],
            [{ text: "❌ Belum Transfer / Tolak", callback_data: `ext:reject:${student.studentId}` }],
          ],
        },
      },
    );
  } catch (err) {
    console.error("[extension] Failed to notify admin:", err);
    await ctx
      .answerCbQuery("Gagal kirim notifikasi admin. Coba lagi nanti ya 🙏")
      .catch(() => {});
    return;
  }

  await ctx.answerCbQuery("Permintaan dikirim ke admin ✅").catch(() => {});
  await ctx.reply(
    `✅ Permintaan perpanjang akun *${student.name}* (_${student.studentId}_) dikirim ke admin. Admin akan mengaktifkan akun kamu setelah konfirmasi pembayaran ya.`,
    { parse_mode: "Markdown" },
  );
}

/**
 * Admin pressed a package button or ❌ on an extension request notification.
 *
 * Fail-closed: only the chat id in `ADMIN_TELEGRAM_ID` may decide — any other
 * user tapping the button gets a refusal and the DB is untouched.
 *
 * Approve → status ACTIVE, trialEndsAt cleared, `subscriptionUntil` extended
 *           by the chosen package (stacking onto any unexpired remainder).
 * Reject  → no DB change; the admin message is marked dismissed and the
 *           student is asked to double-check, since the usual reason is that
 *           the transfer has not actually arrived yet.
 */
export async function handleExtensionDecision(
  ctx: Context,
  action: "set" | "reject",
  studentId: string,
  months?: number,
): Promise<void> {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  const fromId = String(ctx.callbackQuery?.from?.id ?? "");

  if (!adminId || fromId !== adminId) {
    await ctx.answerCbQuery("❌ Hanya admin yang bisa memproses ini.").catch(() => {});
    return;
  }

  const student = await prisma.student.findUnique({ where: { studentId } });
  if (!student) {
    await ctx.answerCbQuery("Siswa tidak ditemukan.").catch(() => {});
    return;
  }

  if (action === "reject") {
    await ctx.answerCbQuery("Ditolak — siswa diberi tahu.").catch(() => {});
    await ctx
      .editMessageText(
        `🔔 Permintaan perpanjangan ${student.name} (${student.studentId}) — ❌ Ditolak/ditunda oleh admin.`,
      )
      .catch(() => {});

    if (student.telegramId) {
      await ctx.telegram
        .sendMessage(
          student.telegramId,
          `⚠️ *Permintaan perpanjangan kamu belum bisa diproses.*\n\n` +
            `Admin belum menerima konfirmasi pembayaran untuk akun *${student.name}*.\n\n` +
            `Mohon cek dulu ya:\n` +
            `• Pastikan transfer ke BCA ${BCA_ACCOUNT} a.n. ${BCA_HOLDER} sudah berhasil\n` +
            `• Kalau sudah transfer, kirim bukti transfer ke admin\n` +
            `• Setelah dikonfirmasi, akun kamu langsung diaktifkan\n\n` +
            `Kalau kamu merasa sudah transfer dan ini keliru, hubungi admin langsung ya 🙏`,
          { parse_mode: "Markdown" },
        )
        .catch((err) => console.warn("[extension] student reject-notify failed:", err));
    }
    console.log(`[extension] rejected ${student.studentId} by admin ${fromId}`);
    return;
  }

  // ── Approve: extend by the chosen package ──
  const plan = EXTENSION_PLANS.find((p) => p.months === months);
  if (!plan) {
    await ctx.answerCbQuery("Paket tidak dikenal.").catch(() => {});
    return;
  }

  // Stack onto any remaining time instead of discarding it — a student who
  // renews before expiry keeps the days they already paid for.
  const now = new Date();
  const current = student.subscriptionUntil;
  const base = current && current.getTime() > now.getTime() ? current : now;
  const until = addMonths(base, plan.months);

  await prisma.student.update({
    where: { id: student.id },
    data: { status: "ACTIVE", trialEndsAt: null, subscriptionUntil: until },
  });

  const untilLabel = until.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  await ctx.answerCbQuery(`✅ ${student.name} aktif s/d ${untilLabel}`).catch(() => {});
  await ctx
    .editMessageText(
      `🔔 Permintaan perpanjangan ${student.name} (${student.studentId}) — ✅ Diaktifkan oleh admin.\n` +
        `Paket: ${plan.label}\nAktif sampai: ${untilLabel}`,
    )
    .catch(() => {});

  if (student.telegramId) {
    await ctx.telegram
      .sendMessage(
        student.telegramId,
        `🎉 *Selamat, ${student.name}!* Akun kamu sudah aktif kembali.\n\n` +
          `📅 Aktif sampai: *${untilLabel}*\n\n` +
          `Silakan lanjut belajar — ketik apa saja di sini atau buka dashboard https://senangbelajar.web.id/student`,
        { parse_mode: "Markdown" },
      )
      .catch((err) => console.warn("[extension] student notify failed:", err));
  }
  console.log(
    `[extension] approved ${student.studentId} +${plan.months}mo until ${until.toISOString()} by admin ${fromId}`,
  );
}