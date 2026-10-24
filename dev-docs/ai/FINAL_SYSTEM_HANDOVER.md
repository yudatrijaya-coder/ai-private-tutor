# FINAL_SYSTEM_HANDOVER

> **Status:** Referensi operasional. Ditulis ulang dari kode & runtime ter-deploy.
> **Verifikasi:** 2026-10-25, commit `0207add`.

---

## System Overview

Monolith Next.js 16 untuk siswa SD_5, SMP_1, SMA_2. Bot Telegram sebagai kanal utama (3 persona), web untuk siswa/admin/orang tua. 6 worker queue (`curriculum`, `content`, `assessment`, `media`, `guardian`, `scheduler`) plus tutor LLM yang jalan inline di dalam request webhook (bukan worker).

## Akses & Kredensial

| Resource | Value |
|----------|-------|
| VPS | `ssh ubuntu@43.133.151.242` |
| PM2 apps | `ai-private-tutor` (:3000), `9router` (:20128) |
| Domain | `senangbelajar.web.id` |
| Bot | `@senangbelajar_bot` |
| LLM Gateway | `http://localhost:20128/v1`, combo `ai_tutor_agent` |
| DB | PostgreSQL 16, `localhost:5432`, db `ai_private_tutor`, user `tutor` |
| Redis | `localhost:6379` |
| Caddy | `/etc/caddy/Caddyfile` (aktif), `ops/Caddyfile` (salinan repo) |
| Cron | Hermes: `~/.hermes/profiles/opencode/scripts/` |

## Deploy

```bash
cd ~/ai-private-tutor
git pull origin master          # branch default = master
bash ops/build.sh               # WAJIB — mengaktifkan swap + heap cap 2 GB
pm2 restart ai-private-tutor
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/
```

Jangan pakai `npm run build` langsung: VPS 3,6 GiB RAM, `next build` polos pernah OOM-killed.

Rollback:

```bash
git log --oneline -5
git reset --hard <hash>
bash ops/build.sh
pm2 restart ai-private-tutor
```

## Bot: Cara Kerja

`POST /api/bot/webhook` → verifikasi header `x-telegram-bot-api-secret-token` → dedupe `update_id` (TTL 1 jam) → `onMessage()`.

Urutan routing di `src/bot/handlers/message.ts`:

1. Deep-link `/start trial`
2. `/daftar`, `/parent_daftar`
3. Command orang tua (`/progres`, `/laporan`, `/peringatan`)
4. Student terdaftar:
   - `/extend` / `/perpanjang`
   - `routeByState()` (state machine — kuis yang sedang berjalan)
   - `/quiz`, `/drill`, `/speedmath`, `/speedmath_stop`, `/start`, `/help`, `/web`, `/weeklyexam`
   - `routeCommand()` → `/badge`, `/review`, `/nilai`, `/prosem`, `/pr`
   - Intent quiz deterministik (`isQuizRequest`)
   - Fallback:  `handleMessage()` → LLM, lalu tag intent di respons (`[QUIZ]`, `[SCHEDULE]`, `[SCHOOL_SCHEDULE]`, `[MATERIALS]`, `[YOUTUBE:id]`, `[VIDEOS:…]`, `[DASHBOARD]`, `[REMINDER]`, `[HOMEWORK]`, `[PASSWORD]`, `[EXTENSION:REQUEST]`)
5. Belum terdaftar → instruksi `/daftar`

Karena webhook mode, `bot.command(...)` Telegraf tidak pernah dieksekusi. Command baru = tambah cabang di `message.ts` / `routeCommand()` **dan** entri di `COMMAND_MENU`.

## Cron

Dijadwalkan **Hermes cron**, bukan crontab OS (`crontab -l` kosong). Lihat tabel lengkap di `CURRENT_STATE.md`.

Semua endpoint cron memakai `checkCronSecret()` (`src/lib/cron/guard.ts`):

- Secret dibaca dari header `x-cron-secret` atau query `?token=`.
- `CRON_SECRET` tidak diset → **503** (fail-closed), bukan diloloskan.
- Setiap run dicatat ke `AgentLog`.

