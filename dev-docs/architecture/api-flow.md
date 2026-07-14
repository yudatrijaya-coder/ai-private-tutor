# API Flow — AI Private Tutor

> **Status:** DATA FILE — Update saat ada perubahan API endpoints.

---

## Arsitektur Request

```
Client (Telegram / Browser / WhatsApp)
    │
    ▼
Caddy (reverse-proxy, port 443/80 → 3000)
    │
    ▼
Next.js 16 (port 3000)
    ├── Middleware (auth guard — session + token)
    │
    ├── API Routes (/api/*)
    │   ├── /api/bot/webhook          ← Telegram bot webhook
    │   ├── /api/students             ← Student CRUD + pipeline trigger
    │   ├── /api/exam/*               ← Exam generation
    │   ├── /api/media/*              ← Media rendering
    │   ├── /api/cron/*               ← Scheduled tasks
    │   ├── /api/auth/*               ← Auth (login, me, password)
    │   ├── /api/admin/*              ← Admin dashboard CRUD
    │   ├── /api/reminders/*          ← Reminder system
    │   ├── /api/curriculum/*         ← Curriculum batch ops
    │   └── /api/youtube/*            ← YouTube transcript
    │
    ├── Server Components (pages)
    │   ├── /(dashboard)              ← Admin dashboard
    │   ├── /(student)                ← Student portal
    │   └── /docs                     ← Documentation pages
    │
    └── 9Router LLM Gateway (port 20128)
        ├── ai_tutor_agent (combo — primary)
        ├── sumopod/deepseek-v4-flash (fallback 1)
        └── hermes (fallback 2)
```

## Daftar API Route

### Bot & Telegram

| Method | Route | Auth | Fungsi |
|--------|-------|------|--------|
| POST | `/api/bot/webhook` | Secret token | Menerima update dari Telegram |
| GET | `/api/reminders/check` | Cron | Cek & kirim reminder terjadwal |
| POST | `/api/cron/schedule-sweep` | Cron | Sweep jadwal (H-1, T-30, missed) |

### Student

| Method | Route | Auth | Fungsi |
|--------|-------|------|--------|
| GET | `/api/students` | Session | List semua student |
| POST | `/api/students` | Session | Pipeline trigger (curriculum/content/quiz/jadwal) |
| GET | `/api/students/[id]` | Session | Detail student |
| GET | `/api/students/subjects` | Session | List subject per student |
| GET | `/api/students/topics` | Session | List topic per subject |
| GET | `/api/students/material/[id]` | Session | Konten materi |
| GET | `/api/students/quizzes` | Session | Quiz milik student |
| GET | `/api/students/quizzes/[id]` | Session | Detail quiz + jawaban |

### Exam & Quiz

| Method | Route | Auth | Fungsi |
|--------|-------|------|--------|
| POST | `/api/exam` | Session | Generate exam dari quiz bank |
| POST | `/api/exam/template` | Session | Generate exam dari template (weekly timeline) |

### Media

| Method | Route | Auth | Fungsi |
|--------|-------|------|--------|
| POST | `/api/media/render` | Session | Render video pembelajaran |
| POST | `/api/media/tts` | Session | Text-to-speech |
| POST | `/api/mindmap/screenshot` | Session | Screenshot mindmap untuk preview |

### Auth

| Method | Route | Auth | Fungsi |
|--------|-------|------|--------|
| GET | `/api/auth/me` | Session | Info user saat ini |
| POST | `/api/auth/student-login` | Public | Login student (password) |
| POST | `/api/auth/student/set-password` | Public | Set password pertama kali |
| POST | `/api/auth/student/reset-password` | Session | Reset password |

### Admin

| Method | Route | Auth | Fungsi |
|--------|-------|------|--------|
| GET | `/api/admin/students` | Admin | List semua student (admin) |
| GET/PUT/DELETE | `/api/admin/students/[id]` | Admin | CRUD student |
| POST | `/api/admin/students/[id]/set-password` | Admin | Set password student |
| POST | `/api/admin/students/[id]/password-reset-link` | Admin | Generate link reset |
| POST | `/api/admin/students/[id]/restore` | Admin | Restore student |
| POST | `/api/admin/students/restore` | Admin | Batch restore |
| GET/POST | `/api/admin/curriculum` | Admin | Manage curriculum |
| GET/POST/PUT/DELETE | `/api/admin/curriculum/material` | Admin | CRUD material |
| PUT | `/api/admin/curriculum/material/[id]/reorder` | Admin | Urutkan material |
| GET/POST/DELETE | `/api/admin/quizzes` | Admin | Manage quiz bank |
| GET/PUT/DELETE | `/api/admin/quizzes/[id]` | Admin | CRUD quiz individual |
| GET | `/api/admin/pending` | Admin | Student pending approval |
| POST | `/api/admin/approve` | Admin | Approve student |

### Curriculum Batch

| Method | Route | Auth | Fungsi |
|--------|-------|------|--------|
| POST | `/api/curriculum/batch-generate` | Session | Batch generate curriculum dari data statis |
| POST | `/api/curriculum/batch-mindmap` | Session | Batch generate mindmap dari slides |

### YouTube

| Method | Route | Auth | Fungsi |
|--------|-------|------|--------|
| POST | `/api/youtube/transcript` | Session | Ambil transcript video YouTube |

## Alur Request Telegram Bot

```
User kirim pesan ke @senangbelajar_bot
    │
    ▼
Telegram → POST /api/bot/webhook (dengan secret token)
    │
    ▼
Telegraf.js router (src/bot/bot.ts)
    ├── /start          → start.ts       → Cek registrasi + sambutan
    ├── text            → message.ts     → State machine → route ke handler
    │   ├── terdaftar   → agent/tutor.ts → Tutor LLM + persona
    │   └── onboarding  → onboarding.ts  → Proses registrasi
    ├── photo           → vision.ts      → Analisis gambar (foto soal)
    ├── quiz_answer     → quiz.ts        → Jawaban quiz interaktif
    ├── callback_query  → schedule.ts    → Konfirmasi jadwal
    └── command         → handler specific
```

## Alur Queue (BullMQ / In-Memory)

```
POST /api/students {action: "trigger", stages: ["curriculum","content","quiz","schedule"]}
    │
    ▼
Queue Runner (src/queue/runner.ts)
    ├── content-scrape          → Content Agent Worker
    ├── curriculum-review       → Curriculum Agent Worker
    ├── media-render            → Media Agent Worker
    ├── media-yt-fallback       → Media Agent (YouTube fallback)
    ├── assessment-generate     → Assessment Agent Worker
    ├── assessment-evaluate     → Assessment Agent Worker
    ├── guardian-report         → Guardian Agent Worker (weekly)
    ├── scheduler-assign        → Scheduler Agent Worker
    └── scheduler-reminder      → Scheduler Agent Worker (3 menit)
```
