# API Flow — AI Private Tutor

> **Status:** DATA FILE — AI update saat ada perubahan API endpoints.

---

## Request Flow

```
Client (Telegram / Browser)
    │
    ▼
Caddy (reverse-proxy, port 443/80)
    │
    ▼
Next.js 16 (port 3000)
    ├── Middleware (auth guard)
    │
    ├── API Routes (/api/*)
    │   ├── /api/bot/webhook      ← Telegram bot webhook
    │   ├── /api/students          ← Student CRUD + pipeline trigger
    │   ├── /api/exam/*            ← Exam generation
    │   ├── /api/media/*           ← Media rendering
    │   └── /api/cron/*            ← Scheduled tasks
    │
    ├── Server Components (pages)
    │   ├── /(dashboard)           ← Admin dashboard
    │   ├── /(student)             ← Student portal
    │   └── /docs                  ← Documentation pages
    │
    └── 9Router LLM Gateway (port 20128)
        ├── ai_tutor_agent (combo)
        ├── sumopod/deepseek-v4-flash (fallback)
        └── hermes (secondary fallback)
```

## API Route Map

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/bot/webhook` | Secret token | Telegram update handler |
| GET | `/api/students` | Yes | List students |
| POST | `/api/students` | Yes | Pipeline trigger |
| GET | `/api/students/[id]` | Yes | Student detail |
| GET | `/api/students/quizzes` | Yes | Student quiz list |
| GET | `/api/students/quizzes/[id]` | Yes | Quiz detail |
| GET | `/api/students/subjects` | Yes | Subject list |
| GET | `/api/students/topics` | Yes | Topic list per subject |
| GET | `/api/students/material/[id]` | Yes | Material content |
| POST | `/api/exam` | Yes | Generate exam |
| POST | `/api/exam/template` | Yes | Template-based exam |
| POST | `/api/media/render` | Yes | Render video |
| POST | `/api/media/tts` | Yes | Text-to-speech |
| GET | `/api/auth/me` | Yes | Current user info |
| POST | `/api/cron/guardian-report` | Yes | Weekly report cron |

## Telegram Bot Message Flow

```
User sends message
    │
    ▼
Telegram → POST /api/bot/webhook
    │
    ▼
Telegraf.js router
    ├── /start        → register.ts    → Welcome + registration
    ├── text          → message.ts     → Tutor agent (LLM)
    ├── photo         → vision.ts      → Image analysis
    └── quiz_callback → quiz.ts        → Quiz answer handling
```

## Queue Flow (BullMQ)

```
POST /api/students {action:"trigger", stages}
    │
    ▼
Queue Runner (BullMQ / In-Memory)
    ├── curriculum:generate   → Curriculum Agent Worker
    ├── content:scrape        → Content Agent Worker
    ├── assessment:generate   → Assessment Agent Worker
    └── scheduler:assign      → Scheduler Agent Worker
```
