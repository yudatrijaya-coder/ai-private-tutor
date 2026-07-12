# FINAL_SYSTEM_HANDOVER.md — Handover Dokumentasi

> **Status:** PRODUCTION — Reference untuk engineer/AI agent baru.
> **Purpose:** Handover lengkap system AI Private Tutor.

---

## System Overview

AI Private Tutor adalah platform belajar pintar berbasis 7 AI Agent untuk siswa SD/SMP/SMA. Interface utama via Telegram bot (@senangbelajar_bot) dengan 3 persona sesuai jenjang. Web dashboard untuk monitoring orang tua dan admin.

### Key Contacts / Access

| Resource | Value |
|----------|-------|
| VPS | `ssh ubuntu@43.133.151.242` |
| PM2 App | `ai-private-tutor` |
| Domain | `senangbelajar.web.id` |
| Bot | `@senangbelajar_bot` |
| LLM Gateway | `http://localhost:20128` (9Router combo `ai_tutor_agent`) |
| DB Prod | PostgreSQL `localhost:5432` db=`ai_private_tutor` user=`tutor` |

### Architecture Highlights

- **Monolith Next.js 16** — App Router dengan server components + API routes
- **7 AI Agents** — Tutor, Curriculum, Content, Assessment, Media, Guardian, Scheduler
- **9Router LLM** — Combo `ai_tutor_agent` dengan fallback chain
- **BullMQ Queue** — Redis-backed dengan in-memory fallback
- **Telegraf.js** — Webhook mode untuk Telegram bot
- **Caddy** — Reverse proxy + auto-SSL

### Mindmap Premium

Fitur flagship dengan radial quadrant layout, Lucide icons per node, per-icon CSS animations, 3-level visual hierarchy, dan SD/SMP/SMA theme system.

### Quiz Bank

1650 soal pre-generated (SD108=540Q, SMP99=495Q, SMA123=615Q) dengan exam auto-generator dari weekly timeline.

### File Structure

```
ai-private-tutor/
├── ai-rules/           ← IMMUTABLE templates (docs-ai format)
├── dev-docs/           ← Device documentation output
├── prod-docs/          ← Production server documentation
├── backup/             ← Backup old docs
├── src/                ← Source code
│   ├── app/            ← Next.js App Router pages & API
│   ├── components/     ← UI & mindmap components
│   ├── lib/            ← Utilities
│   ├── llm/            ← LLM client / fallback chain
│   ├── bot/            ← Telegram bot handlers & agents
│   ├── agents/         ← 7 Agent workers
│   ├── queue/          ← BullMQ definitions & runners
│   └── data/           ← Static data (quiz, curriculum)
├── prisma/             ← Schema, migrations, config
├── ops/                ← Caddy, PM2 configs
└── docs/               ← Legacy docs (still present, pending removal)
```

## Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (prod) or SQLite path (dev) |
| `TELEGRAM_BOT_TOKEN` | Bot token dari BotFather |
| `LLM_BASE_URL` | 9Router base URL (default: http://localhost:20128/v1) |
| `LLM_API_KEY` | 9Router API key (default: sk-9router) |
| `SUMOPOD_API_KEY` | SumoPod fallback API key |
| `NEXTAUTH_SECRET` | NextAuth.js secret |
| `NEXTAUTH_URL` | App URL |
| `REDIS_URL` | Redis URL (opsional, fallback in-memory) |

## Safety Notes

- **DO NOT** commit secrets to git — `.env` is in `.gitignore`
- **DO NOT** push directly to `main` — use `feat/*` or `vps/*` branches
- **DO NOT** refactor mindmap radial layout — it's the signature feature
- **ALWAYS** use 9Router for LLM calls, not OpenAI directly
