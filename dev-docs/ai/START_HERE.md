# START_HERE

> **Status:** Titik masuk untuk manusia maupun AI agent. Ditulis dari kode yang ter-deploy.
> **Terakhir verifikasi:** 2026-10-25 terhadap commit `0207add` (build `.next` 2026-10-21 21:27 +08).

---

## Quick Facts

| Item | Value |
|------|-------|
| Repository | `yudatrijaya-coder/ai-private-tutor` (public) |
| Branch default | **`master`** (bukan `main`) |
| Project Type | Monolith — Next.js 16 App Router |
| Stack | Next.js 16.3.0 · React 19.2.4 · Tailwind 4.3.2 · Prisma 7.9.1 · Telegraf 4.16.3 · Node 22 |
| DB | PostgreSQL 16 `ai_private_tutor` (prod) / SQLite `prisma/dev.db` (dev) |
| LLM | 9Router `http://localhost:20128/v1`, combo `ai_tutor_agent`, fallback `hermes` |
| Bot | `@senangbelajar_bot`, webhook `https://senangbelajar.web.id/api/bot/webhook` |
| Server | VPS Tencent Cloud, Jakarta — `ubuntu@43.133.151.242` |
| Domain | `senangbelajar.web.id` |
| Process | PM2 `ai-private-tutor` (:3000) + `9router` (:20128), Caddy :80/:443 |
| Cron | **Hermes cron** (`~/.hermes/profiles/opencode/scripts/`), bukan crontab OS |

## Urutan Membaca

1. `PROJECT_CONTEXT.md` — stack, topologi, struktur sumber
2. `MODULE_MAP.md` — modul bisnis → file kode
3. `../architecture/api-flow.md` — alur request
4. `../architecture/backend-structure.md`
5. `../architecture/database.md`
6. `../architecture/frontend-structure.md`
7. `CURRENT_STATE.md` — kondisi terkini + known issue
8. `FINAL_SYSTEM_HANDOVER.md` — ringkasan operasional

## Tiga Aturan yang Paling Sering Dilanggar

1. **Branch `master`**, bukan `main`. Semua dokumen yang menyebut `main` sudah usang.
2. **Build lewat `bash ops/build.sh`**, jangan `npm run build`. VPS 3,6 GiB RAM; `next build` polos pernah OOM-killed (lihat header `ops/build.sh`).
3. **Slash command bot dirutekan manual.** Webhook mode membuat middleware `bot.command()` Telegraf tidak pernah dieksekusi — tambah command berarti menambah cabang di `src/bot/handlers/message.ts` dan/atau `routeCommand()` di `src/bot/commands.ts`, lalu daftarkan di `COMMAND_MENU`.

## Jangan Diubah Tanpa Alasan Kuat

- **Layout radial mindmap** — fitur signature, jangan diganti pendekatan lain.
- **`ai-rules/`** — template immutable.
- **`checkCronSecret()`** — fail-closed dengan sengaja; jangan kembalikan pola `CRON_SECRET || "default"`.
- **`ACTIVE_CURRICULUM_ORDER`** (`src/lib/curriculum-active.ts`) — satu student bisa punya beberapa `Curriculum`; yang berlaku hanya `version` tertinggi.

## Prioritas Kerja Saat Ini

Lihat `CURRENT_STATE.md` bagian *Known Issues*. Yang paling mendesak: cron `guardian-monthly` selalu gagal, endpoint `/api/reminders/check` tidak terjadwal, dan 2 commit lokal belum di-push.
