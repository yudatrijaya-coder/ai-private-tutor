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
| `exam-scheduler-sweep` | every 30m | `POST /api/cron/exam-scheduler` | ok |
| `guardian-report-weekly` | `0 18 * * 0` | `POST /api/cron/guardian-report` | ok |
| `motivation-nudge-monday` | `0 17 * * 1` | `POST /api/cron/motivation-nudge` | ok |
| `motivation-nudge-friday` | `0 17 * * 5` | `POST /api/cron/motivation-nudge` | ok |
| `guardian-monthly` | `0 17 1 * *` | `POST /api/cron/guardian-monthly` | **error** (lihat Known Issues) |
| `guruai-webhook-sentinel` | `*/10 * * * *` | sistem lain | ok |

Cek: `hermes cron list`.

## Known Issues

| # | Isu | Dampak | Perbaikan |
|---|-----|--------|-----------|
| 1 | `guardian-monthly-trigger.sh` mewajibkan argumen (`TYPE="$1"`, exit 1 kalau kosong), job Hermes tidak pernah memberikannya | Laporan bulanan ke orang tua tidak pernah terkirim | Hapus blok `$1` wajib, atau isi `args` di definisi job |
| 2 | `/api/reminders/check` (reminder personal dari tabel `Reminder`) tidak terdaftar di Hermes | `Reminder` tidak pernah diproses; jadwal belajar tetap aman karena ditangani `schedule-sweep` | Daftarkan job baru atau lebur ke `schedule-sweep` |
| 3 | ~~`scripts/schedule-sweep.sh` memuat `CRON_SECRET` produksi plaintext~~ — **diperbaiki 2026-10-25**: secret dirotasi (48 hex), script membaca dari `.env`, token lama kini 401. Sisa: token lama masih ada di riwayat git (`10e47a6`, `0b3131a`, `845b1f6`) | Setelah rotasi tidak lagi berbahaya; history hanya relevan bila ada yang memanen token mati | Opsional: bersihkan history (`git filter-repo`) bila repo tetap publik |
| 4 | `prisma.config.ts` dan `src/lib/prisma.ts` memuat fallback password DB `tutor123`; ~10 script juga | Kredensial DB ikut ter-commit | Pindahkan ke env, hapus fallback |
| 5 | 2 commit lokal belum di-push (`0207add`, `51a29c5`) | Build VPS lebih baru dari `origin/master` | `git push origin master` |
| 6 | `docs-ai/*.md` dan `docs/rules/*` mendokumentasikan state Juli–Agustus 2026 | Menyesatkan kalau dibaca sebagai kondisi sekarang | Arsipkan / jadikan historis (lihat `dev-docs/DOCS-INDEX.md`) |
| 7 | `docs-site/` (Nextra) tidak berjalan — port 3002 tidak listen, `docs.senangbelajar.web.id` tidak resolve | Dokumentasi web mati | Jalankan sebagai PM2 app atau hapus folder |
| 8 | `logs/err.log` masih mencatat error NextAuth `UnknownAction` dan RSC scanner spam | Noise, bukan kegagalan fungsional (sudah dimitigasi middleware) | Pantau; abaikan kalau tidak bertambah |
| 9 | Disk 42/59 GB (75%); `public/` 2,2 GB | Sisa ruang menipis untuk build | Bersihkan aset tak terpakai |

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
| 2026-07-31 | Versi sebelumnya (tidak akurat lagi: menyebut 7 agent padahal 6 worker + tutor inline, branch `main`, dan angka material lama) |
