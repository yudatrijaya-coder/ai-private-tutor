# CURRENT_STATE

> **Status:** DATA FILE — perbarui setiap akhir task/batch.
> **Snapshot:** 2026-10-25 06:55 +07, commit `0207add`, PM2 uptime 8h.

---

## Feature Maturity

| Fitur | Status | Bukti |
|-------|--------|-------|
| Bot Telegram (webhook) | ✅ Production | webhook aktif, `pending_update_count: 0` |
| Tutor LLM (3 persona) | ✅ Production | `ai_tutor_agent` + `hermes`, `ApiUsage` 1.475 baris |
| Quiz + grading | ✅ Production | 1.315 `Quiz`, 416 `Attempt` |
| Drill & speedmath | ✅ Production | `handlers/quiz.ts`, `handlers/speedmath.ts` |
| Spaced repetition (SM-2) | ✅ Production | `ReviewQueue` 26 item |
| Exam generator | ✅ Production | 35 `Exam`, 679 `ExamQuestion` |
| Kurikulum + prosem | ✅ Production | 5 `Curriculum`, 1.296 `Material` |
| Mindmap radial | ✅ Production | `src/components/mindmap/` |
| Slides & video | ✅ Production | `/api/media/render`, `/api/media/tts` |
| Gamifikasi | ✅ Production | 14 `Badge`, XP/streak di `Student` |
| Jadwal belajar + reminder H-1/T-30 | ✅ Production | `ScheduleSession` 273, job Hermes `ok` |
| Guard: auth, CSP, cron fail-closed | ✅ Production | `middleware.ts`, `next.config.ts`, `lib/cron/guard.ts` |
| WhatsApp Bot | ❌ Tidak ada di kode | Tidak ada handler WhatsApp di `src/` — hapus dari roadmap sampai diimplementasikan |

## Kondisi Data (2026-10-25)

| Student | Grade | Template | Material | Quiz |
|---|---|:---:|---:|---:|
| Syifa | SD_5 | ✅ | 130 | 148 |
| Raihan | SMP_1 | ✅ | 264 (v1) + 239 (v3) | 503 |
| BAHLIL | SMP_1 | — | 239 (v3) | 239 |
| SHOFI | SMA_2 | ✅ | 424 | 425 |

Raihan memegang dua `Curriculum` (v1 dan v3). Yang berlaku v3 — semua pembacaan harus lewat `ACTIVE_CURRICULUM_ORDER`.

## Cron

| Job (Hermes) | Jadwal | Endpoint | Status terakhir |
|---|---|---|---|
| `schedule-reminder-sweep` | every 3m | `GET /api/cron/schedule-sweep` | ok |
| `reminders-check` | every 1m | `GET /api/reminders/check` | ok (ditambahkan 2026-10-25) |
| `exam-scheduler-sweep` | every 30m | `POST /api/cron/exam-scheduler` | ok |
| `guardian-report-weekly` | `0 18 * * 0` | `POST /api/cron/guardian-report` | ok |
| `motivation-nudge-monday` | `0 17 * * 1` | `POST /api/cron/motivation-nudge` | ok |
| `motivation-nudge-friday` | `0 17 * * 5` | `POST /api/cron/motivation-nudge` | ok |
| `guardian-monthly` | `0 17 1 * *` | `POST /api/cron/guardian-monthly` | ok (diperbaiki 2026-10-25) |
| `daily-nudge` | `0 8 * * *` | `GET /api/cron/daily-nudge` | ok (ditambahkan 2026-10-25) |
| `progress-snap-weekly` | `0 23 * * 0` | `GET /api/cron/progress-snap` | ok (ditambahkan 2026-10-25) |
| `guruai-webhook-sentinel` | `*/10 * * * *` | sistem lain | ok |

Cek: `hermes cron list`.

## Known Issues

