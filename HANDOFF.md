# Handoff — AI Private Tutor

> Terakhir update: 15 Juli 2026

---

## Current State Overview

| Area | Status | Detail |
|------|--------|--------|
| **Mindmap** | ✅ Premium — radial layout, Lucide icons, CSS animations | 7 iterasi |
| **Quiz Bank** | ✅ 228 quiz (SHOFI 216, Raihan 12) | Generated from Moodle Kurikulum via LLM SumoPod |
| **Content** | ✅ 43 materi baru SHOFI+Raihan | LLM-generated slides, inserted DB |
| **Curriculum** | ✅ SIBI 2026/2027 + Moodle Program Semester | SD5, SMP1, SMA2 |
| **School Schedule** | ✅ Asli dari SiKumbang — 3 siswa (Raihan, SHOFI, Syifa) | Full week + Zoom links |
| **Bot Jadwal Sekolah** | ✅ `/jadwal_sekolah` + `[SCHOOL_SCHEDULE]` intent | Reply: hari ini, minggu ini, spesifik, next subject |
| **Spam GuruAI** | ✅ Fixed — dedup daily brief, disable auto-assign | 1× kirim/hari, gak ada "Belajar Mandiri" generik |
| **Activity Tracking** | ✅ 6 halaman student + achievement dashboard | StudentActivity + StudentSubjectMastery |
| **SIBI Books** | ✅ Login + download 22 buku Kurikulum Merdeka | `moodle-files/sibi-books/` |
| **YouTube** | ✅ 242 video (SD 28, SMP 91, SMA 113) | terverifikasi via oEmbed API |
| **LLM** | ✅ SumoPod `deepseek-v4-flash` | key `SUMOPOD_API_KEY` |
| **Database** | ✅ PostgreSQL (prod) / SQLite (dev) | Prisma ORM |
| **Deployment** | ✅ PM2 + Caddy + auto-SSL | senangbelajar.web.id |

---

## What Was Done Recently (last commits)

### 📅 School Schedule Integration (2 commits)
- **Jadwal asli dari SiKumbang** — EasyUI API langsung (bukan OCR)
  - Raihan (SMP): full week 5 hari ✅
  - SHOFI (SMA): Senin via API, Selasa–Jumat via OCR screenshot ✅
  - Syifa (SD): OCR dari PDF scan CamScanner + koreksi TIK ✅
- **Komponen:** `SchoolScheduleSection.tsx` — day tabs, time slots, Zoom links
- **Data:** `src/data/school-schedule.ts` — 3 siswa, emoji/color map
- **Fixed key mismatch** `SHOF_H0EX2D` → `RHQL6KX` match DB
- **Bahasa Mandarin** — subject baru dengan emoji 🀄 #ef4444

### 📊 Achievement System (1 commit)
- **2 tabel baru:** StudentActivity (insert-only log) + StudentSubjectMastery (aggregate upsert)
- **6 halaman student** dengan auto-tracking: quiz, slides, mindmap, subject, dashboard, topic-tree
- **Quiz page hardened:** 3-layer defense (beforeunload + history.pushState + confirm modal)
- **Fix Raihan progress bug:** quizId vs materialId conflict → `matId || quizId`
- **Achievement dashboard** di `/student/achievement`

### 📚 Moodle Kurikulum + Content Generation (4 commits)
- **Moodle REST API** via `login/token.php?service=moodle_mobile_app`
- **19 file download** (11 SHOFI + 8 Raihan) — Excel Program Semester + PDF modul
- **Parse kurikulum:** 31 topik SHOFI (B. Indo, Biologi, Fisika, Matematika, MTK Penalaran, Mandarin) + 12 topik Raihan (B. Indo, Fisika, Kimia)
- **Generate konten via LLM SumoPod:** 43 materi slides + 228 quiz
  - SHOFI: B. Indonesia (7), Biologi (5), Fisika (3), Matematika (6), MTK Penalaran (6), Mandarin (8) — 35 materi, 216 quiz
  - Raihan: B. Indonesia (5), Fisika (3), Kimia (4) — 12 materi, 12 quiz
