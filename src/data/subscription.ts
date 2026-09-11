/**
 * Subscription & extension plans — single source of truth.
 *
 * Consumed by BOTH:
 *   1. the bot's extension flow (`src/bot/handlers/extension.ts`) — BCA transfer
 *      instructions shown when the trial expires, and
 *   2. the tutor LLM prompt (`src/bot/agent/capabilities.ts`) — so a student who
 *      asks "cara perpanjang gimana?" mid-trial gets the same numbers instead of
 *      a deflection to support.
 *
 * Keep this module dependency-free (no prisma, no telegraf) so it stays safe to
 * import from prompt-building code paths.
 */

export interface ExtensionPlan {
  months: number;
  price: number;
  label: string;
}

export const EXTENSION_PLANS: ExtensionPlan[] = [
  { months: 1, price: 100000, label: "1 bulan — Rp 100.000" },
  { months: 3, price: 250000, label: "3 bulan — Rp 250.000" },
  { months: 6, price: 500000, label: "6 bulan — Rp 500.000" },
  { months: 12, price: 800000, label: "1 tahun — Rp 800.000" },
];

export const BCA_ACCOUNT = "4780127169";
export const BCA_HOLDER = "Yuda Trijaya";

/** Trial length in days — mirrors the 7-day trial set at registration. */
export const TRIAL_DAYS = 7;

/** Bullet list of plans, e.g. "• 1 bulan — Rp 100.000". */
export const PLAN_BULLETS = EXTENSION_PLANS.map((p) => `• ${p.label}`).join("\n");

export interface SubscriptionState {
  /** StudentStatus enum value: PENDING | ACTIVE | TRIAL | PAUSED | ARCHIVED */
  status: string;
  trialEndsAt?: Date | string | null;
  /** IANA timezone for the human-readable trial end date. */
  timezone?: string;
  now?: Date;
}

function formatDate(d: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: timezone,
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Live subscription state for one student, rendered as a prompt block.
 * This is the knowledge the tutor LLM was missing — without it the model
 * invents "hubungi support/admin" because it has no facts to answer with.
 */
export function buildSubscriptionKnowledge(state: SubscriptionState): string {
  const now = state.now ?? new Date();
  const tz = state.timezone || "Asia/Jakarta";

  const lines: string[] = [
    "💳 INFO LANGGANAN & PERPANJANGAN (kamu PUNYA data ini — jawab sendiri, JANGAN bilang \"hubungi support/admin/orang tua\"):",
    `- Status akun siswa: ${state.status}`,
  ];

  if (state.status === "TRIAL" && state.trialEndsAt) {
    const end = new Date(state.trialEndsAt);
    const msLeft = end.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / 86_400_000);
    lines.push(
      daysLeft > 0
        ? `- Masa trial berakhir ${formatDate(end, tz)} — masih ada ${daysLeft} hari lagi.`
        : `- Masa trial SUDAH HABIS sejak ${formatDate(end, tz)}.`,
    );
  } else if (state.status === "ACTIVE") {
    lines.push(
      "- Akun ini sudah aktif penuh (langganan berjalan), tidak sedang dalam masa trial.",
    );
  } else if (state.status === "PAUSED") {
    lines.push("- Akun ini sedang dijeda (pause) oleh admin, bukan soal langganan.");
  }

  lines.push(
    "- Harga langganan (pilih yang paling cocok dengan kebutuhan siswa):",
    ...EXTENSION_PLANS.map((p) => `  • ${p.label}`),
    `- Cara bayar: transfer ke 🏦 BCA ${BCA_ACCOUNT} a.n. ${BCA_HOLDER}.`,
    "- Alur perpanjangan: siswa transfer dulu → lalu kirim permintaan ke admin → admin mengaktifkan akun setelah konfirmasi pembayaran.",
    "- Siswa bisa memicu permintaan itu kapan saja dengan perintah /perpanjang, atau cukup bilang mau perpanjang ke kamu.",
    "",
    "ATURAN MENJAWAB soal langganan:",
    "1. Jawab langsung pakai data di atas. Jangan mengaku tidak tahu, jangan menyuruh siswa menghubungi pihak lain.",
    "2. Sebutkan harga yang relevan dan nomor BCA-nya kalau siswa tanya harga atau cara bayar.",
    "3. Jelaskan prosesnya dengan ramah dan singkat, lalu arahkan supaya tetap lanjut belajar.",
    "4. JANGAN mengarang harga, promo, diskon, nomor rekening, atau tanggal kedaluwarsa selain yang tertulis di atas.",
    "5. Kalau siswa bilang mau perpanjang / minta dihubungi admin, jawab singkat lalu sertakan [EXTENSION:REQUEST] di akhir pesan.",
  );

  return lines.join("\n");
}
