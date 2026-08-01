"use client";

import { motion } from "framer-motion";
import { TrendingUp, Trophy, CalendarCheck } from "lucide-react";

export default function ParentPreview() {
  return (
    <section id="laporan" className="bg-white px-4 py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-orange-100 bg-[#FFF7ED] p-6 shadow-lg md:p-8"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#78716c]">Laporan Mingguan</p>
              <h3 className="text-xl font-bold text-[#292524]">Adi — SD Kelas 5</h3>
            </div>
            <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
              Minggu 3
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <TrendingUp className="mx-auto mb-2 text-[#f97316]" size={24} />
              <p className="text-2xl font-bold text-[#292524]">87%</p>
              <p className="text-xs text-[#78716c]">Rata-rata kuis</p>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <Trophy className="mx-auto mb-2 text-[#fbbf24]" size={24} />
              <p className="text-2xl font-bold text-[#292524]">5</p>
              <p className="text-xs text-[#78716c]">Badge</p>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <CalendarCheck className="mx-auto mb-2 text-green-600" size={24} />
              <p className="text-2xl font-bold text-[#292524]">12</p>
              <p className="text-xs text-[#78716c]">Hari streak</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-[#292524] [font-family:var(--font-display)] md:text-4xl">
            Orang tua tetap terinformasi
          </h2>
          <p className="mt-4 text-lg text-[#78716c]">
            Setiap minggu, laporan otomatis dikirim ke Telegram orang tua:
            progress belajar, nilai kuis, badge yang diraih, dan saran belajar.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Ringkasan aktivitas harian",
              "Statistik per mapel",
              "Notifikasi jika anak butuh bantuan",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-[#292524]">
                <span className="h-2 w-2 rounded-full bg-[#f97316]" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
