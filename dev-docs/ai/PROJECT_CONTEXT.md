# PROJECT_CONTEXT

> **Status:** DATA FILE — perbarui saat stack atau struktur berubah.
> **Verifikasi terakhir:** 2026-10-25, commit `0207add`.

---

## System Overview

AI Private Tutor adalah platform belajar untuk siswa SD kelas 5, SMP kelas 7, dan SMA kelas 11 (satu grade aktif per jenjang: `SD_5`, `SMP_1`, `SMA_2`). Bentuknya **monolith Next.js 16** dengan App Router.

Dua permukaan produk:

- **Bot Telegram** — kanal utama siswa. Persona per jenjang: Kak Budi 🦉 (SD), Kak Dewi 🌟 (SMP), Kak Raka 🔥 (SMA).
- **Web** — dashboard siswa, dashboard admin, dan preview untuk orang tua. Landing page publik di `/`.

## Project Type Declaration

| Item | Value |
|------|-------|
| Project Type | Monolith |
| Git Location | Root (`./`) |
| Default branch | `master` |

## Runtime Stack

| Layer | Technology | Versi terpasang |
|-------|-----------|-----------------|
| Framework | Next.js App Router + Turbopack build | 16.3.0 |
| UI | React, Tailwind CSS, `@xyflow/react`, Lucide | 19.2.4 / 4.3.2 / 12.11.2 / 1.24.0 |
| Backend | Next.js API routes (73 `route.ts`) | — |
| ORM | Prisma + `@prisma/adapter-pg` + `pg.Pool` | 7.9.1 |
| DB | PostgreSQL 16 (prod) / SQLite (dev) | 16 |
| LLM Gateway | 9Router combo `ai_tutor_agent` | 9Router 0.5.109 |
| LLM SDK | `openai` (OpenAI-compatible) | 6.45.0 |
| Queue | BullMQ + Redis, fallback in-memory | 5.79.2 |
| Bot | Telegraf, webhook mode | 4.16.3 |
| Process manager | PM2 (fork mode, 1 instance) | — |
| Reverse proxy | Caddy 2 (auto-SSL) | — |
| Node | — | 22.23.1 |

## Topologi Runtime

```
Telegram ──▶ Caddy :443 ──▶ Next.js :3000
Browser  ──▶ Caddy :443 ──▶ Next.js :3000 ──▶ PostgreSQL :5432
                                     │
                                     ├──▶ 9Router :20128 ──▶ provider upstream
                                     └──▶ Redis :6379 (BullMQ; ada fallback in-memory)
```

PM2 menjalankan dua proses: `9router` (`/usr/lib/node_modules/9router/cli.js` — `--port 20128 --host 127.0.0.1`) dan `ai-private-tutor` (`npm start -- -p 3000`, cwd `/home/ubuntu/ai-private-tutor`).

## Database Topology

| Connection | Value | Catatan |
|-----------|-------|---------|
| `DATABASE_URL` | `postgresql://tutor:***@localhost:5432/ai_private_tutor` | Dipakai tooling Prisma |
| Pool aplikasi | `PGHOST` / `PGPORT` / `PGDATABASE` / `PGUSER` / `PGPASSWORD` | `src/lib/prisma.ts` membuat `pg.Pool` sendiri, **tidak** membaca `DATABASE_URL`; `PGPASSWORD` wajib (gagal keras bila kosong) |
| Dev | `prisma/dev.db` (SQLite) | `npm run dev` |

Schema: 33 model + 12 enum di `prisma/schema.prisma` (761 baris). Migrasi: satu baseline `20260810011925_baseline`. Client Prisma di-generate ke `src/generated/prisma/` (gitignored).

## Source Structure

| Path | Fungsi |
|------|--------|
| `src/app/` | App Router: halaman + 73 API route |
| `src/app/(student)/student/` | 18 halaman siswa (quiz, mindmap, slides, exam, progress, …) |
| `src/app/(dashboard)/dashboard/` | Dashboard admin (students, curriculum, quizzes, agents, settings) |
| `src/app/(auth)/` | Login admin/orang tua + login siswa |
| `src/app/api/bot/webhook/` | Satu-satunya pintu masuk Telegram |
| `src/app/api/cron/` | 7 endpoint terjadwal |
| `src/bot/` | Telegraf: `handlers/message.ts` (router), `agent/tutor.ts`, `personas.ts`, `safety.ts`, `commands.ts`, `state-machine.ts` |
| `src/agents/` | 6 worker queue: curriculum, content, assessment, media, guardian, scheduler |
| `src/llm/` | `client.ts` (routing + fallback + budget), `prompts.ts`, `types.ts` |
| `src/lib/` | prisma, auth, cron guard, gamification, spaced-repetition, prosem, mindmap |
| `src/queue/` | Definisi BullMQ + runner + fallback lokal |
| `src/data/` | Bank quiz statis (540/495/615 soal) & topik kurikulum — dipakai sebagai **sumber generate**, bukan runtime baca |
| `src/instrumentation.ts` | Registrasi worker queue saat startup |
| `ops/` | `build.sh`, `Caddyfile`, `ecosystem.config.cjs`, script cron |
| `prisma/` | Schema, migrasi, `dev.db`. `prisma.config.ts` memakai `DATABASE_URL` bila valid, kalau tidak membangun URL dari `PG*` |

## LLM Routing

`src/llm/client.ts`:

- `MODEL_ROUTES` memetakan semua `AgentRole` → `ai_tutor_agent`.
- `FALLBACK_CHAIN` → `["ai_tutor_agent", "hermes"]`.
- `VISION_MODELS` → `ai_tutor_agent`, lalu `sumopod/gpt-4o-mini`, `sumopod/gemini/gemini-2.5-flash-lite`, `sumopod/deepseek-v4-flash`.
- `DAILY_TOKEN_CAP` = 1.000.000 token per siswa per hari; pemakaian dicatat di `ApiUsage`.
- `resolveApiKey()` **melempar error** kalau `LLM_API_KEY` kosong — tidak ada fallback `"sk-9router"` lagi. Untuk endpoint lokal tanpa auth, set `LLM_ALLOW_NO_KEY=1`.

## Persona & Grade

| Grade | Label | Persona |
|---|---|---|
| `SD_5` | SD Kelas 5 | Kak Budi 🦉 |
| `SMP_1` | SMP Kelas 7 | Kak Dewi 🌟 |
| `SMA_2` | SMA Kelas 11 | Kak Raka 🔥 |

Label grade: `src/lib/grade-label.ts`. Persona: `src/bot/personas.ts`.

## Asumsi yang Sudah Diverifikasi

Semua klaim di atas dicek langsung ke source dan runtime VPS pada 2026-10-25. Tidak ada marker asumsi tersisa di dokumen ini.
