import { Quote, Star } from "lucide-react";

/**
 * CATATAN: kutipan di bawah adalah contoh pemasaran, bukan tanggapan orang tua
 * yang sebenarnya. Nama dipakai sebagai ilustrasi. Sebelum kampanye berbayar,
 * ganti dengan testimoni asli beserta izin tertulis dari orang tua bersangkutan —
 * klaim testimoni fiktif berisiko melanggar UU Perlindungan Konsumen No. 8/1999
 * Pasal 9-10 (informasi menyesatkan).
 */
const testimonials = [
  {
    quote:
      "Anak saya yang biasanya susah diminta belajar sekarang buka sendiri aplikasinya sepulang sekolah.",
    author: "Ratna Kusumawati",
    detail: "Ibu dari siswa SD Kelas 5",
  },
  {
    quote:
      "Laporan mingguan di Telegram bikin saya tahu bagian mana yang perlu dibantu di rumah.",
    author: "Hendra Wijaya",
    detail: "Ayah dari siswa SMP Kelas 1",
  },
  {
    quote:
      "Soal yang salah diulang sampai bisa, jadi tidak sekadar selesai lalu lupa.",
    author: "Sari Puspitasari",
    detail: "Ibu dari siswa SMA Kelas 2",
  },
];

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
                <p className="mt-2 font-semibold text-[#292524]">{t.author}</p>
                <p className="text-xs text-[#78716c]">{t.detail}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
