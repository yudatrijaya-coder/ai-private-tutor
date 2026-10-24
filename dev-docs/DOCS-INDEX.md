# DOCS-INDEX — Status Dokumentasi

> **Tujuan:** satu tempat untuk tahu dokumen mana yang boleh dipercaya, mana yang historis.
> **Terakhir disusun:** 2026-10-25 (audit docs terhadap commit `0207add`).

## Aturan Singkat

| Kalau kamu butuh… | Baca ini |
|---|---|
| Kondisi sistem **sekarang** | `ai/CURRENT_STATE.md`, `ai/PROJECT_CONTEXT.md` |
| Cara kerja kode | `ai/MODULE_MAP.md`, `architecture/`, `modules/` |
| Cara deploy/operasi | `../prod-docs/`, `../README.md` |
| Kenapa sesuatu diputuskan begitu | `../docs/audits/`, `../docs/designs/` (historis) |
| Konteks untuk AI agent baru | `ai/START_HERE.md`, `../MEMORY.md` |

**Aturan:** angka (jumlah materi, quiz, student) **wajib** diambil dari DB, bukan dari dokumen.
Dokumen hanya boleh memuat snapshot dengan tanggal.

## Status per Lokasi

| Lokasi | Status | Catatan |
|---|---|---|
| `dev-docs/ai/` | ✅ **Canonical** | Ditulis ulang 2026-10-25 dari kode ter-deploy |
| `dev-docs/architecture/` | ✅ Aktif | 4 file; `api-flow.md` sudah dikoreksi 2026-10-25 |
| `dev-docs/modules/` | ✅ **Canonical** | 12 file; seluruhnya ditulis ulang & diverifikasi 2026-10-25 |
| `docs/audits/` | 📚 Historis | Catatan audit per tanggal, valid untuk tanggalnya |
| `docs/designs/`, `docs/plans/` | 📚 Historis | Desain & rencana, bukan kondisi terkini |
| `docs/deploy/vps-deploy.md` | 🟡 Panduan umum | Masih berguna untuk setup awal; abaikan angka/versi |
| `docs-ai/` | 📚 Historis | 7 file, ditulis 31 Juli 2026 |
| `docs/rules/` | 📚 Historis | Salinan `backup/old-docs/rules/`, isinya identik |
| `prod-docs/` | ✅ Aktif | Operasional server; sudah dikoreksi (branch + build) |
| `ai-rules/` | 🔒 Immutable | Template; dikoreksi 2026-10-25 (branch `master`, `ops/build.sh`) atas persetujuan pemilik |
| `backup/old-docs/` | 🗄️ Arsip | Jangan dipakai sebagai acuan |
| `docs-site/` | 🗑️ **Dihapus 2026-10-25** | 834 MB, gitignored, konten usang. Diarsipkan di `backup/docs-site-content-20261025/` |
| `graphify-out/`, `.hermes/plans/` | 🗄️ Artefak tool | Bukan dokumentasi produk |

## Ketidaksesuaian yang Ditemukan (2026-10-25)

| Dokumen | Klaim lama | Fakta |
|---|---|---|
| `MEMORY.md`, `HANDOFF.md`, `ai-rules/AGENTS.md` | branch `main` | branch default **`master`** |
| `ai/PROJECT_CONTEXT.md` | "7 AI Agent" | 6 worker di `src/agents/`; tutor jalan inline di webhook, bukan worker |
| `ai/MODULE_MAP.md` | Quiz → `/api/exam/route.ts` | Quiz → `/api/students/quizzes/*` |
| `ai/CURRENT_STATE.md` | WhatsApp bot "in progress" | Tidak ada kode WhatsApp sama sekali |
| `ai/CURRENT_STATE.md` | cron memanggil `/api/reminders/check` | Diperbaiki 2026-10-25: job `reminders-check` tiap 1 menit |
| `docs-ai/*` | state 31 Juli 2026 | Sudah bertambah banyak commit sejak itu |
| `prod-docs/README.md` | "DI LUAR git repo" | Folder ini ter-track di git |
| `prod-docs/**` | `git pull origin main`, `npm run build` | `origin master`, `bash ops/build.sh` |
| `dev-docs/modules/api-routes.md` | beberapa method/route | Ditulis ulang — seluruh 73 route divalidasi otomatis terhadap source |
| `src/app/docs/*.tsx` | "7 agents", "11 modul" | 6 worker agent; 12 file di `dev-docs/modules/` |

Dokumen yang sudah **diperbaiki**: `README.md`, `MEMORY.md`, `HANDOFF.md`, `dev-docs/ai/*`
(5 file), `dev-docs/architecture/api-flow.md`, **seluruh `dev-docs/modules/*` (12 file)**,
`prod-docs/README.md`, `prod-docs/docs/operations/deployment.md`, `docs/deploy/vps-deploy.md`
(catatan di header), `src/app/docs/page.tsx`, `src/app/docs/architecture/page.tsx`, dan
`ai-rules/AGENTS.md` (branch + build, atas persetujuan pemilik).
Banner historis ditambahkan ke 7 file `docs-ai/*` dan 8 file `docs/rules/*`.

## Rekomendasi Lanjutan

1. `docs/rules/*` sudah diberi banner historis; pertimbangkan memindahkannya ke
   `backup/old-docs/` agar hanya ada satu salinan (kode aslinya di `src/rules/`).
2. Riwayat git masih memuat `CRON_SECRET` lama (sudah dirotasi, nilainya mati). Bersihkan
   dengan `git filter-repo` bila repo tetap publik.
3. Job `daily-nudge` dan `progress-snap` belum terdaftar di Hermes meski route + script ada.
