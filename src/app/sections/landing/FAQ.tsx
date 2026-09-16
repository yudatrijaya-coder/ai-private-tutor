import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Berapa biayanya?",
    a: "Ada masa coba gratis 7 hari lewat bot Telegram, tanpa perlu data pembayaran. Setelah masa coba berakhir, biaya langganan diinformasikan langsung oleh admin sebelum diperpanjang — tidak ada penagihan otomatis.",
  },
  {
    q: "Apakah aman untuk anak?",
    a: "Percakapan anak hanya dipakai untuk keperluan belajar dan pemantauan orang tua. Tidak ada iklan di dalam aplikasi, dan setiap siswa hanya bisa melihat datanya sendiri — orang tua memakai akun terpisah untuk memantau.",
  },
  {
    q: "Bagaimana orang tua tahu anak benar-benar belajar?",
    a: "Ada dua jalur: laporan mingguan otomatis lewat Telegram (berisi waktu belajar, nilai kuis, dan topik yang masih lemah), serta dashboard orang tua yang bisa dibuka kapan saja di web.",
  },
  {
    q: "Siapa yang mengajar anak saya?",
    a: "Tiga persona Kakak AI dengan karakter berbeda sesuai jenjang: Kak Budi untuk SD (ramah dan sederhana), Kak Dewi untuk SMP (suportif), dan Kak Raka untuk SMA (energik dan memotivasi). Semuanya menjawab berdasarkan materi kurikulum yang sudah disusun, bukan jawaban bebas.",
  },
  {
    q: "Bagaimana cara mulai?",
    a: "Klik tombol Daftar Gratis, lalu chat bot Telegram. Anak akan dibimbing mengisi jenjang dan mapel, dan bisa langsung mencoba kuis pertama pada hari yang sama.",
  },
  {
    q: "Mapel di luar daftar tersedia?",
    a: "Bisa diajukan. Materi ditambahkan bertahap, dan permintaan dari orang tua menjadi prioritas penambahan konten berikutnya.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="bg-[#FFF7ED] px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-[#292524] [font-family:var(--font-display)] md:text-4xl">
            Pertanyaan yang sering ditanya
          </h2>
          <p className="mt-3 text-[#78716c]">
            Belum terjawab? Tanyakan langsung lewat chat bot.
          </p>
        </div>
        <div className="space-y-3">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-orange-100 bg-white p-5 shadow-sm open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#292524]">
                {f.q}
                <ChevronDown
                  size={18}
                  className="shrink-0 text-[#a8a29e] transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[#78716c]">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