Pengecualian: `/api/reminders/check` memakai `Authorization: Bearer $CRON_SECRET` langsung,
tanpa `checkCronSecret()`. Endpoint ini dijalankan job Hermes `reminders-check` tiap 1 menit
(script `reminders-check-trigger.sh`).

`processPendingReminders()` mengambil reminder dengan `remindAt` dalam jendela
**24 jam ke belakang sampai 60 detik ke depan**. Batas ke belakang penting: jendela
`gte: now` yang lama melewatkan setiap reminder yang jatuh di antara dua tick.

## Auth

| Permukaan | Mekanisme |
|---|---|
| Admin/parent | NextAuth v5 (`/api/auth/[...nextauth]`), kredensial dari `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` (bcrypt) |
| Siswa | Cookie `student_session` (JWT via `STUDENT_JWT_SECRET`), diverifikasi di `src/middleware.ts` beserta cek status ACTIVE/TRIAL |
| Webhook bot | Header `x-telegram-bot-api-secret-token` |
| Cron | `checkCronSecret()` |
| API admin | Session admin + `isAdmin(scope)` (`src/lib/auth/scope.ts`) |

Middleware juga membuang request dengan header `next-action` yang bukan digest heksadesimal 32–64 karakter (anti RSC scanner).

## LLM

- `ai_tutor_agent` (9Router combo) → fallback `hermes`.
- `DAILY_TOKEN_CAP` 1.000.000 token/siswa/hari, tercatat di `ApiUsage`.
- `LLM_API_KEY` kosong = error keras. Set `LLM_ALLOW_NO_KEY=1` hanya untuk endpoint lokal tanpa auth.
- Pricing per model ada di `MODEL_PRICING` (`src/llm/client.ts`).

## Environment Variables

Lihat `README.md` bagian *Environment* dan `.env.example`. Yang mudah terlewat:

- `PGPASSWORD` wajib — `src/lib/prisma.ts` memakai pool `pg`, tidak membaca `DATABASE_URL`.
- `CRON_SECRET` jangan diberi quote (quote ikut jadi bagian token).
- `ADMIN_PASSWORD_HASH` harus meng-escape `$` sebagai `\$` (dotenv melakukan ekspansi variabel).
- `STUDENT_JWT_SECRET` wajib untuk login siswa.

**PM2 menyimpan snapshot env.** `pm2 restart --update-env` tidak mengambil ulang `.env`
bila variabel sudah ada di environment PM2 — nilai lama menang. Setelah mengubah `.env`:

```bash
export CRON_SECRET="$(sed -n 's/^CRON_SECRET=//p' .env | head -1 | tr -d '"')"
pm2 restart ai-private-tutor --update-env
pm2 save
pm2 env 1 | grep CRON_SECRET
```

Secret cron sudah dirotasi 2026-10-25; token lama ditolak (401). Nilai lama masih ada di
riwayat git dan tidak berbahaya selama repo publik ini tidak memakai token itu lagi.

## Backup & Pemulihan

- DB: `ops/backup-db.sh`
- Ada backup SQLite 9Router di home: `9router-db-backup-*.sqlite`
- `backups/` dan `backup/` di repo gitignored karena memuat data siswa nyata.

## Pitfalls

1. **Jangan baca semua `Curriculum` milik satu student.** Raihan punya v1 dan v3; pakai `ACTIVE_CURRICULUM_ORDER`.
2. **Jangan kembalikan default `CRON_SECRET || "…"`.** Itu regresi keamanan yang sudah diperbaiki (ledger A-14).
3. **Jangan ganti pendekatan layout mindmap** — radial, tanpa dagre.
4. **Data di `src/data/quiz-bank-*.ts` adalah sumber generate**, bukan bank runtime. Runtime membaca `Quiz` di DB.
5. **`src/generated/` gitignored** — jalankan `npx prisma generate` setelah clone.
6. **Jangan taruh secret di script yang di-commit.** `scripts/schedule-sweep.sh` dulu memuat
   `CRON_SECRET` produksi; sekarang membaca `$ENV_FILE` (default `/home/ubuntu/ai-private-tutor/.env`).