- **Scripts:** `generate-shofi-content.ts`, `generate-raihan-content.ts`, `generate-missing.ts`, `generate-quizzes.ts`

### 📖 SIBI PDF Download (1 commit)
- **Login SIBI** — berhasil via curl + session cookie + CSRF token
- **API endpoint ditemukan:** `api.buku.cloudapp.web.id/api/catalogue/getPenggerakTextBooks`
- **22 buku Kurikulum Merdeka** terdownload (~334MB):
  - Syifa SD5: 7 buku (Matematika, B. Indo, IPAS, PJOK, B. Inggris, Koding & AI, Pend. Pancasila)
  - Raihan SMP7: 5 buku (IPA, IPS, Informatika, PJOK, Pend. Pancasila)
  - SHOFI SMA11: 10 buku (Matematika TL, Informatika, B. Mandarin, B. Inggris, Ekonomi, Geografi, Sosiologi, Antropologi, PJOK, Pend. Pancasila)
- **Script:** `scripts/download-sibi-books.py`

### 🤖 Bot Fitur (2 commits)
- **`/jadwal_sekolah`** — shortcut langsung lihat jadwal sekolah asli
- **`[SCHOOL_SCHEDULE]`** intent — LLM otomatis deteksi pertanyaan jadwal sekolah
  - `[SCHOOL_SCHEDULE]` — hari ini
  - `[SCHOOL_SCHEDULE:WEEK]` — seminggu penuh
  - `[SCHOOL_SCHEDULE:Senin]` — hari spesifik
  - `[SCHOOL_SCHEDULE:NEXT:Matematika]` — "Kapan ada Matematika lagi?"
- **Handler:** `src/bot/handlers/school-schedule.ts`
- **LLM prompt update** — nomor 4 = SCHOOL_SCHEDULE intent

### 🔇 Spam GuruAI Fix (1 commit)
- **Root cause:** `setDefaultConfigIfMissing()` auto-assign jadwal ke semua student + `sendDailyBrief()` tanpa dedup
- **Fix:**
  - `setDefaultConfigIfMissing()` — dinonaktifkan (return 0)
  - `sendDailyBrief()` — in-memory dedup `__DAILY_BRIEF_SENT`, cuma 1× kirim per hari
  - Batas jam 6-9 AM
  - **Cleanup DB:** 63 sesi null-topic (topic kosong) di-cancel

---

## School Schedule Data Flow

```
SiKumbang Portal (EasyUI API) 
  → POST /smp|sma/pbm/getjadwal {idhari, idmapel}
  → src/data/school-schedule.ts (hardcode static)
     ├── Student Dashboard: SchoolScheduleSection.tsx
     └── Bot: src/bot/handlers/school-schedule.ts → /jadwal_sekolah
```

## Bot Command Reference

| Command | Intent | Description |
|---------|--------|-------------|
| `/start` | — | Mulai / daftar ulang |
| `/daftar ID` | — | Hubungkan Telegram dengan akun siswa |
| `/materi` | `[MATERIALS]` | Lihat materi pembelajaran |
| `/jadwal` | `[SCHEDULE]` | Jadwal belajar AI (study plan) |
| `/jadwal_sekolah` | `[SCHOOL_SCHEDULE]` | **Jadwal sekolah asli dari SiKumbang** |
| Tanya bebas | `[SCHOOL_SCHEDULE:?]` | "Mapel apa hari Rabu?", "Kapan ada Fisika?" |
| `/quiz` | `[QUIZ]` | Latihan soal |
| `/password` | `[PASSWORD]` | Buat/ubah password login web |

## Key Files

### School Schedule
| File | Purpose |
|------|---------|
| `src/data/school-schedule.ts` | Jadwal statis Raihan/SHOFI/Syifa — sumber data |
| `src/components/SchoolScheduleSection.tsx` | Komponen jadwal di dashboard student |
| `src/bot/handlers/school-schedule.ts` | Handler bot untuk /jadwal_sekolah |

