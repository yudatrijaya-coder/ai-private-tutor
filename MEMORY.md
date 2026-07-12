# Memory — AI Private Tutor

> **Dokumentasi sudah migrasi ke format docs-ai. Lihat `dev-docs/ai/START_HERE.md` untuk entry point.**
> **`ai-rules/` adalah IMMUTABLE template. `dev-docs/` dan `prod-docs/` adalah output.**

## Repository
- GitHub: yudatrijaya-coder/ai-private-tutor
- Branch: `main` (stable), `feat/*` (PC Agent), `vps/*` (VPS Agent)
- No `dev` branch — langsung `feat/*` → `main`

## Stack
- Next.js 16.2.10, App Router, Tailwind CSS 4, Prisma 7
- PostgreSQL (prod), SQLite (dev)
- 9Router combo `ai_tutor_agent` di localhost:20128, fallback sumopod/hermes/opencode-go
- BullMQ queue + in-memory fallback
- Telegraf.js webhook mode
- Caddy + PM2 di VPS SumoPod

## VPS
- ubuntu@43.133.151.242, PM2 app `ai-private-tutor`
- senangbelajar.web.id, bot @senangbelajar_bot
- Caddy auto-SSL, PostgreSQL localhost:5432

## Mindmap (Signature Feature)
- Radial quadrant layout (no dagre), Lucide icons, per-icon CSS animations
- 3-level hierarchy: center pulse glow, branch solid border, leaf solid border
- 4 directional handles via angleDir(), 8-color palette
- File structure: 6 files in mindmap/ components + lib/

## Quiz Bank
- 1650 total: SD108 (540), SMP99 (495), SMA123 (615)
- Static files in src/data/, generated via scripts/gen-all-quizzes.ts
- Exam auto-generator from weekly timeline

## Curriculum
- SIBI 2026/2027 dari PDF Kemendikdasmen
- Data: src/data/curriculum-topics-{sd5,smp7,sma11}.ts

## Docs Structure (new)
- `ai-rules/` — IMMUTABLE templates (docs-ai format)
- `dev-docs/` — AI-generated docs (START_HERE, PROJECT_CONTEXT, MODULE_MAP, etc.)
- `prod-docs/` — Server operations docs
- `backup/old-docs/` — Legacy docs backup
- `src/app/docs/` — Web documentation pages (architecture, mindmap, map, getting-started)
