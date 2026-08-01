"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#FFF7ED] via-white to-[#F0FDFA] px-4 pt-12 pb-20 md:pt-20 md:pb-28">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center md:text-left"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">
            <Sparkles size={16} />
            AI Tutor untuk SD, SMP, SMA
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-[#292524] md:text-5xl lg:text-6xl [font-family:var(--font-display)]">
            Belajar jadi <span className="text-[#f97316]">senang</span> dengan AI Tutor pribadi
          </h1>
          <p className="mt-5 text-lg text-[#78716c] md:text-xl">
            Kakak AI siap bantu anak kapan saja. Kuis interaktif, jadwal belajar,
            dan laporan mingguan untuk orang tua.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row md:justify-start">
            <Link
              href="/login/student"
              className="inline-flex items-center gap-2 rounded-full bg-[#f97316] px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-orange-600 transition"
            >
              Mulai Belajar <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#f97316] px-6 py-3 text-base font-semibold text-[#f97316] hover:bg-orange-50 transition"
            >
              Pantau Anak
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative flex items-center justify-center"
        >
          <div className="relative h-72 w-72 md:h-96 md:w-96">
            <Image
              src="/characters/kpop-lisa-action-nobg.png"
              alt="Kakak AI Lisa"
              fill
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
