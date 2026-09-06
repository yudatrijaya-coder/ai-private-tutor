"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, MessageCircle } from "lucide-react";

const TELEGRAM_BOT_URL = "https://t.me/senangbelajar_bot?start=trial";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const links = [
    { href: "#fitur", label: "Fitur" },
    { href: "#cara-kerja", label: "Cara Kerja" },
    { href: "#laporan", label: "Laporan Ortu" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-orange-100">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo-senangbelajar.jpg"
            alt="Senang Belajar"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <span className="text-lg font-bold text-[#292524] [font-family:var(--font-st-display)]">
            Senang Belajar
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-[#78716c] hover:text-[#f97316] transition"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login/student"
            className="text-sm font-medium text-[#292524] hover:text-[#f97316]"
          >
            Masuk Siswa
          </Link>
          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#f97316] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 transition"
          >
            <MessageCircle size={14} />
            Daftar Gratis
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-[#292524]"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-orange-100 bg-white px-4 py-4 space-y-3">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block text-sm font-medium text-[#78716c] hover:text-[#f97316]"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/login/student"
              className="block text-center text-sm font-medium text-[#292524]"
            >
              Masuk Siswa
            </Link>
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-full bg-[#f97316] px-4 py-2 text-center text-sm font-semibold text-white"
            >
              Daftar Gratis
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
