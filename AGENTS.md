# AGENTS.md — Aturan Wajib untuk Semua AI Agent

Berlaku untuk **semua** agent yang bekerja di repo ini: Claude Code, Codex, opencode, Cursor, Gemini CLI, GitHub Copilot, Cezar runner, Windsurf, atau agent lain apa pun.

## ⛔ LANGKAH PERTAMA: baca `ai-state.md`

**Sebelum melakukan apa pun** — sebelum membaca kode, mengubah file, atau menjalankan perintah — buka dan baca **`ai-state.md`** sampai habis.

`ai-state.md` memuat: kondisi terkini terverifikasi, aturan wajib, arsitektur multi-agent yang sudah ada, aturan jenjang, jebakan yang sudah memakan korban, temuan keamanan terbuka, dan protokol menutup pekerjaan.

Bila `ai-state.md` bertentangan dengan dokumen lain di repo ini, **`ai-state.md` yang menang** — tapi tetap verifikasi ke sistem sebelum bertindak.

## Mengapa aturan ini ada

Repo ini **melayani siswa sungguhan** (anak SD/SMP/SMA). Bug label jenjang ("SMP Kelas 1" seharusnya "SMP Kelas 7") sudah **dua kali** lolos ke produksi karena agent bekerja dari asumsi alih-alih dari kondisi nyata. Dokumen di repo ini juga pernah memuat angka basi — termasuk jumlah siswa, sumber cron, dan visibilitas repo.

## Aturan inti

| Aturan | Alasan |
|---|---|
| **Verifikasi, jangan asumsikan** | Query DB untuk data; `pm2 ls` / `ss -tlnp` untuk proses |
| **Build: `bash ops/build.sh`** | `npx next build` polos pernah OOM-killed |
| **`npm test` sebelum commit** | Ada tes penjaga label jenjang |
| **Jangan commit secret** | Repo ini **PUBLIC** |
| **Branch `master`**, bukan `main` | — |
| **Verifikasi dari output tersaji** | `curl` ke domain live, bukan asumsi source |
| **Jangan bangun ulang sistem multi-agent** | Sudah ada: BullMQ + `AgentLog` |

## Rujukan

1. **`ai-state.md`** — kondisi terkini (baca pertama)
2. `dev-docs/ai/PROJECT_CONTEXT.md` — stack & topologi
3. `dev-docs/ai/MODULE_MAP.md` — modul → file
4. `MEMORY.md` — fakta durable
5. `CLAUDE.md` — aturan spesifik Claude Code
