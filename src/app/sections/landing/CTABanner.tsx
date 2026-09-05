import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

const TELEGRAM_BOT_URL = "https://t.me/senangbelajar_bot?start=trial";

export default function CTABanner() {
  return (
    <section className="bg-gradient-to-r from-[#f97316] to-orange-500 px-4 py-16 text-center text-white">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold [font-family:var(--font-display)] md:text-4xl">
          Siap buat anak belajar lebih senang?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/90">
          Daftar gratis dan mulai chat dengan Kakak AI hari ini.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-[#f97316] shadow hover:bg-orange-50 transition"
          >
            <MessageCircle size={18} />
            Daftar via Telegram
          </a>
          <Link
            href="/login/student"
            className="inline-flex items-center gap-2 rounded-full border-2 border-white px-6 py-3 text-base font-semibold text-white hover:bg-white/10 transition"
          >
            Login Siswa <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