### Activity Tracking
| File | Purpose |
|------|---------|
| `src/app/api/students/activity/route.ts` | POST endpoint |
| `src/app/api/students/mastery/route.ts` | GET achievement aggregation |
| `src/hooks/useActivityTracker.ts` | React hook — 7 tracker functions |
| `src/app/(student)/student/achievement/page.tsx` | Achievement dashboard |
| `src/app/(student)/student/quiz/page.tsx` | Hardened quiz page + auto-track |

### Bot
| File | Purpose |
|------|---------|
| `src/bot/handlers/message.ts` | Main message handler + intent routing |
| `src/bot/handlers/schedule.ts` | Jadwal AI (study plan) handler |
| `src/bot/handlers/school-schedule.ts` | Jadwal sekolah asli handler |
| `src/bot/agent/tutor.ts` | LLM tutor agent + system prompt |
| `src/bot/agent/reminder.ts` | Reminder + cron sender |
| `src/app/api/cron/schedule-sweep/route.ts` | Schedule sweep cron (fixed dedup) |

### Content Generation
| File | Purpose |
|------|---------|
| `scripts/generate-shofi-content.ts` | Generate 35 materi SHOFI via LLM |
| `scripts/generate-raihan-content.ts` | Generate 12 materi Raihan via LLM |
| `scripts/generate-missing.ts` | Generate konten materi yang hilang |
| `scripts/generate-quizzes.ts` | Generate quiz untuk materi yang ada |
| `scripts/download-sibi-books.py` | Download 22 buku Kurikulum Merdeka dari SIBI |
| `scripts/clean-sessions.ts` | Bersihin sesi sampah (null-topic) |

### SIBI Books
| File | Purpose |
|------|---------|
| `moodle-files/sibi-books/` | 22 PDF buku Kurikulum Merdeka (~334MB) |

### Infrastructure
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | 16 models — Student, StudentActivity, StudentSubjectMastery, dll |
| `src/lib/prisma.ts` | Prisma client singleton |
| `ops/Caddyfile` | Reverse proxy config |
| `ecosystem.config.cjs` | PM2 ecosystem file |

---

## Student IDs

| Student | ID | Grade | Template | Schedule Key |
|---------|----|-------|----------|-------------|
| Syifa | `STU_MRHL5FYL` | SD5 | ✅ isTemplate | `L5FY` |
| Raihan | `STU_MRHLH4LX` | SMP1 | ✅ isTemplate | `H4LX` |
| SHOFI | `STU_MRHQL6KX` | SMA2 | ✅ isTemplate | `RHQL6KX` |

## Database State

| Item | Count |
|------|-------|
| SHOFI materials with content | 35/35 ✅ |
| SHOFI quiz | 216 ✅ |
| Raihan materials with content | 12/12 ✅ |
| Raihan quiz | 12 ✅ |
| Syifa template materials | 108 ✅ (dari SD5 curriculum) |

## Tips for Next Agent

1. **Jangan auto-assign jadwal** — `setDefaultConfigIfMissing()` sengaja dimatiin. Biarkan student atur sendiri.
2. **SIBI books** — PDF di `moodle-files/sibi-books/`; koneksi lewat `session_cookie` & `csrf_token` dari login.
3. **LLM** — panggil SumoPod langsung `https://ai.sumopod.com/v1/chat/completions`, key dari `SUMOPOD_API_KEY`.
4. **Bot cron** — `schedule-sweep.sh` jalan tiap 3 menit via Hermes cron. Handle `/api/cron/schedule-sweep?token=...`
5. **User** — kid-friendly, paper-toned. Bahasa Indonesia kasual, evidence-based reporting.
6. **VPS** — `ssh ubuntu@43.133.151.242`, PM2 app name `ai-private-tutor`. Build = `npm run build`, restart = `pm2 restart ai-private-tutor`.
