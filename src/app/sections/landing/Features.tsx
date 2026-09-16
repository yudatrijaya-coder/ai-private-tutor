import {
  MessageCircle,
  ClipboardCheck,
  BarChart3,
  Target,
  Map,
  Clapperboard,
  Trophy,
  Medal,
  TrendingUp,
} from "lucide-react";
import Reveal from "@/components/landing/Reveal";

const features = [
  {
    icon: MessageCircle,
    title: "Kakak AI Pribadi",
    desc: "Tanya pelajaran kapan saja. Gaya bahasa menyesuaikan jenjang: ramah untuk SD, suportif untuk SMP, memotivasi untuk SMA.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: ClipboardCheck,
    title: "Kuis & Latihan",
    desc: "Pilih mapel, dapat umpan balik langsung, dan soal yang salah otomatis masuk antrian ulang sampai tuntas.",
    color: "bg-orange-50 text-orange-600",
  },
  {
    icon: Target,
    title: "Try Out & Ujian",
    desc: "Pre-test untuk memetakan kemampuan awal, post-test per modul untuk mengukur hasil belajar anak.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: Map,
    title: "Big Map Materi",
    desc: "Peta visual seluruh materi satu mapel. Anak melihat posisinya sekarang dan apa yang harus dikuasai berikutnya.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: Clapperboard,
    title: "Video Penjelasan",
    desc: "Video animasi per topik untuk materi yang butuh visual. Bisa ditonton ulang sesuka hati.",
    color: "bg-red-50 text-red-600",
  },
  {
    icon: TrendingUp,
    title: "Progress & Penguasaan",
    desc: "Grafik penguasaan per topik dan per mapel. Terlihat jelas bagian mana yang sudah kuat dan mana yang masih rapuh.",
    color: "bg-teal-50 text-teal-600",
  },
  {
    icon: Medal,
    title: "Lencana & Pencapaian",
    desc: "Badge dan streak harian menjaga anak tetap termotivasi untuk kembali belajar besok.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Trophy,
    title: "Papan Peringkat",
    desc: "Kompetisi sehat antar teman sekelas berdasarkan poin belajar mingguan.",
    color: "bg-yellow-50 text-yellow-600",
  },
  {
    icon: BarChart3,
    title: "Laporan Mingguan",
    desc: "Orang tua menerima ringkasan progress, nilai, dan saran belajar langsung lewat Telegram.",
    color: "bg-emerald-50 text-emerald-600",
  },
];

export default function Features() {
  return (
    <section id="fitur" className="bg-white px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-[#292524] [font-family:var(--font-display)] md:text-4xl">
            Apa yang bisa dilakukan?
          </h2>
          <p className="mt-3 text-[#78716c]">
            Sembilan hal yang membuat belajar lebih terarah — dari tanya jawab sampai laporan untuk orang tua.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} variant="up" delay={(i % 3) * 80}>
              <div className="h-full rounded-2xl border border-orange-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-md">
                <div className={`mb-4 inline-flex rounded-xl p-3 ${f.color}`}>
                  <f.icon size={24} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#292524]">{f.title}</h3>
                <p className="text-sm leading-relaxed text-[#78716c]">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
