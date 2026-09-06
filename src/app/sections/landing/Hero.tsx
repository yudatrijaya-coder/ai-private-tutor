"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, X, MessageCircle, Monitor } from "lucide-react";

export default function Hero() {
  const [showModal, setShowModal] = useState(false);

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
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#f97316] px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-orange-600 transition"
            >
              Mulai Belajar <ArrowRight size={18} />
            </button>
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
          <div className="relative aspect-[712/610] w-72 md:w-96">
            <Image
              src="/characters/kpop-lisa-action-nobg.png"
              alt="Kakak AI Lisa"
              fill
              sizes="(min-width: 768px) 384px, 288px"
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </motion.div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute right-4 top-4 text-[#78716c] hover:text-[#292524]"
                aria-label="Close"
              >
                <X size={20} />
              </button>
              <h3 className="mb-2 text-xl font-bold text-[#292524]">
                Mulai Belajar
              </h3>
              <p className="mb-6 text-sm text-[#78716c]">
                Pilih cara paling nyaman buat anak:
              </p>
              <div className="space-y-3">
                <a
                  href="https://t.me/senangbelajar_bot?start=trial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-[#229ED9]/10 p-4 transition hover:bg-[#229ED9]/20"
                >
                  <div className="rounded-full bg-[#229ED9] p-2 text-white">
                    <MessageCircle size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[#292524]">Lewat Telegram</p>
                    <p className="text-xs text-[#78716c]">Coba gratis 7 hari di chat bot</p>
                  </div>
                </a>
                <Link
                  href="/login/student"
                  onClick={() => setShowModal(false)}
                  className="flex items-center gap-3 rounded-xl bg-orange-50 p-4 transition hover:bg-orange-100"
                >
                  <div className="rounded-full bg-[#f97316] p-2 text-white">
                    <Monitor size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[#292524]">Login di Web</p>
                    <p className="text-xs text-[#78716c]">Pakai ID siswa dan password</p>
                  </div>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
