# AI Private Tutor

Platform belajar berbasis AI untuk siswa SD, SMP, dan SMA. Interface utama adalah **bot Telegram** dengan persona sesuai jenjang; web dashboard melayani siswa, orang tua, dan admin.

Dokumen ini ditulis ulang dari **kode yang benar-benar ter-deploy** di VPS (commit `0207add`, build `.next` 2026-10-21 21:27 +08). Kalau kode berubah, ubah dokumen ini juga.

---

## Stack (versi terpasang di VPS)

| Layer | Teknologi | Versi |
|---|---|---|
| Framework | Next.js App Router (monolith) | 16.3.0 |
| UI | React + Tailwind CSS + React Flow (`@xyflow/react`) + Lucide | 19.2.4 / 4.3.2 / 12.11.2 / 1.24.0 |
| ORM | Prisma + `@prisma/adapter-pg` | 7.9.1 |
| DB | PostgreSQL (prod) / SQLite `prisma/dev.db` (dev) | 16 |
| Bot | Telegraf (webhook mode) | 4.16.3 |
| LLM | OpenAI SDK → 9Router lokal | 6.45.0 |
| Queue | BullMQ + Redis, fallback in-memory | 5.79.2 |
| Runtime | Node.js | 22.23.1 |

## Arsitektur Singkat

```
Telegram ──webhook──▶ Caddy :443 ──▶ Next.js :3000 ──▶ PostgreSQL :5432
Browser  ──────────▶                 │
                                     ├──▶ 9Router :20128 ──▶ model upstream
                                     └──▶ Redis :6379 (BullMQ, opsional)
```

- **Bot**: `POST /api/bot/webhook` membangun `Context` Telegraf manual lalu memanggil `onMessage()` di `src/bot/handlers/message.ts`. Karena webhook mode, middleware `bot.command()` Telegraf **tidak pernah jalan** — semua slash command dirutekan eksplisit di `message.ts` + `routeCommand()` (`src/bot/commands.ts`).
- **Tutor LLM**: `src/bot/agent/tutor.ts` → `src/llm/client.ts`. Model utama `ai_tutor_agent` (9Router combo), fallback `hermes`. Tanpa `LLM_API_KEY` client **gagal keras** (tidak ada fallback key hardcode).
- **Agents** (`src/agents/`): 6 worker queue — `curriculum`, `content`, `assessment`, `media`, `guardian`, `scheduler` — didaftarkan saat startup lewat `src/instrumentation.ts`.
- **Auth**: admin/parent via NextAuth; siswa via cookie JWT `student_session` (dicek di `src/middleware.ts`).

## Perintah Bot (yang terdaftar di menu "/")

Didefinisikan di `COMMAND_MENU` (`src/bot/commands.ts`), 15 entri:

| Perintah | Fungsi |
|---|---|
| `/start` | Mulai / daftar ulang |
| `/quiz` | Kerjakan kuis |
| `/drill` | Latihan topik lemah |
| `/speedmath` | Latihan hitung cepat |
| `/review` | Ulangi soal yang pernah salah |
| `/materi` | Lihat materi pelajaran |
| `/weeklyexam` | Weekly exam & jadwal |
| `/jadwal` | Jadwal belajar |
| `/jadwal_sekolah` | Jadwal sekolah asli |
| `/pr` | Catat / lihat PR |
| `/badge` | XP, streak & badge |
| `/nilai` | Nilai & progres |
| `/prosem` | Prosem & status minggu ini |
| `/web` | Buka dashboard |
| `/help` | Bantuan |

Di luar menu (tetap berfungsi karena dirutekan di `message.ts`):

| Perintah | Fungsi |
|---|---|
| `/daftar <ID>` | Hubungkan Telegram ke akun siswa |
| `/parent_daftar <ID>` | Hubungkan orang tua |
| `/perpanjang`, `/extend` | Ajukan perpanjangan langganan |
| `/speedmath_stop` | Keluar dari drill |
| `/progres`, `/laporan`, `/peringatan` | Khusus orang tua |
| alias `kuis`, `hitungcepat`, `ulang`, `badges`, `tugas` | — |

