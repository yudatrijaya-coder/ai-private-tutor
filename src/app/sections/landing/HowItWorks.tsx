"use client";

import { motion } from "framer-motion";
import { UserPlus, MessageSquareText, LineChart } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: UserPlus,
    title: "Daftar dengan ID siswa",
    desc: "Hubungkan akun Telegram siswa atau login langsung lewat dashboard.",
  },
  {
    step: "02",
    icon: MessageSquareText,
    title: "Chat atau kerjakan kuis",
    desc: "Tanya Kakak AI soal pelajaran atau pilih mapel untuk latihan.",
  },
  {
    step: "03",
    icon: LineChart,
    title: "Pantau perkembangan",
    desc: "Orang tua dapat laporan otomatis setiap minggu lewat Telegram.",
  },
];

export default function HowItWorks() {
  return (
    <section id="cara-kerja" className="bg-[#FFF7ED] px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-[#292524] [font-family:var(--font-display)] md:text-4xl">
            Cara Kerja
          </h2>
          <p className="mt-3 text-[#78716c]">Tiga langkah mudah mulai belajar.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative rounded-2xl bg-white p-6 shadow-sm"
            >
              <span className="absolute right-4 top-4 text-5xl font-black text-orange-100 [font-family:var(--font-display)]">
                {s.step}
              </span>
              <div className="mb-4 inline-flex rounded-full bg-[#f97316]/10 p-3 text-[#f97316]">
                <s.icon size={24} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-[#292524]">{s.title}</h3>
              <p className="text-[#78716c]">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
