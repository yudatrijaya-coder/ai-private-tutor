# Modul — Index

> **Status:** DATA FILE — Update saat ada modul baru atau perubahan struktur.
> **Purpose:** Dokumentasi terperinci setiap modul dalam codebase, termasuk 7 AI Agent, bot handlers, API routes, dan LLM client.

---

## Daftar Modul

| No | Modul | Path | Fungsi Utama |
|----|-------|------|-------------|
| 1 | [Curriculum Agent](curriculum-agent.md) | `src/agents/curriculum/` | Generate & manage kurikulum dari data statis |
| 2 | [Content Agent](content-agent.md) | `src/agents/content/` | Scrape & proses materi dari internet |
| 3 | [Assessment Agent](assessment-agent.md) | `src/agents/assessment/` | Generate quiz, koreksi, tracking mastery |
| 4 | [Media Agent](media-agent.md) | `src/agents/media/` | Render video pembelajaran, TTS, upload YouTube |
| 5 | [Guardian Agent](guardian-agent.md) | `src/agents/guardian/` | Admission, weekly report, early warning |
| 6 | [Tutor Agent](tutor-agent.md) | `src/bot/agent/tutor.ts` | LLM-driven chat dengan 3 persona |
| 7 | [Scheduler Agent](scheduler-agent.md) | `src/agents/scheduler/` | Jadwal belajar, reminder, motivasi |
| 8 | [Bot Handlers](bot-handlers.md) | `src/bot/handlers/` | Router & handler untuk semua tipe pesan Telegram |
| 9 | [API Routes](api-routes.md) | `src/app/api/` | Semua endpoint HTTP |
| 10 | [LLM Client](llm-client.md) | `src/llm/` | OpenAI-compatible client ke 9Router |
| 11 | [Queue System](queue-system.md) | `src/queue/` | BullMQ + in-memory fallback |

## Diagram Modul & Relasi

```
┌─────────────────────────────────────────────────────────────┐
│                      Telegram Bot                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Handler  │  │  Tutor   │  │  State   │  │  Persona  │  │
│  │ Router   │──│  Agent   │──│ Machine  │  │  (3x)     │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │ webhook POST
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     Next.js API Routes                       │
│  /api/bot/webhook  /api/students  /api/exam  /api/admin/*   │
│  /api/auth/*  /api/cron/*  /api/curriculum/*  /api/media/* │
└─────────────────────┬───────────────────────────────────────┘
                      │ trigger pipeline
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Queue System (BullMQ)                     │
│  content-scrape → curriculum-review → assessment-generate   │
│  assessment-evaluate → media-render → guardian-report       │
│  scheduler-assign → scheduler-reminder                      │
└──────────┬──────────────────┬──────────────────┬────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Content    │   │  Curriculum  │  │  Assessment  │
│    Agent     │   │    Agent     │  │    Agent     │
└──────────────┘   └──────────────┘   └──────────────┘
                                      │
                                      ▼
                    ┌──────────────┐   ┌──────────────┐
                    │    Media    │   │  Guardian    │
                    │    Agent    │   │    Agent     │
                    └──────────────┘   └──────────────┘
                                      │
                                      ▼
                    ┌──────────────┐   ┌──────────────┐
                    │  Scheduler  │   │    LLM       │
                    │    Agent    │   │   Client     │
                    └──────────────┘   └──────────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │  9Router Gateway     │
                                    │  (port 20128)        │
                                    └─────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Database (Prisma)                      │
│  Student → Curriculum → Material → Quiz → Attempt          │
│  SessionState  ProgressSnap  ScheduleSession  ChatLog       │
│  HomeworkTask  Reminder  Intervention  ApiUsage  Persona    │
└─────────────────────────────────────────────────────────────┘
```