Selain slash command, bot punya intent detection deterministik (mis. "kasih quiz tentang fotosintesis" langsung memulai kuis) sebelum jatuh ke LLM.

## Cron yang Benar-benar Berjalan

Dijadwalkan oleh **Hermes cron** (bukan crontab OS — `crontab -l` kosong), script di `~/.hermes/profiles/opencode/scripts/`:

| Job | Jadwal | Endpoint | Status |
|---|---|---|---|
| `schedule-reminder-sweep` | every 3m | `GET /api/cron/schedule-sweep` | ok |
| `exam-scheduler-sweep` | every 30m | `POST /api/cron/exam-scheduler` | ok |
| `guardian-report-weekly` | `0 18 * * 0` | `POST /api/cron/guardian-report` | ok |
| `motivation-nudge-monday` | `0 17 * * 1` | `POST /api/cron/motivation-nudge` | ok |
| `motivation-nudge-friday` | `0 17 * * 5` | `POST /api/cron/motivation-nudge` | ok |
| `guardian-monthly` | `0 17 1 * *` | `POST /api/cron/guardian-monthly` | ok |
| `reminders-check` | every 1m | `GET /api/reminders/check` | ok |
| `daily-nudge` | `0 8 * * *` | `GET /api/cron/daily-nudge` | ok |
| `progress-snap-weekly` | `0 23 * * 0` | `GET /api/cron/progress-snap` | ok |
| `guruai-webhook-sentinel` | `*/10 * * * *` | (sistem lain) | ok |

Kesepuluh job di atas aktif. `/api/reminders/check` berada di luar prefix `cron/` dan memakai auth `Authorization: Bearer` (bukan `checkCronSecret()`).

Semua route cron memakai `checkCronSecret()` (`src/lib/cron/guard.ts`) — **fail-closed**: `CRON_SECRET` kosong berarti semua pemanggil ditolak (503), bukan diloloskan.

## Environment

Salin `.env.example` → `.env`. Yang wajib di produksi:

| Variabel | Catatan |
|---|---|
| `DATABASE_URL` | `postgresql://tutor:***@localhost:5432/ai_private_tutor` |
| `PGPASSWORD` | Dipakai `src/lib/prisma.ts` (pool `pg`), bukan hanya Prisma |
| `TELEGRAM_BOT_TOKEN` | Token BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Diverifikasi dari header `x-telegram-bot-api-secret-token` |
| `BOT_WEBHOOK_URL` | `https://senangbelajar.web.id` |
| `CRON_SECRET` | Tanpa quote; dipakai semua endpoint cron |
| `LLM_API_KEY` | **Wajib** — client gagal keras kalau kosong |
| `LLM_BASE_URL` | Default `http://localhost:20128/v1` |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST` | NextAuth |
| `STUDENT_JWT_SECRET` | Cookie siswa |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` | Login admin (bcrypt, escape `$` sebagai `\$`) |

Opsional: `SUMOPOD_API_KEY`, `TAVILY_API_KEY`, `YOUTUBE_API_KEY`, `SIBI_EMAIL`/`SIBI_PASSWORD`, `REDIS_URL`, `MOTIVATION_VIDEO_*`, `APP_URL`, `NEXT_PUBLIC_APP_URL`, `LLM_ALLOW_NO_KEY`.

## Development

```bash
npm install
npm run dev      # port 3001, SQLite (prisma/dev.db)
npm run lint
npx tsc --noEmit
```

Build produksi **selalu lewat `ops/build.sh`**, bukan `npm run build` langsung: VPS ini 3,6 GiB RAM dan `next build` pernah OOM-killed. Script itu mengaktifkan `/swap-build.img` dan menetapkan `NODE_OPTIONS=--max-old-space-size=2048`.

