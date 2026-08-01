# Landing Page Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace `src/app/page.tsx` redirect-to-login with a public marketing landing page at `/`, while keeping `/dashboard` (admin), `/student/*` (student), and `/login` routes unchanged.

**Architecture:** Pure Next.js 14 App Router page composed of section components under `src/app/sections/landing/`. Uses existing Tailwind v4, Lucide icons, Framer Motion, and Google Fonts already loaded in `layout.tsx`. No DB changes.

**Tech Stack:** Next.js 16 + Tailwind CSS 4 + Lucide React + Framer Motion.

---

## Design Reference

- Design doc: `docs/designs/2026-08-01-landing-page-design.md`
- Colors:
  - Primary warm: `#F97316` (`--st-secondary`)
  - Secondary teal: `#14B8A6`
  - Background cream: `#FFF7ED` (`--st-bg`)
  - Text dark: `#292524` (`--st-text`)
- Fonts:
  - Display: `var(--font-display)` / `Outfit`
  - Student display: `var(--font-st-display)` / `Fredoka`
  - Body: `var(--font-body)` / `Inter`
- Assets:
  - Logo: `/logo-senangbelajar.jpg`
  - Characters: `/characters/kpop-lisa-action-nobg.png` and `/characters/football-mbappe-action-nobg.png` (transparent PNGs)

---

## Task 1: Create Landing Page Section Directory + Navbar

**Objective:** Add sticky navigation with logo, links, and login CTAs.

**Files:**
- Create: `src/app/sections/landing/Navbar.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Write `Navbar.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

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
          <span className="text-lg font-bold text-st-text [font-family:var(--font-st-display)]">
            Senang Belajar
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-st-text-dim hover:text-st-secondary transition"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login/student"
            className="text-sm font-medium text-st-text hover:text-st-secondary"
          >
            Masuk Siswa
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-st-secondary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 transition"
          >
            Mulai Gratis
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-st-text"
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
              className="block text-sm font-medium text-st-text-dim hover:text-st-secondary"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/login/student"
              className="block text-center text-sm font-medium text-st-text"
            >
              Masuk Siswa
            </Link>
            <Link
              href="/login"
              className="block rounded-full bg-st-secondary px-4 py-2 text-center text-sm font-semibold text-white"
            >
              Mulai Gratis
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
```

**Step 2: Replace `src/app/page.tsx` with a temporary shell that imports Navbar only**

```tsx
import Navbar from "./sections/landing/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-st-bg">
      <Navbar />
      <div className="p-8 text-center">Hero coming next</div>
    </main>
  );
}
```

**Step 3: Verify dev server renders navbar**

Run: `npm run dev`
Open: `http://localhost:3001`
Expected: sticky navbar with logo, links, "Masuk Siswa", "Mulai Gratis".

**Step 4: Commit**

```bash
git add src/app/page.tsx src/app/sections/landing/Navbar.tsx
git commit -m "feat(landing): add sticky navbar with login CTAs"
```

---

## Task 2: Hero Section

**Objective:** Add hero headline, subhead, CTAs, and character images.

**Files:**
- Create: `src/app/sections/landing/Hero.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Write `Hero.tsx`**

```tsx
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
          <h1 className="text-4xl font-extrabold leading-tight text-st-text md:text-5xl lg:text-6xl [font-family:var(--font-display)]">
            Belajar jadi <span className="text-st-secondary">senang</span> dengan AI Tutor pribadi
          </h1>
          <p className="mt-5 text-lg text-st-text-dim md:text-xl">
            Kakak AI siap bantu anak kapan saja. Kuis interaktif, jadwal belajar,
            dan laporan mingguan untuk orang tua.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row md:justify-start">
            <Link
              href="/login/student"
              className="inline-flex items-center gap-2 rounded-full bg-st-secondary px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-orange-600 transition"
            >
              Mulai Belajar <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border-2 border-st-secondary px-6 py-3 text-base font-semibold text-st-secondary hover:bg-orange-50 transition"
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
```

**Step 2: Update `src/app/page.tsx`**

```tsx
import Navbar from "./sections/landing/Navbar";
import Hero from "./sections/landing/Hero";

