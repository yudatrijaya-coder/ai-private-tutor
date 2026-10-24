# API Flow — AI Private Tutor

> **Status:** DATA FILE — perbarui saat endpoint berubah.
> **Verifikasi terakhir:** 2026-10-25 terhadap commit `0207add`. Total 73 `route.ts` di `src/app/api/`.
> Peta per-prefix: [`../ai/MODULE_MAP.md`](../ai/MODULE_MAP.md). Detail per endpoint: [`../modules/api-routes.md`](../modules/api-routes.md).

---

## Arsitektur Request

```
Telegram ──webhook──▶ Caddy :443 ──▶ Next.js :3000 ──▶ PostgreSQL :5432
Browser  ───────────▶                │
                                     ├──▶ 9Router :20128 ──▶ provider upstream
                                     └──▶ Redis :6379 (BullMQ, opsional)

Next.js (port 3000)
    ├── middleware.ts — guard cookie student_session, session admin, tolak header
    │                   next-action yang bukan digest (anti RSC scanner)
    │
    ├── API Routes (/api/*) — 73 route
    │   ├── /api/bot/webhook          ← Telegram (secret token + dedupe update_id)
    │   ├── /api/students/*           ← data siswa (18 route, session)
    │   ├── /api/student/*            ← profil, misi, progress (5 route)
    │   ├── /api/exam/*               ← exam generate/attempt/analyze (6 route)
    │   ├── /api/media/*              ← render & TTS (2 route)
    │   ├── /api/mindmap/screenshot   ← snapshot mindmap
    │   ├── /api/cron/*               ← 7 endpoint terjadwal (fail-closed)
    │   ├── /api/reminders/check      ← reminder personal (Bearer token)
    │   ├── /api/auth/*               ← NextAuth + login siswa (5 route)
    │   ├── /api/admin/*              ← admin dashboard (18 route)
    │   ├── /api/curriculum/*         ← batch generate & mindmap (3 route)
    │   └── /api/youtube/transcript   ← transkrip video
    │
    ├── Server Components (pages)
    │   ├── /(dashboard)/dashboard    ← admin
    │   ├── /(student)/student        ← portal siswa (18 halaman)
    │   ├── /(auth)                   ← login admin & login siswa
    │   └── /docs                     ← dokumentasi in-app
    │
    └── 9Router LLM Gateway (port 20128)
        ├── ai_tutor_agent (combo — primary untuk semua AgentRole)
        └── hermes (fallback)
```

## Daftar API Route (ringkas per kelompok)

Auth kolom: **Admin** = session NextAuth admin, **Siswa** = cookie `student_session`,
**Cron** = `checkCronSecret()` (kecuali disebut lain), **Publik** = tanpa auth.

### Bot, Cron & Reminder

| Method | Route | Auth | Fungsi |
|--------|-------|------|--------|
| POST | `/api/bot/webhook` | Secret token | Menerima update Telegram |
| GET | `/api/bot/diag` | Admin | Diagnostik bot |
| GET | `/api/bot/diag/prompt` | Admin | Dump prompt aktif |
| GET | `/api/cron/daily-nudge` | Cron | Nudge siswa yang tidak aktif ≥2 hari |
| POST | `/api/cron/exam-scheduler` | Cron | Terbitkan jadwal exam |
| POST | `/api/cron/guardian-monthly` | Cron | Laporan bulanan orang tua |
| POST | `/api/cron/guardian-report` | Cron | Laporan mingguan orang tua |
| POST/GET | `/api/cron/motivation-nudge` | Cron | Nudge motivasi (Senin/Jumat) |
| GET | `/api/cron/progress-snap` | Cron | Snapshot progres mingguan |
| GET | `/api/cron/schedule-sweep` | Cron (`?token=`) | H-1/T-30/missed + daily brief + auto-assign |
| GET | `/api/reminders/check` | `Authorization: Bearer` | Proses reminder personal |

### Siswa

| Method | Route | Auth | Fungsi |
|--------|-------|------|--------|
| GET/POST | `/api/students` | Admin/Siswa | List siswa · `POST {action:"trigger"}` = pipeline |
| DELETE | `/api/students/[id]` | Admin | Hapus siswa |
| GET | `/api/students/subjects` | Siswa | Daftar mapel |
| GET | `/api/students/topics` | Siswa | Topik per mapel |
| GET/PATCH | `/api/students/material/[id]` | Siswa | Baca/tandai materi |
| GET | `/api/students/quizzes` | Siswa | Daftar quiz |
| GET | `/api/students/quizzes/[id]` | Siswa | Quiz + pilihan jawaban |
| POST | `/api/students/quizzes/[id]/grade` | Siswa | Nilai jawaban |
| GET/POST | `/api/students/activity` | Siswa | Riwayat aktivitas + XP/streak |
| GET/POST | `/api/students/review` | Siswa | Antrean review SM-2 |
| GET | `/api/students/mastery`, `/weak-topics`, `/self-compare` | Siswa | Analitik penguasaan |
| GET | `/api/students/gamification`, `/achievement-extra`, `/leaderboard` | Siswa | XP, badge, peringkat |
| GET | `/api/students/exams`, `/exams/[id]` | Siswa | Daftar & detail exam |
| GET | `/api/student/me`, `/progress`, `/missions`, `/guardian-link` | Siswa | Profil, progres, misi, tautan orang tua |
| PUT | `/api/student/password` | Siswa | Ganti password |

