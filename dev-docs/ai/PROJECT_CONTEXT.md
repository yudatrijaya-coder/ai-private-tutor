# PROJECT_CONTEXT

> **Status:** DATA FILE — AI WAJIB mengupdate saat ada perubahan stack atau struktur.
> **Purpose:** Overview sistem, stack teknologi, dan struktur project.

---

## System Overview

AI Private Tutor adalah platform belajar pintar berbasis **7 AI Agent terintegrasi** untuk siswa SD/SMP/SMA. Sistem berjalan sebagai monolith Next.js 16 dengan App Router, menggunakan Prisma 7 ORM untuk database dan 9Router sebagai LLM gateway. Bot Telegram (@senangbelajar_bot) adalah interface utama untuk siswa, sementara web dashboard melayani orang tua dan admin.

## Project Type Declaration

| Item | Value |
|------|-------|
| Project Type | Monolith |
| Git Location | Root (`./`) |

## Runtime Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + Tailwind CSS 4 + React Flow (mindmap) |
| Backend | Next.js API Routes + Prisma ORM |
| Database Primary | PostgreSQL (prod) / SQLite (dev) |
| LLM Gateway | 9Router combo `ai_tutor_agent` pada localhost:20128 |
| Queue | BullMQ + Redis (opsional, fallback in-memory) |
| Bot Framework | Telegraf.js (Telegram webhook) |
| Web Server | Caddy 2 (reverse proxy + auto-SSL) |
| Process Manager | PM2 |

## Database Topology

| Connection | Domain / Schema | Notes |
|-----------|----------------|-------|
| `default` | `ai_private_tutor` (PostgreSQL) | prod — localhost:5432 |
| `dev` | `dev.db` (SQLite) | dev — file-based di prisma/ |

## Source Structure (Important)

| Path | Function |
|------|----------|
| `src/app/` | App Router pages & API routes |
| `src/components/` | UI & mindmap components |
| `src/lib/` | Utilities (prisma client, mindmap-template) |
| `src/llm/` | LLM client, types, prompt templates |
| `src/bot/` | Telegram bot handlers & agent logic |
| `src/agents/` | 7 agent workers (curriculum, content, assessment, media, guardian, scheduler, tutor) |
| `src/queue/` | BullMQ queue definitions, runner, local fallback |
| `src/data/` | Static data (quiz bank, curriculum topics) |
| `src/scripts/` | CLI scripts (seed, generate quizzes) |
| `prisma/` | Prisma schema, migrations, config |
| `ops/` | Caddyfile, PM2 ecosystem |

## Uncertainty Markers

- Assumption based on repository analysis: Database adapter uses `@prisma/adapter-pg` + `pg.Pool` for PostgreSQL
- Assumption based on repository analysis: 9Router handles all model routing via combo `ai_tutor_agent`
