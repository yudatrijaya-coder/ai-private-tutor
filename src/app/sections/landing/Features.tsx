import { MessageCircle, ClipboardCheck, BarChart3 } from "lucide-react";

const features = [
  {
    icon: MessageCircle,
    title: "Kakak AI Pribadi",
    desc: "Jawab pertanyaan pelajaran kapan saja dengan gaya bahasa yang bisa disesuaikan.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: ClipboardCheck,
    title: "Kuis & Latihan",
    desc: "Pilih mapel, dapat feedback langsung, dan soal yang salah masuk antrian ulang.",
    color: "bg-orange-50 text-orange-600",
  },
  {
    icon: BarChart3,
    title: "Laporan Mingguan",
    desc: "Orang tua dapat ringkasan progress, nilai, dan streak lewat Telegram.",
    color: "bg-teal-50 text-teal-600",
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
          <p className="mt-3 text-[#78716c]">Tiga fitur utama yang bikin belajar makin seru.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              style={{ animationDelay: `${i * 0.1}s` }}
              className="animate-fade-up rounded-2xl border border-orange-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className={`mb-4 inline-flex rounded-xl p-3 ${f.color}`}>
                <f.icon size={24} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-[#292524]">{f.title}</h3>
              <p className="text-[#78716c]">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}