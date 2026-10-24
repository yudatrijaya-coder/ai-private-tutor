# Handoff — AI Private Tutor

> **Dokumen ini bukan lagi sumber kondisi terkini.**
> Kondisi aktual ada di [`dev-docs/ai/CURRENT_STATE.md`](dev-docs/ai/CURRENT_STATE.md).
> Ditulis ulang 2026-10-25 terhadap commit `0207add`.

---

## Kondisi Runtime (2026-10-25)

| Item | Nilai |
|---|---|
| Commit ter-build | `0207add` (`.next` dibangun 2026-10-21 21:27 +08) |
| Commit di `origin/master` | `acf99ba` — **2 commit lokal belum di-push** (`0207add`, `51a29c5`) |
| PM2 `ai-private-tutor` | online, uptime 8h, 6× restart |
| Health | `localhost:3000` → 200, `https://senangbelajar.web.id` → 200 |
| Bot webhook | aktif, `pending_update_count: 0` |
| DB | PostgreSQL 16, 4 student, 1.296 material, 1.315 quiz |
| Disk | 42/59 GB (75%) |

## Yang Perlu Dikerjakan Dulu

1. **Push 2 commit lokal** — build produksi lebih baru daripada `origin/master`.
2. **Cron `guardian-monthly` selalu error** — `guardian-monthly-trigger.sh` mewajibkan argumen yang tidak pernah dikirim job.
3. **`/api/reminders/check` tidak terjadwal** — reminder personal tidak diproses.
4. **`scripts/schedule-sweep.sh` di repo memuat `CRON_SECRET` produksi secara plaintext** — rotate secret dan hapus dari repo.
5. **Password DB `tutor123` hardcoded** di `prisma.config.ts`, `src/lib/prisma.ts`, dan ~10 script.

Detail lengkap + dampak: `dev-docs/ai/CURRENT_STATE.md` bagian *Known Issues*.

## Model Template ↔ Student

Setiap jenjang punya 1 template (`isTemplate=true`). Student baru **menyalin** kurikulum template sejenjang, tidak generate ulang.

| Grade | Template | Student lain |
|---|---|---|
| SD_5 | Syifa (130 material) | — |
| SMP_1 | Raihan (v3: 239 material) | BAHLIL (copy v3) |
| SMA_2 | SHOFI (424 material) | — |

Pipeline SIBI (`scripts/sibi-match-and-generate.py`, `scripts/video_pipeline.py`) hanya untuk student template; student lain menyalin lewat `UPDATE ... FROM`.

## Deploy

```bash
cd ~/ai-private-tutor
git pull origin master
bash ops/build.sh
pm2 restart ai-private-tutor
```

Detail operasional: `dev-docs/ai/FINAL_SYSTEM_HANDOVER.md`.

---

## Arsip: State 31 Juli 2026

Versi sebelumnya dokumen ini menyatakan "all gaps resolved" dengan 130/482/402 material dan 1.180 quiz. Angka itu sudah tidak berlaku: bank materi dan quiz bertambah lewat beberapa pass setelahnya (lihat `git log --oneline` untuk commit `bda4584`, `bdd74db`, `2496cd8`, `e138e97`). Angka terkini selalu diambil dari DB, bukan dari dokumen.
