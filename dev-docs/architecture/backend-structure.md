# Backend Structure — Struktur Backend

> **Status:** DATA FILE — Update saat ada perubahan struktur backend.

---

## Pola Arsitektur

Monolith Next.js 16 dengan **App Router**. Semua backend logic ada di dalam satu project Next.js.

## Key Architecture Decisions

1. **API Routes di `src/app/api/`** — file-based routing sesuai konvensi Next.js App Router
2. **Agents di `src/agents/`** — dipisah per agent (masing-masing punya worker + logic)
3. **LLM via 9Router** — gateway lokal di port 20128, bukan OpenAI langsung (biaya lebih murah)
4. **Queue abstraction** — BullMQ kalau Redis ada, fallback in-memory kalau tidak
5. **Prisma 7** — ORM dengan adapter (pg untuk PostgreSQL, sqlite untuk development)
6. **Bot di `src/bot/`** — Telegraf.js dengan webhook mode, state machine untuk routing

## Diagram Layer Backend

```
src/
├── app/api/*                ← HTTP layer — Next.js API routes
│
├── bot/                     ← Telegram bot (webhook receiver)
│   ├── bot.ts               ← Telegraf bot initialization
│   ├── launch.ts            ← Launch/polling mode
│   ├── setup-webhook.ts     ← Webhook registration
│   ├── session.ts           ← Session management (DB-backed)
│   ├── state-machine.ts     ← State machine routing
│   ├── personas.ts          ← 3 persona definitions
│   ├── safety.ts            ← Content safety filter
│   ├── handlers/            ← Per-type message handlers
│   │   ├── start.ts         ← /start command
│   │   ├── message.ts       ← Text message router
│   │   ├── register.ts      ← Parent registration
│   │   ├── onboarding.ts    ← Student onboarding flow
│   │   ├── quiz.ts          ← Quiz interaction
│   │   ├── vision.ts        ← Image/photo analysis
│   │   ├── schedule.ts      ← Schedule interaction
│   │   ├── material.ts      ← Material viewer
│   │   ├── youtube.ts       ← YouTube summary & recommend
│   │   ├── parent.ts        ← Parent commands
│   │   ├── progress.ts      ← Progress tracking
│   │   └── generic.ts       ← Fallback handler
│   └── agent/
│       ├── tutor.ts         ← Tutor agent (LLM-driven chat)
│       └── reminder.ts      ← Reminder agent logic
│
├── agents/                  ← 7 AI Agent Workers (queue-driven)
│   ├── curriculum/
│   │   ├── index.ts         ← Barrel exports
│   │   ├── service.ts       ← Curriculum service (from static data)
│   │   └── worker.ts        ← Queue consumer
│   ├── content/
│   │   ├── index.ts         ← Barrel exports
│   │   ├── scrape.ts        ← Web scraper
│   │   ├── fallback.ts      ← Source fallback logic
│   │   ├── ethics.ts        ← Content ethics filter
│   │   └── worker.ts        ← Queue consumer
│   ├── assessment/
│   │   ├── index.ts         ← Barrel exports
│   │   ├── types.ts         ← Type definitions
│   │   ├── generator.ts     ← Quiz generator
│   │   ├── grader.ts        ← Quiz grader
│   │   ├── exam.ts          ← Exam generator
│   │   └── worker.ts        ← Queue consumer
│   ├── media/
│   │   ├── index.ts         ← Barrel exports
│   │   ├── characters.ts    ← Character definitions
│   │   ├── script.ts        ← Script generator
│   │   ├── renderer.ts      ← Video renderer
│   │   ├── tts.ts           ← Text-to-speech
│   │   ├── youtube.ts       ← YouTube upload
│   │   └── worker.ts        ← Queue consumer
│   ├── guardian/
│   │   ├── index.ts         ← Barrel exports
│   │   ├── admission.ts     ← Student admission flow
│   │   ├── report.ts        ← Weekly report generator
│   │   ├── early-warning.ts ← Early warning detection
│   │   ├── safety.ts        ← Report safety check
│   │   ├── notifier.ts      ← Parent notification
│   │   └── worker.ts        ← Queue consumer
│   └── scheduler/
│       ├── index.ts         ← Barrel exports
│       ├── assigner.ts      ← Schedule assigner (60/30/10)
│       ├── reminder.ts      ← Reminder logic
│       ├── motivation.ts    ← Weekly motivation
│       ├── reschedule.ts    ← Auto-reschedule
│       └── worker.ts        ← Queue consumer
│
├── llm/                     ← LLM Client Abstraction
│   ├── client.ts            ← 9Router OpenAI-compatible client
│   ├── types.ts             ← Type definitions (AgentRole, LLMResult, etc.)
│   └── prompts.ts           ← System prompts per agent
│
├── queue/                   ← Queue Abstraction Layer
│   ├── definitions.ts       ← Queue names, types, job payloads
│   ├── runner.ts            ← BullMQ runner + worker factory
│   └── local.ts             ← In-memory fallback (tanpa Redis)
│
├── lib/                     ← Shared Utilities
│   ├── prisma.ts            ← Prisma client singleton
│   ├── mindmap-template.ts  ← Markdown → mindmap parser
│   └── validations/         ← Input validations
│       └── auth.ts          ← Auth validation schemas
│
├── middleware.ts            ← Next.js middleware (auth guard)
│
├── data/                    ← Static Data Banks (immutable)
│   ├── curriculum-topics.ts ← Curriculum topics per grade
│   ├── curriculum-content.ts ← Curriculum content data
│   ├── quiz-bank-sd5.ts     ← 540 soal SD kelas 5
│   ├── quiz-bank-smp7.ts    ← 495 soal SMP kelas 1
│   ├── quiz-bank-sma11.ts   ← 615 soal SMA kelas 2
│   ├── youtube-sd5.ts       ← YouTube references SD
│   ├── youtube-smp7.ts      ← YouTube references SMP
│   └── youtube-sma11.ts     ← YouTube references SMA
│
└── generated/               ← Auto-generated (jangan diedit)
    └── prisma/              ← Prisma generated client
```

## Komunikasi Antar Agent

7 agen berkomunikasi melalui **BullMQ queues** (dengan in-memory fallback jika Redis tidak tersedia):

1. **Guardian** → admit student → trigger **Curriculum**:generate → pipeline dimulai
2. **Curriculum** → draft topics dari data statis → trigger **Content**:scrape
3. **Content** → scrape materi dari internet → trigger **Curriculum**:review
4. **Curriculum** → review content → trigger **Assessment**:generate
5. **Assessment** → generate quizzes → student akses via **Tutor**
6. **Tutor** → chat & quiz interaktif dengan student → report ke **Guardian**
7. **Scheduler** → jadwal & reminder (independent cron, setiap 3 menit)

## Queue Definitions (9 queues)

| Queue Name | Concurrency | Worker Agent | Trigger |
|-----------|-------------|-------------|---------|
| `content-scrape` | 2 | Content | Draft curriculum selesai |
| `curriculum-review` | 2 | Curriculum | Scraping selesai |
| `media-render` | 1 | Media | Ready untuk video |
| `media-yt-fallback` | 2 | Media | Render gagal |
| `assessment-generate` | 3 | Assessment | Content siap |
| `assessment-evaluate` | 2 | Assessment | Student submit jawaban |
| `guardian-report` | 1 | Guardian | Weekly (cron) |
| `scheduler-assign` | 1 | Scheduler | New student / minggu baru |
| `scheduler-reminder` | 3 | Scheduler | Setiap 3 menit (cron) |
