# Memory — AI Private Tutor

> **Fakta durable untuk AI agent.** Detail lengkap ada di `dev-docs/ai/` — mulai dari `START_HERE.md`.
> **Verifikasi terakhir:** 2026-10-25 (riwayat git ditulis ulang, HEAD `3fad45a`).

## Repository

> **Riwayat git ditulis ulang 2026-10-25** (`git filter-repo`) untuk membuang `CRON_SECRET` lama. Hash semua commit berubah; clone lama harus `git fetch --all && git reset --hard origin/master`.

- GitHub: `yudatrijaya-coder/ai-private-tutor` (**public**)
- Branch default: **`master`** — dokumen lama yang menyebut `main` sudah usang
- Branch kerja: `feat/*` (PC), `vps/*` (VPS); langsung ke `master`, tanpa branch `dev`

## Stack (terpasang, bukan range di package.json)

- Next.js **16.3.0**, React **19.2.4**, Tailwind **4.3.2**
- Prisma **7.9.1** + `@prisma/adapter-pg`; client di-generate ke `src/generated/prisma/` (gitignored)
- Telegraf **4.16.3** (webhook), OpenAI SDK **6.45.0** → 9Router
- BullMQ **5.79.2** + Redis, fallback in-memory (`src/queue/local.ts`)
- Node **22.23.1**

## VPS

- `ubuntu@43.133.151.242` (Tencent Cloud, Jakarta), Ubuntu 24.04, 2 vCPU / 3,6 GiB RAM
- PM2: `ai-private-tutor` (:3000, `npm start -- -p 3000`), `9router` (:20128)
- PostgreSQL 16 `localhost:5432` db `ai_private_tutor` user `tutor`; Redis :6379; Caddy :80/:443
- Domain `senangbelajar.web.id`; bot `@senangbelajar_bot`
- **Build wajib lewat `bash ops/build.sh`** (swap + `--max-old-space-size=2048`); `next build` polos pernah OOM

## Cron

- Penjadwal = **Hermes cron** di `~/.hermes/profiles/opencode/scripts/`, bukan crontab OS
- 10 job aktif (termasuk `reminders-check` tiap 1 menit, `daily-nudge` 08:00, `progress-snap-weekly` Minggu 23:00); lihat `dev-docs/ai/CURRENT_STATE.md`
- Semua route `/api/cron/*` memakai `checkCronSecret()` — fail-closed (503 kalau secret kosong)

## Bot

- Webhook mode → middleware `bot.command()` Telegraf **tidak jalan**
- Command baru wajib: cabang di `src/bot/handlers/message.ts` / `routeCommand()` (`src/bot/commands.ts`) **+** entri `COMMAND_MENU`
- Persona: Kak Budi 🦉 (SD_5), Kak Dewi 🌟 (SMP_1), Kak Raka 🔥 (SMA_2)

## Domain Model yang Gampang Salah

- **`GradeLevel` hanya 3 nilai**: `SD_5`, `SMP_1`, `SMA_2` (SD kelas 5, SMP kelas 7, SMA kelas 11)
- **Satu student bisa punya >1 `Curriculum`** — yang berlaku = `version` tertinggi (`ACTIVE_CURRICULUM_ORDER` di `src/lib/curriculum-active.ts`). Raihan punya v1 + v3.
- **`src/lib/prisma.ts` memakai pool `pg` (`PG*`), bukan `DATABASE_URL`** — `PGPASSWORD` wajib; tidak ada fallback password lagi (dihapus 2026-10-25)
- **`prisma.config.ts`** menerima `DATABASE_URL` bila password-nya bukan placeholder, kalau tidak membangun URL dari `PG*`
- **`src/data/quiz-bank-*.ts` = sumber generate**, bank runtime ada di tabel `Quiz`

## Mindmap (fitur signature)

- Layout radial per kuadran, tanpa dagre; Lucide icons + animasi CSS per ikon
- 3 level hierarki: center pulse glow, branch solid border, leaf solid border
- 6 file komponen di `src/components/mindmap/` + `src/lib/mindmap-{template,renderer}.ts`
- **Jangan ganti pendekatannya**

## Dokumentasi

| Folder | Isi |
|---|---|
| `ai-rules/` | Template immutable |
| `dev-docs/ai/` | Kondisi terkini (canonical) |
| `dev-docs/architecture/`, `dev-docs/modules/` | Arsitektur & modul |
| `docs/` | Audit, design, plan (historis) |
| `docs-ai/` | Catatan fitur Juli–Agustus 2026 (historis, sebagian usang) |
| `prod-docs/` | Operasional server |
| `backup/old-docs/`, `docs/rules/` | Arsip |
