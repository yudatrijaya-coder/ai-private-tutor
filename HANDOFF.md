# Handoff — AI Private Tutor

> Terakhir update: 15 Juli 2026

---

## Current State Overview

| Area | Status | Detail |
|------|--------|--------|
| **Content (slides)** | ✅ **376/376** | Syifa 108, Raihan 114, SHOFI 154 — sempurna ✅ |
| **Quiz** | ✅ **581 quiz** | Syifa 198, Raihan 167, SHOFI 216 |
| **YouTube Video** | ✅ **328 video** | Syifa 108/108, Raihan 99/114, SHOFI 121/154 |
| **Mindmap (metadata)** | ✅ **335/376** | Syifa 108/108, Raihan 102/114, SHOFI 125/154 |
| **SIBI Books** | ✅ 22 buku Kurikulum Merdeka | `moodle-files/sibi-books/` — link via `getPdfUrl()` |
| **Moodle Module Icon** | ✅ 📄 Modul | Raihan SMP1 (Fisika, Kimia, B. Indonesia) |
| **Bot Jadwal Sekolah** | ✅ `/jadwal_sekolah` + LLM `[SCHOOL_SCHEDULE]` intent | Reply: hari ini, minggu ini, spesifik, next subject |
| **Spam GuruAI Fix** | ✅ Dedup daily brief + disable auto-assign | 1× kirim/hari, gak ada "Belajar Mandiri" generik |
| **Activity Tracking** | ✅ StudentActivity + StudentSubjectMastery | 6 halaman student + achievement dashboard |
| **Menus (Progress)** | ✅ 3 siswa (Raihan, SHOFI, Syifa) | Full week schedules from SiKumbang API |
| **Deployment** | ✅ PM2 + Caddy + auto-SSL | senangbelajar.web.id |
| **LLM** | ✅ SumoPod `deepseek-v4-flash` | `SUMOPOD_API_KEY` di `.env.production` |

---

## What Was Done Recently (last commits)

### 📚 Content Generation — All Students (3 commits)
- **99 materi Raihan** dari template Syifa — 8 mapel (Bahasa Indonesia, Inggris, IPA, IPS, Informatika, Matematika, PJOK, Pendidikan Pancasila)
- **Script `gen-content-full.ts`** — batch 5 topik/call via SumoPod LLM, manual `.env` loader via `fs.readFileSync`, multi-curriculum support
- **3 materi Kimia** Raihan (Moodle curriculum) — generated sebelumnya
- **All content complete**: Syifa 108 ✅, Raihan 114 ✅, SHOFI 154 ✅

### 📄 Moodle Module Icons (1 commit)
- `src/data/moodle-modules.ts` — mapping subject→PDF for Raihan (Fisika, Kimia, B. Indonesia)
- `src/components/MoodleQuickLink.tsx` — 📄 icon in dashboard Quick Actions
- **Subject page**: grid 4→5 kolom, 📄 Modul button per-topik (green), disabled if no module
- **SIBI links preserved**: `getPdfUrl()` untouched — 📖 Buku SIBI still works

### 🧹 Spam GuruAI Fix (1 commit)
- **Root cause**: cron every 3 min + `sendDailyBrief()` without dedup + `setDefaultConfigIfMissing()` assigned generic "Belajar Mandiri" sessions to all students
- **Fix**: in-memory `__DAILY_BRIEF_SENT Set` — 1× per day; `setDefaultConfigIfMissing()` → return 0; cleaned 63 null-topic sessions

---

## Student Status Detail

