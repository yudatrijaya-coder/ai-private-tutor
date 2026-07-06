# AI Private Tutor — Project Memory

## Overview
Next.js 16 monolith serving 3 children (SD5, SMP1, SMA2) with 7 AI agents, Telegram bot, and superuser dashboard. Self-contained — no scraping dependency for curriculum.

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** SQLite via Prisma (dev.db) — swap to PostgreSQL for production
- **ORM:** Prisma (generated client at `@/generated/prisma/client`)
- **Auth:** NextAuth.js (credentials + student login)
- **Bot:** Telegraf 4.16.3 (long-polling dev, webhook prod)
- **LLM:** Custom client at `@/llm/client` (OpenRouter-compatible)
- **Queue:** BullMQ (Redis) + in-memory fallback (`@/queue/local`)
- **Port:** 3001 (stockbitapikiro uses 3000)

## Key Directories
| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router (dashboard + student UI + API routes) |
| `src/bot/` | Telegram bot (Telegraf handlers, session, state machine) |
| `src/agents/` | 7 AI agents (curriculum, content, assessment, media, scheduler, guardian, tutor) |
| `src/data/` | Self-contained curriculum topics, content bank, quiz bank |
| `src/queue/` | BullMQ + in-memory queue fallback with retry |
| `src/llm/` | LLM client, prompts, types |
| `src/lib/` | Auth, prisma, env validation, rate-limit, sanitize |
| `src/rules/` | Business rules / safety engine |
| `src/generated/prisma/` | Generated Prisma models |

## Routes (24 total)
| Route | Type | Purpose |
|-------|------|---------|
| `/dashboard` | SSR | Superuser dashboard with stats, student cards, pipeline |
| `/dashboard/agents` | CSR | Agent pipeline view + queue monitor |
| `/dashboard/curriculum` | SSR | Curriculum management |
| `/dashboard/settings` | CSR | Bot config, webhook, queue dashboard |
| `/dashboard/students` | SSR | Student list + detail + admission |
| `/student` | SSR | Student portal (materi, kuis, progres) |
| `/student/quiz` | SSR | Quiz attempt page |
| `/student/profile` | SSR | Profile settings |
| `/api/*` | API | Admin, admission, auth, curriculum, queues, bot webhook |

## Telegram Bot (@senangbelajar_bot)
- Token: `8899613141:AAHxi2pk_vVCSGa4w60OS76UrMGiDVLFTrw`
- Commands: `/start`, `/daftar <id>`, `/materi`, `/quiz`/`/kuis`, `/jadwal`, `/nilai`, `/help`
- Registration: student must be pre-registered via dashboard → `/daftar <studentId>` links Telegram
- Modes: polling (dev via `npx tsx src/bot/launch.ts`) or webhook (`/api/bot/webhook`)
- Handler chain: `message.ts` → `state-machine.ts` (quiz, vision) → LLM tutor intent detection

## Key Decisions
- **Port 3000 reserved** for stockbitapikiro — tutor app on 3001
- **No external scraping** — all curriculum/content/quiz data is self-contained in `src/data/`
- **Video generation deferred** — will use AI talking avatar + slides; curriculum/quiz pipeline first
- **Cost-conscious LLM** — prefers OpenRouter cheap models per agent, not locked to GPT
- **Self-contained bot handlers** — no chat history divergence between agent and user; bot uses `@/lib/prisma` directly
- **Queue falls back to in-memory** when Redis unavailable (BullMQ not required for dev)

## Running Locally
```bash
# Dev server (port 3001)
npm run dev

# Bot polling (separate terminal)
npx tsx src/bot/launch.ts

# Build
npx next build

# DB reset
npx prisma db push
npx tsx src/scripts/seed.ts
```

## Students
3 students: SD5 (11 subjects), SMP1 (11 subjects), SMA2 (11 subjects). Each has full curriculum, quiz bank, and content bank in `src/data/`. When a student is created via admission form, curriculum is generated from these data files.

## Architecture
- **7 agents:** Curriculum (topic mapping), Content (lesson material), Media (video script + tts), Assessment (quiz + exam), Tutor (LLM chat), Guardian (safety + early-warning), Scheduler (motivation + reminders)
- **Orchestration:** Agent pipeline runs via queue workers; monitored in `/dashboard/agents`
- **User-facing:** No chat history storage — bot is stateless between messages (session only for quiz-active state)
