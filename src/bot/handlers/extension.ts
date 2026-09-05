import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Price plan & extension config (BCA transfer).
 * Displayed to the student when trial expires and in the admin approval request.
 */
export const EXTENSION_PLANS = [
  { months: 1, price: 100000, label: "1 bulan — Rp 100.000" },
  { months: 3, price: 250000, label: "3 bulan — Rp 250.000" },
  { months: 6, price: 500000, label: "6 bulan — Rp 500.000" },
  { months: 12, price: 800000, label: "1 tahun — Rp 800.000" },
];

export const BCA_ACCOUNT = "4780127169";

/** Shortcut text shown to the student at trial expiry. */
export const TRIAL_EXPIRED_TEXT = `⏰ *Masa trial kamu sudah habis.*

Untuk melanjutkan belajar, transfer ke:
🏦 *BCA* — ${BCA_ACCOUNT}
a.n. *Yuda Trijaya*

💰 Harga langganan:
• 1 bulan — Rp 100.000
• 3 bulan — Rp 250.000
• 6 bulan — Rp 500.000
• 1 tahun — Rp 800.000

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
      `🔔 *Permintaan Perpanjangan Akun*

👤 Nama: *${student.name}*
🆔 ID Siswa: \`${student.studentId}\`
📱 Telegram ID: \`${student.id}\`
⏰ Masa trial sudah habis

💰 Harga langganan:
${EXTENSION_PLANS.map((p) => `• ${p.label}`).join("\n")}

Setelah siswa transfer ke BCA ${BCA_ACCOUNT}, silakan aktifkan akunnya.`,
      { parse_mode: "Markdown" },
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