### Syifa (SD5) — `STU_MRHL5FYL` ✅ KOMPLIT
| Subject | Materials | Content | Quiz | Video | Mindmap |
|---------|:---------:|:-------:|:----:|:-----:|:-------:|
| Bahasa Indonesia | 33 | ✅ 33 | ✅ 33 | ✅ 33 | ✅ 33 |
| Bahasa Inggris | 26 | ✅ 26 | ✅ 26 | ✅ 26 | ✅ 26 |
| Informatika | 27 | ✅ 27 | ✅ 27 | ✅ 27 | ✅ 27 |
| IPAS | 53 | ✅ 53 | ✅ 53 | ✅ 53 | ✅ 53 |
| Pendidikan Pancasila | 27 | ✅ 27 | ✅ 27 | ✅ 27 | ✅ 27 |
| PJOK | 32 | ✅ 32 | ✅ 32 | ✅ 32 | ✅ 32 |
| **Total** | **108** | **✅ 108** | **✅ 198** | **✅ 108** | **✅ 108** |

- **Source of truth**: Only SIBI (no Moodle)
- **SIBI Books**: 6 buku (IPAS, PJOK, Informatika, B. Inggris, B. Indonesia, Pancasila)
- **Modul**: None (no Moodle internal files)

### Raihan (SMP1) — `STU_MRHLH4LX` ✅ KOMPLIT
| Subject | Materials | Content | Quiz | Video | Mindmap |
|---------|:---------:|:-------:|:----:|:-----:|:-------:|
| Bahasa Indonesia | 28 | ✅ 28 | ✅ 28 | ✅ 23 |  |
| Bahasa Inggris | 16 | ✅ 16 | ✅ 16 | ✅ 16 |  |
| Fisika | 3 | ✅ 3 | ✅ 3 | ❌ 0 |  |
| Informatika | 9 | ✅ 9 | ✅ 9 | ✅ 9 |  |
| IPA | 36 | ✅ 36 | ✅ 36 | ✅ 36 |  |
| IPS | 10 | ✅ 10 | ✅ 10 | ✅ 10 |  |
| Kimia | 7 | ✅ 7 | ⚠️ 4 | ❌ 0 |  |
| Matematika | 12 | ✅ 12 | ✅ 12 | ✅ 12 |  |
| Pendidikan Pancasila | 21 | ✅ 21 | ✅ 21 | ✅ 21 |  |
| PJOK | 28 | ✅ 28 | ✅ 28 | ✅ 28 |  |
| **Total** | **114** | **✅ 114** | **✅ 167** | **✅ 99** | **✅ 102** |

- **Source of truth**: Moodle (Promes) + SIBI
- **SIBI Books**: 5 buku (IPA, IPS, Informatika, PJOK, Pancasila)
- **Modul Moodle**: 📄 Fisika (2 PDF), Kimia (1 PDF), B. Indonesia (1 PDF)
- **Gaps**: Kimia quiz ⚠️ (7 materi, 4 quiz), Video ⚠️ (Fisika 0, Kimia 0)

### SHOFI (SMA2) — `STU_MRHQL6KX` ✅ KOMPLIT
| Subject | Materials | Content | Quiz | Video | Mindmap |
|---------|:---------:|:-------:|:----:|:-----:|:-------:|
| Bahasa Indonesia | 25 | ✅ 25 | ✅ 25 | ✅ 20 |  |
| Bahasa Inggris | 18 | ✅ 18 | ✅ 18 | ✅ 18 |  |
| Bahasa Mandarin | 8 | ✅ 8 | ⚠️ 4 | ❌ 0 |  |
| Biologi | 5 | ✅ 5 | ✅ 5 | ❌ 0 |  |
| Ekonomi | 23 | ✅ 23 | ✅ 23 | ✅ 23 |  |
| Fisika | 3 | ✅ 3 | ✅ 3 | ❌ 0 |  |
| Geografi | 22 | ✅ 22 | ✅ 22 | ✅ 22 |  |
| Informatika | 16 | ✅ 16 | ✅ 16 | ✅ 16 |  |
| Matematika | 34 | ✅ 34 | ✅ 34 | ✅ 28 |  |
| Matematika Penalaran | 6 | ✅ 6 | ✅ 6 | ❌ 0 |  |
| Pendidikan Pancasila | 18 | ✅ 18 | ✅ 18 | ✅ 18 |  |
| PJOK | 21 | ✅ 21 | ✅ 21 | ✅ 21 |  |
| Sosiologi | 21 | ✅ 21 | ✅ 21 | ✅ 21 |  |
| **Total** | **154** | **✅ 154** | **✅ 216** | **✅ 121** | **✅ 125** |