export default function Home() {
  return (
    <main className="min-h-screen bg-st-bg">
      <Navbar />
      <Hero />
    </main>
  );
}
```

**Step 3: Verify**
Expected: hero with headline, two CTAs, character image.

**Step 4: Commit**

```bash
git add src/app/page.tsx src/app/sections/landing/Hero.tsx
git commit -m "feat(landing): add hero section"
```

---

## Task 3: Social Proof Bar

**Objective:** Add trust bar below hero.

**Files:**
- Create: `src/app/sections/landing/SocialProof.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Write `SocialProof.tsx`**

```tsx
import { Clock, GraduationCap, BookOpen, Mail } from "lucide-react";

const items = [
  { icon: Clock, label: "24/7 AI Tutor" },
  { icon: GraduationCap, label: "SD – SMP – SMA" },
  { icon: BookOpen, label: "Ribuan soal latihan" },
  { icon: Mail, label: "Laporan ortu tiap minggu" },
];

export default function SocialProof() {
  return (
    <section className="border-y border-orange-100 bg-white py-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-6 px-4 text-sm font-medium text-st-text-dim md:justify-between">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <item.icon size={18} className="text-st-secondary" />
            {item.label}
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Import in page.tsx**

**Step 3: Commit**

```bash
git add src/app/page.tsx src/app/sections/landing/SocialProof.tsx
git commit -m "feat(landing): add social proof bar"
```

---

## Task 4: Features Section

**Objective:** Add 3 feature cards.

**Files:**
- Create: `src/app/sections/landing/Features.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Write `Features.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";
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
          <h2 className="text-3xl font-bold text-st-text [font-family:var(--font-display)] md:text-4xl">
            Apa yang bisa dilakukan?
          </h2>
          <p className="mt-3 text-st-text-dim">Tiga fitur utama yang bikin belajar makin seru.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-orange-100 bg-st-bg-card p-6 shadow-sm transition hover:shadow-md"
            >
              <div className={`mb-4 inline-flex rounded-xl p-3 ${f.color}`}>
                <f.icon size={24} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-st-text">{f.title}</h3>
              <p className="text-st-text-dim">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2-3: Import, verify, commit**

```bash
git add src/app/page.tsx src/app/sections/landing/Features.tsx
git commit -m "feat(landing): add features section"
```

---

## Task 5: How It Works Section

**Objective:** Add 3-step process.

**Files:**
- Create: `src/app/sections/landing/HowItWorks.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Write `HowItWorks.tsx`**

```tsx
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
          <h2 className="text-3xl font-bold text-st-text [font-family:var(--font-display)] md:text-4xl">
            Cara Kerja
          </h2>
          <p className="mt-3 text-st-text-dim">Tiga langkah mudah mulai belajar.</p>
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
              <div className="mb-4 inline-flex rounded-full bg-st-secondary/10 p-3 text-st-secondary">
                <s.icon size={24} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-st-text">{s.title}</h3>
              <p className="text-st-text-dim">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2-3: Import, verify, commit**

```bash
git add src/app/page.tsx src/app/sections/landing/HowItWorks.tsx
git commit -m "feat(landing): add how it works section"
```

---

## Task 6: Parent Preview Section

**Objective:** Add static report preview card.

**Files:**
- Create: `src/app/sections/landing/ParentPreview.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Write `ParentPreview.tsx`**

```tsx
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
          className="rounded-2xl border border-orange-100 bg-st-bg p-6 shadow-lg md:p-8"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-st-text-dim">Laporan Mingguan</p>
              <h3 className="text-xl font-bold text-st-text">Adi — SD Kelas 5</h3>
            </div>
            <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
              Minggu 3
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <TrendingUp className="mx-auto mb-2 text-st-secondary" size={24} />
              <p className="text-2xl font-bold text-st-text">87%</p>
              <p className="text-xs text-st-text-dim">Rata-rata kuis</p>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <Trophy className="mx-auto mb-2 text-st-gold" size={24} />
              <p className="text-2xl font-bold text-st-text">5</p>
              <p className="text-xs text-st-text-dim">Badge</p>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <CalendarCheck className="mx-auto mb-2 text-st-success" size={24} />
              <p className="text-2xl font-bold text-st-text">12</p>
              <p className="text-xs text-st-text-dim">Hari streak</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-st-text [font-family:var(--font-display)] md:text-4xl">
            Orang tua tetap terinformasi
          </h2>
          <p className="mt-4 text-lg text-st-text-dim">
            Setiap minggu, laporan otomatis dikirim ke Telegram orang tua:
            progress belajar, nilai kuis, badge yang diraih, dan saran belajar.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Ringkasan aktivitas harian",
              "Statistik per mapel",
              "Notifikasi jika anak butuh bantuan",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-st-text">
                <span className="h-2 w-2 rounded-full bg-st-secondary" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
```