### Exam

| Method | Route | Auth | Fungsi |
|--------|-------|------|--------|
| POST | `/api/exam` | Siswa | Generate exam dari bank |
| POST/GET | `/api/exam/template` | Siswa | Exam dari template/timeline |
| POST/GET | `/api/exam/apply-plan` | Siswa | Terapkan rencana perbaikan |
| POST | `/api/exam/weekly`, `/attempt`, `/analyze` | Siswa | Exam mingguan, submit, analisis |

### Media, Mindmap, YouTube, Study

| Method | Route | Auth | Fungsi |
|--------|-------|------|--------|
| POST | `/api/media/render`, `/tts` | Siswa | Render video & text-to-speech |
| GET | `/api/mindmap/screenshot` | Siswa | Snapshot mindmap |
| POST | `/api/youtube/transcript` | Siswa | Transkrip video |
| POST/GET | `/api/study` | Siswa | Sesi belajar |
| GET | `/api/queues` | Admin | Status queue |

### Auth

| Method | Route | Auth | Fungsi |
|--------|-------|------|--------|
| POST | `/api/auth/[...nextauth]` | Publik | NextAuth (admin/orang tua) |
| GET | `/api/auth/me` | Session | Info user saat ini |
| POST | `/api/auth/student-login` | Publik | Login siswa |
| POST | `/api/auth/student/set-password`, `/reset-password` | Publik/Siswa | Kelola password siswa |

### Admin

| Method | Route | Fungsi |
|--------|-------|--------|
| GET/POST/DELETE | `/api/admin/students` | List, buat, hapus siswa |
| PATCH/DELETE · POST | `/api/admin/students/[id]` · `/[id]/restore` | Ubah, pulihkan |
| POST | `/api/admin/students/approve`, `/students/restore` | Approve & restore massal |
| POST · GET | `/api/admin/students/[id]/set-password` · `/[id]/password-reset-link` | Kredensial |
| GET/POST | `/api/admin/curriculum` | Kelola kurikulum |
| POST · PATCH/DELETE · POST | `/api/admin/curriculum/material` · `material/[id]` · `material/[id]/reorder` | Kelola materi |
| GET/POST · PATCH/DELETE | `/api/admin/quizzes` · `quizzes/[id]` | Kelola bank quiz |
| GET | `/api/admin/pending`, `/bot-status`, `/system-info` | Status & approval |
| POST | `/api/admin/approve`, `/set-webhook` | Approval & webhook |

### Curriculum Batch

| Method | Route | Auth | Fungsi |
|--------|-------|------|--------|
| POST/GET | `/api/curriculum/batch-generate`, `/batch-mindmap` | Admin | Batch generate materi & mindmap |
| POST | `/api/curriculum/regenerate` | Admin | Regenerate kurikulum |

## Alur Request Telegram Bot

```
User kirim pesan ke @senangbelajar_bot
    │
    ▼
Telegram → POST /api/bot/webhook
    ├── verifikasi header x-telegram-bot-api-secret-token
    ├── dedupe update_id (TTL 1 jam)
    └── onMessage() — src/bot/handlers/message.ts
         │
         ├── /start trial        → onboarding.handleTrialStart
         ├── /daftar, /parent_daftar → register
         ├── command orang tua   → parent.ts (/progres /laporan /peringatan)
         ├── student terdaftar:
         │    ├── routeByState()      → state-machine (kuis berjalan, dsb.)
         │    ├── /quiz /drill /speedmath /start /help /web /weeklyexam
         │    ├── routeCommand()      → /badge /review /nilai /prosem /pr
         │    ├── isQuizRequest()     → deteksi intent quiz deterministik
         │    └── handleMessage()     → agent/tutor.ts (LLM + persona)
         │         └── tag intent di respons: [QUIZ] [SCHEDULE]
         │             [SCHOOL_SCHEDULE] [MATERIALS] [YOUTUBE:id] [VIDEOS:…]
         │             [DASHBOARD] [REMINDER] [HOMEWORK] [PASSWORD]
         │             [EXTENSION:REQUEST]
         └── belum terdaftar     → instruksi /daftar
```

Catatan: karena webhook mode membangun `Context` manual, middleware `bot.command()`
Telegraf tidak pernah dieksekusi — semua routing eksplisit seperti di atas.

## Alur Queue (BullMQ / In-Memory)

```
POST /api/students {action: "trigger", studentId, stages?}
    │
    ▼
Queue Runner (src/queue/runner.ts) — worker didaftarkan di src/instrumentation.ts
    ├── content-scrape          → Content Agent Worker
    ├── curriculum-review       → Curriculum Agent Worker
    ├── assessment-generate     → Assessment Agent Worker
    ├── assessment-evaluate     → Assessment Agent Worker
    ├── improvement-analysis    → Assessment Agent Worker
    ├── media-render            → Media Agent Worker
    ├── media-yt-fallback       → Media Agent (fallback YouTube)
    ├── guardian-report         → Guardian Agent Worker
    ├── scheduler-assign        → Scheduler Agent Worker
    └── scheduler-reminder      → Scheduler Agent Worker
```

Redis tidak tersedia → `initQueues()` melaporkan `DISABLED` dan 10 processor
yang sama didaftarkan lewat `src/queue/local.ts` (in-memory).