| # | Isu | Dampak | Perbaikan |
|---|-----|--------|-----------|
| 1 | ~~`guardian-monthly-trigger.sh` mewajibkan argumen~~ **DIPERBAIKI 2026-10-25** — argumen kini opsional (label), gagal hanya bila `CRON_SECRET` kosong | — | — |
| 2 | ~~`/api/reminders/check` tidak terjadwal~~ **DIPERBAIKI 2026-10-25** — job Hermes `reminders-check` tiap 1 menit, script `reminders-check-trigger.sh` (auth `Bearer`) | — | — |
| 3 | ~~`remindAt` window memakai `gte: now`~~ **DIPERBAIKI 2026-10-25** — reminder yang jatuh di antara tick tidak pernah diambil; sekarang ada grace window 24 jam ke belakang di `processPendingReminders()` | — | — |
| 4 | ~~`scripts/schedule-sweep.sh` memuat `CRON_SECRET` plaintext~~ **DIPERBAIKI 2026-10-25** — secret dirotasi (48 hex), script membaca `.env`, dan token lama **dihapus dari seluruh riwayat git** (`git filter-repo`, 308 commit ditulis ulang). Clone lama berhash beda | — | — |
| 5 | ~~Fallback password DB `tutor123`~~ **DIPERBAIKI 2026-10-25** — `prisma.config.ts`, `src/lib/prisma.ts`, `prisma/seed-characters.ts`, dan 68 script kini membaca `PGPASSWORD` dan gagal keras bila kosong | — | Sisa satu-satunya kemunculan: daftar kandidat di `scripts/check_admin_pass.ts` (disengaja) |
| 6 | ~~`DATABASE_URL` di `.env` berisi placeholder `***`~~ **DIPERBAIKI 2026-10-25** — nilainya salah sejak lama; Prisma CLI gagal auth. Kini diisi dari `PGPASSWORD`, dan `prisma.config.ts` menolak placeholder | — | — |
| 7 | ~~`docs-site/` (Nextra) mati~~ **DIHAPUS 2026-10-25** — 834 MB, gitignored, isinya usang. Konten diarsipkan di `backup/docs-site-content-20261025/` | — | Dokumentasi resmi: `dev-docs/` + halaman `/docs` |
| 8 | `logs/err.log` masih mencatat error NextAuth `UnknownAction` dan RSC scanner spam | Noise, bukan kegagalan fungsional (dimitigasi middleware) | Pantau; abaikan kalau tidak bertambah |
| 9 | Disk 42/59 GB (73%); `public/` 2,2 GB, termasuk PDF 65 MB yang memicu peringatan GitHub | Sisa ruang menipis untuk build | Bersihkan aset tak terpakai / pindahkan ke storage eksternal |

## Catatan Operasional: PM2 Menyimpan Snapshot Env

`pm2 restart --update-env` **tidak** mengambil ulang isi `.env` bila variabel itu sudah ada
di environment PM2 — nilai lama menang dan menimpa `.env`. Gejalanya: mengubah
`CRON_SECRET` di `.env`, restart, tetapi endpoint tetap 401.

```bash
pm2 env 1 | grep CRON_SECRET          # nilai yang benar-benar dipakai proses
export CRON_SECRET="$(sed -n 's/^CRON_SECRET=//p' .env | head -1 | tr -d '"')"
pm2 restart ai-private-tutor --update-env
pm2 save                              # agar bertahan saat reboot
```

Variabel yang di-snapshot PM2 saat ini: `CRON_SECRET`, `DATABASE_URL`, `LLM_API_KEY`,
`NEXTAUTH_SECRET`, `PGPASSWORD`, `STUDENT_JWT_SECRET`, `SUMOPOD_API_KEY`,
`TELEGRAM_BOT_TOKEN`, `BOT_WEBHOOK_URL`, `NODE_ENV`, `PORT`.

## Riwayat Perubahan Dokumen

| Tanggal | Perubahan |
|---|---|
| 2026-10-25 | Seluruh `README.md` + `dev-docs/ai/*` ditulis ulang dari kode ter-deploy: branch `master`, cron Hermes, 15 bot command, 73 API route, versi paket aktual, data DB aktual. Known issues diisi dari temuan runtime. |
| 2026-10-25 (lanjutan 2) | Job `daily-nudge` (08:00) & `progress-snap-weekly` (Minggu 23:00) didaftarkan; `progress-snap` dibuat idempoten per `CronClaim` mingguan; riwayat git dibersihkan dengan `git filter-repo`. |
| 2026-10-25 (lanjutan) | Tuntas 5 issue: job `reminders-check` tiap 1 menit, grace window `remindAt`, `guardian-monthly` diperbaiki, fallback password DB dihapus (70 file), `DATABASE_URL` placeholder diperbaiki, `docs-site/` dihapus (-834 MB). |
| 2026-07-31 | Versi sebelumnya (tidak akurat lagi: menyebut 7 agent padahal 6 worker + tutor inline, branch `main`, dan angka material lama) |