```bash
bash ops/build.sh
pm2 restart ai-private-tutor
```

## Branch & Deploy

- Repo: `github.com/yudatrijaya-coder/ai-private-tutor`, branch default **`master`**.
- Dokumen lama yang menyebut `main` sudah tidak berlaku.
- Deploy: `git pull origin master` → `bash ops/build.sh` → `pm2 restart ai-private-tutor`.

## Data (snapshot 2026-10-25, DB produksi)

| Tabel | Baris |
|---|---:|
| `Student` | 4 (Syifa SD_5 · Raihan SMP_1 · BAHLIL SMP_1 · SHOFI SMA_2) |
| `Curriculum` | 5 (Raihan punya v1 dan v3 — yang berlaku = `version` tertinggi) |
| `Material` | 1.296 |
| `Quiz` | 1.315 |
| `Exam` / `ExamQuestion` | 35 / 679 |
| `Attempt` | 416 |
| `ChatLog` | 1.128 |
| `ScheduleSession` | 273 |
| `StudentActivity` | 3.597 |
| `ApiUsage` | 1.475 |

`isTemplate=true`: Syifa (SD_5), Raihan (SMP_1), SHOFI (SMA_2). Student baru menyalin kurikulum dari template sejenjang, bukan generate ulang.

## Struktur Proyek

```
src/
├── app/            # App Router: halaman + 73 API route
├── bot/            # Telegraf: handlers, agent/tutor, personas, safety, commands
├── agents/         # 6 worker queue (curriculum, content, assessment, media, guardian, scheduler)
├── llm/            # client 9Router, prompt, types
├── lib/            # prisma, auth, cron guard, gamification, spaced-repetition, prosem
├── queue/          # BullMQ + fallback in-memory
├── data/           # bank quiz & topik kurikulum statis (sumber, bukan runtime DB)
├── components/     # UI + mindmap
└── instrumentation.ts  # registrasi worker saat startup
prisma/             # schema, 1 migrasi baseline, dev.db
ops/                # build.sh, Caddyfile, ecosystem.config.cjs, cron script
dev-docs/           # dokumentasi arsitektur & modul (canonical)
docs/               # audit, design, plan (historis)
docs-ai/            # catatan fitur (historis, sebagian usang)
```

## Dokumentasi

Mulai dari [`dev-docs/ai/START_HERE.md`](dev-docs/ai/START_HERE.md). Status tiap folder dokumentasi ada di [`dev-docs/DOCS-INDEX.md`](dev-docs/DOCS-INDEX.md).

## Live

- App: [senangbelajar.web.id](https://senangbelajar.web.id)
- Bot: [@senangbelajar_bot](https://t.me/senangbelajar_bot)
- 9Router dashboard: `9router.senangbelajar.web.id`

## Known Issues

| Item | Dampak |
|---|---|
| `CRON_SECRET` lama | Sudah dirotasi **dan** dihapus dari seluruh riwayat git 2026-10-25 (`git filter-repo`). Hash commit lama berubah — clone lama perlu di-fetch ulang |
| `logs/err.log` noise | Sisa error NextAuth `UnknownAction` dan RSC scanner; dimitigasi middleware, bukan kegagalan fungsional |
| Disk 73% | `public/` 2,2 GB; `docs-site/` (834 MB) sudah dihapus 2026-10-25 |

## Catatan: PM2 Menyimpan Snapshot Env

`pm2 restart --update-env` tidak mengambil ulang `.env` bila variabel sudah ada di
environment PM2 — nilai lama menang. Setelah mengubah `.env`, lakukan:

```bash
export CRON_SECRET="$(sed -n 's/^CRON_SECRET=//p' .env | head -1 | tr -d '\"')"
pm2 restart ai-private-tutor --update-env
pm2 save
pm2 env 1 | grep CRON_SECRET     # verifikasi nilai yang benar-benar dipakai
```