**Step 2-3: Import, verify, commit**

```bash
git add src/app/page.tsx src/app/sections/landing/ParentPreview.tsx
git commit -m "feat(landing): add parent report preview section"
```

---

## Task 7: CTA Banner + Footer

**Objective:** Add bottom CTA and footer.

**Files:**
- Create: `src/app/sections/landing/CTABanner.tsx`
- Create: `src/app/sections/landing/Footer.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Write `CTABanner.tsx`**

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTABanner() {
  return (
    <section className="bg-gradient-to-r from-st-secondary to-orange-500 px-4 py-16 text-center text-white">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold [font-family:var(--font-display)] md:text-4xl">
          Siap buat anak belajar lebih senang?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/90">
          Daftar gratis dan mulai chat dengan Kakak AI hari ini.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-st-secondary shadow hover:bg-orange-50 transition"
          >
            Mulai Gratis <ArrowRight size={18} />
          </Link>
          <Link
            href="/login/student"
            className="inline-flex items-center gap-2 rounded-full border-2 border-white px-6 py-3 text-base font-semibold text-white hover:bg-white/10 transition"
          >
            Login Siswa
          </Link>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Write `Footer.tsx`**

```tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-orange-100 bg-white px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-st-text-dim md:flex-row">
        <p>© {new Date().getFullYear()} Senang Belajar. All rights reserved.</p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link href="/login/student" className="hover:text-st-secondary">Login Siswa</Link>
          <Link href="/login" className="hover:text-st-secondary">Login Orang Tua</Link>
          <Link href="/dashboard" className="hover:text-st-secondary">Dashboard Admin</Link>
        </div>
      </div>
    </footer>
  );
}
```

**Step 3: Update `src/app/page.tsx` with all sections**

```tsx
import Navbar from "./sections/landing/Navbar";
import Hero from "./sections/landing/Hero";
import SocialProof from "./sections/landing/SocialProof";
import Features from "./sections/landing/Features";
import HowItWorks from "./sections/landing/HowItWorks";
import ParentPreview from "./sections/landing/ParentPreview";
import CTABanner from "./sections/landing/CTABanner";
import Footer from "./sections/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-st-bg">
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <ParentPreview />
      <CTABanner />
      <Footer />
    </main>
  );
}
```

**Step 4: Verify full page**
Expected: complete landing page, all sections visible, smooth scroll via anchor links.

**Step 5: Commit**

```bash
git add src/app/page.tsx src/app/sections/landing/CTABanner.tsx src/app/sections/landing/Footer.tsx
git commit -m "feat(landing): add CTA banner and footer"
```

---

## Task 8: Build, Type Check, and Deploy

**Objective:** Ensure everything compiles and deploys.

**Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

**Step 2: Build**

Run: `npm run build`
Expected: build succeeds.

**Step 3: Restart PM2 app**

Run: `pm2 restart ai-private-tutor --wait-ready --listen-timeout 15000`
Expected: process online.

**Step 4: Verify live**

Open: `https://senangbelajar.web.id/`
Expected: landing page renders.

Also verify protected routes still work:
- `https://senangbelajar.web.id/dashboard` → redirect to `/login` if not authenticated
- `https://senangbelajar.web.id/student` → redirect to `/login/student` if not authenticated

**Step 5: Commit design doc + plan**

```bash
git add docs/designs/2026-08-01-landing-page-design.md .hermes/plans/2026-08-01_landing-page-implementation.md
git commit -m "docs: landing page design and implementation plan"
```

---

## Final Merge Commit

If using feature branch:

```bash
git merge --no-ff landing-page -m "feat(landing): public marketing landing page at /"
```

---

## Verification Checklist

- [ ] Navbar sticky, mobile menu works
- [ ] Hero shows headline, CTAs, character image
- [ ] Smooth scroll to #fitur, #cara-kerja, #laporan
- [ ] All 3 feature cards render
- [ ] How it works 3 steps render
- [ ] Parent preview card renders
- [ ] CTA banner + footer render
- [ ] `/dashboard` still protected by NextAuth
- [ ] `/student/*` still protected by JWT
- [ ] `npm run build` passes
- [ ] Deployed to `senangbelajar.web.id` and verified live
