# Landing Page Design — senangbelajar.web.id

## Goal
Replace the current `/` redirect-to-login with a public marketing landing page that:
1. Sells to **parents** (conversion: trust + features + CTA to register/parent-login).
2. Welcomes **existing students** (clear login CTA).
3. Keeps existing routes intact:
   - `/dashboard` → admin dashboard (NextAuth)
   - `/student/*` → student area (JWT cookie)
   - `/login` / `/login/student` → auth pages

## Audience & Tone
- **Primary:** parents of SD–SMA students looking for a safe AI tutor.
- **Secondary:** returning students.
- **Tone:** warm, fun, trustworthy — not childish, not overly corporate.
- **Brand:** match existing logo (`logo-senangbelajar.jpg`) and mascot/persona palette.

## Sections (single page, scroll)

### 1. Navigation (sticky)
- Left: logo + wordmark "Senang Belajar"
- Right: links (Fitur, Cara Kerja, Laporan Ortu) + CTA buttons
  - "Masuk" dropdown/split: `Siswa` → `/login/student`, `Orang Tua` → `/login`
  - Primary CTA: "Mulai Gratis" → `/login?mode=register`
- Mobile: hamburger menu.

### 2. Hero
- Headline: "Belajar jadi senang dengan AI Tutor pribadi"
- Subhead: "Kakak AI siap bantu anak SD, SMP, SMA kapan saja. Kuis interaktif, jadwal belajar, dan laporan mingguan untuk orang tua."
- Two CTAs:
  - Primary: "Mulai Belajar" → `/login/student`
  - Secondary: "Pantau Anak" → `/login`
- Hero image: 3D-ish illustration or mascot collage (use existing characters from `/public/characters/`).

### 3. Social Proof Bar
- "24/7 AI Tutor" · "SD–SMA" · "Ribuan soal latihan" · "Laporan ortu tiap minggu"

### 4. Features (3 cards)
1. **Kakak AI Pribadi** — jawab pertanyaan pelajaran, gaya bahasa bisa disesuaikan.
2. **Kuis & Latihan** — pilih mapel, dapat feedback langsung, soal yang salah masuk antrian ulang.
3. **Laporan Mingguan** — ortu dapat ringkasan progress, nilai, dan streak lewat Telegram.

### 5. How It Works (3 steps)
1. Daftar dengan ID siswa.
2. Chat dengan kakak AI atau kerjakan kuis.
3. Ortu pantau perkembangan lewat laporan otomatis.

### 6. Parent Preview / Report Teaser
- Mockup kartu laporan mingguan (score, badge, streak) — static image/CSS, no real data.

### 7. CTA Banner
- "Siap buat anak belajar lebih senang?"
- Buttons: "Mulai Gratis" / "Login Siswa"

### 8. Footer
- Links: Login siswa, Login orang tua, Dashboard admin, Privasi, Kontak.
- Copyright.

## Visual Design
- **Primary:** warm orange/amber (`#F59E0B` area) — energetic & friendly.
- **Secondary:** teal/cyan (`#14B8A6`) — growth & trust.
- **Background:** soft cream/white (`#FFFBF5` → white) for warmth.
- **Typography:** use existing sans stack (Tailwind default / Inter if loaded).
- **Illustrations:** reuse `/public/characters/` assets; fallback to Lucide icons.
- **Animations:** gentle scroll reveal (framer-motion optional), no heavy effects.

## Tech Stack
- Next.js 14 App Router (`src/app/page.tsx` replacement)
- Tailwind CSS (existing)
- Lucide React (existing)
- Framer Motion (optional, if already installed)
- No new DB models; purely presentational.

## Routing Changes
| Route | Before | After |
|-------|--------|-------|
| `/` | redirect `/login` | Landing page (this design) |
| `/dashboard` | admin dashboard | unchanged |
| `/student/*` | student area | unchanged |
| `/login` | admin/parent login | unchanged |
| `/login/student` | student login | unchanged |

## Components to Create
- `src/app/page.tsx` — landing page
- `src/app/sections/landing/Navbar.tsx`
- `src/app/sections/landing/Hero.tsx`
- `src/app/sections/landing/Features.tsx`
- `src/app/sections/landing/HowItWorks.tsx`
- `src/app/sections/landing/ParentPreview.tsx`
- `src/app/sections/landing/Footer.tsx`

## Accessibility & Performance
- Semantic HTML + heading hierarchy.
- Alt text on all images.
- Responsive down to 320px.
- Lighthouse target: 90+ performance (optimize hero image).

## Out of Scope
- Multi-language (Indonesian only for now).
- Video/animated explainer.
- Real-time signup from landing page (redirects to existing auth pages).
- Payment/pricing section.

## Approval
Approved by user: Ops A, `/dashboard` admin, `/student` unchanged.
