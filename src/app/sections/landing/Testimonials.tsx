import { Quote, Star } from "lucide-react";

/**
 * PERLU DIGANTI DENGAN TESTIMONI ASLI.
 *
 * Kutipan di bawah masih contoh (ditandai "Contoh") dan tidak boleh dipublikasikan
 * sebagai testimoni nyata tanpa izin tertulis dari orang tua bersangkutan.
 * Ganti `quote`, `author`, `detail` dengan tanggapan asli, lalu hapus flag
 * `isPlaceholder` agar badge "Contoh" hilang dari tampilan.
 */
const testimonials = [
  {
    quote:
      "Anak saya yang biasanya susah diminta belajar sekarang buka sendiri aplikasinya sepulang sekolah.",
    author: "Orang tua siswa",
    detail: "SD Kelas 5",
    isPlaceholder: true,
  },
  {
    quote:
      "Laporan mingguan di Telegram bikin saya tahu bagian mana yang perlu dibantu di rumah.",
    author: "Orang tua siswa",
    detail: "SMP Kelas 1",
    isPlaceholder: true,
  },
  {
    quote:
      "Soal yang salah diulang sampai bisa, jadi tidak sekadar selesai lalu lupa.",
    author: "Orang tua siswa",
    detail: "SMA Kelas 2",
    isPlaceholder: true,
  },
];

const anyPlaceholder = testimonials.some((t) => t.isPlaceholder);

export default function Testimonials() {
  return (
    <section className="bg-[#FFF7ED] px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-[#292524] [font-family:var(--font-display)] md:text-4xl">
            Kata orang tua
          </h2>
          <p className="mt-3 text-[#78716c]">
            Cerita dari keluarga yang mendampingi anaknya belajar dengan Senang Belajar.
          </p>
          {anyPlaceholder && (
            <p className="mx-auto mt-4 inline-block rounded-full bg-amber-100 px-4 py-1 text-xs font-semibold text-amber-800">
              ⚠️ Contoh tampilan — menunggu tanggapan asli orang tua sebelum dipublikasikan
            </p>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <figure
              key={i}
              className="flex flex-col rounded-2xl border border-orange-100 bg-white p-6 shadow-sm"
            >
              <Quote className="mb-4 text-orange-200" size={28} />
              <blockquote className="flex-1 text-[#292524]">“{t.quote}”</blockquote>
              <figcaption className="mt-5 border-t border-orange-100 pt-4 text-sm">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={13} fill="currentColor" />
                  ))}
                </div>
                <p className="mt-2 font-semibold text-[#292524]">
                  {t.author}
                  {t.isPlaceholder && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                      Contoh
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#78716c]">{t.detail}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