- **Source of truth**: Moodle (Promes) + SIBI
- **SIBI Books**: 10 buku 
- **Modul Moodle**: None (no PDF modul, only .xls Promes files)
- **Gaps**: Mandarin quiz ⚠️ (8 materi, 4 quiz), Video ❌ for Biologi, Fisika, Mandarin, MTK Penalaran

---

## School Schedule Data

### Source
- **SiKumbang API** → EasyUI POST `/smp/pbm/getjadwal` / `/sma/pbm/getjadwal`
- **No more OCR/jadwal PDF** — data langsung dari API
- **Stored in**: `src/data/school-schedule.ts` (hardcoded static export)

### Flow
```
SiKumbang API → browser_console (EasyUI) → school-schedule.ts → 
  SchoolScheduleSection.tsx (dashboard) + 
  Bot handler (school-schedule.ts) → 
  LLM intent [SCHOOL_SCHEDULE]
```

### Bot Commands
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

---

## Architecture Notes

### Content Generation Script
- **File**: `scripts/gen-content-full.ts`
- **Run**: `npx tsx scripts/gen-content-full.ts`
- **Batching**: 5 topics per LLM call
- **Key loading**: Manual `fs.readFileSync` (not dotenv — dotenv unreliable with npx tsx)
- **Multi-curriculum**: Loops ALL curricula per student (Raihan has 2)
- **Mindmap**: Parsed from ## headers → children from - bullet points

### UI Components (Moodle Module)
- `src/data/moodle-modules.ts` — static mapping subject→PDF URLs per grade
- `src/components/MoodleQuickLink.tsx` — dashboard icon
- Subject page: per-topic 📄 Modul button in grid, shows green when available, dimmed+disabled when not

### Important Known Issues
1. **Raihan Kimia quiz**: 7 materi, 4 quiz — perlu 3 quiz tambahan
2. **SHOFI Mandarin quiz**: 8 materi, 4 quiz — perlu 4 quiz tambahan
3. **Missing YouTube**: Fisika (Raihan+SHOFI), Kimia (Raihan), Mandarin (SHOFI), Biologi (SHOFI), MTK Penalaran (SHOFI) — no video mapping
4. **Mindmap still missing**: Raihan 12 (Fisika+Kimia from Moodle curriculum), SHOFI 29 (subjects from Moodle curriculum)
5. **Exam model**: Not in Prisma schema — no exam feature yet

### Key Student IDs
| Student | Code | Grade | Persona |
|---------|------|-------|---------|
| Syifa | `STU_MRHL5FYL` | SD_5 | KAK_BUDI |
| Raihan | `STU_MRHLH4LX` | SMP_1 | KAK_DEWI |
| SHOFI | `STU_MRHQL6KX` | SMA_2 | KAK_RAKA |

### Key File Paths
```
src/data/moodle-modules.ts        — Moodle internal PDF mapping
src/components/MoodleQuickLink.tsx — Dashboard 📄 icon
src/data/school-schedule.ts       — Static schedule data
scripts/gen-content-full.ts       — Bulk content generation script
moodle-files/sibi-books/          — 22 SIBI PDFs (git-ignored)
public/moodle-files/              — Moodle PDFs served statically
prisma/schema.prisma              — DB schema
```

### Key Environment 
- **LLM API key**: `SUMOPOD_API_KEY` in `.env.production` (25-char key)
- **DB**: PostgreSQL 16 localhost:5432, db=ai_private_tutor
- **App**: PM2 `ai-private-tutor`, port 3000, Caddy reverse-proxy
- **Scripts need manual env load**: `fs.readFileSync('.env')` — dotenv not reliable from npx tsx
