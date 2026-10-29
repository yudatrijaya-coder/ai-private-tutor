# CLAUDE.md — Aturan untuk Agent di Repo Ini

## ⛔ WAJIB: Baca `ai-state.md` lebih dulu

**Sebelum tindakan pertama apa pun** (membaca kode, mengubah file, menjalankan perintah), baca:

1. **`ai-state.md`** — kondisi terkini, aturan wajib, jebakan yang sudah memakan korban
2. `dev-docs/ai/PROJECT_CONTEXT.md` — stack & topologi
3. `dev-docs/ai/MODULE_MAP.md` — modul → file

`ai-state.md` adalah **sumber kebenaran untuk kondisi terkini**. Bila bertentangan dengan dokumen lain, `ai-state.md` yang menang — tapi tetap verifikasi ke sistem sebelum bertindak.

Alasan aturan ini ada: repo ini melayani siswa sungguhan, dan sudah dua kali bug label jenjang lolos ke produksi karena agent bekerja dari asumsi, bukan dari kondisi nyata.

---

## Aturan inti (ringkas — detail di `ai-state.md`)

- **Verifikasi, jangan asumsikan.** Query DB untuk data; `pm2 ls`/`ss -tlnp` untuk proses. Dokumen lama di repo ini memuat angka basi.
- **Build wajib `bash ops/build.sh`** — bukan `npx next build` (pernah OOM-killed).
- **Jalankan `npm test`** sebelum commit; ada tes penjaga label jenjang.
- **Jangan commit secret.** Repo ini PUBLIC.
- **Branch `master`**, bukan `main`.
- **Verifikasi dari output tersaji** (`curl` domain live), bukan dari source.

---

## Rujukan

- `ai-state.md` — kondisi terkini (baca pertama)
- `MEMORY.md` — fakta durable jangka panjang
- `HANDOFF.md` — handover historis (bukan kondisi terkini)
- `dev-docs/ai/` — dokumentasi kanonik

@MEMORY.md
@HANDOFF.md
