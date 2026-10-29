# ai-state.md — WAJIB DIBACA SEBELUM MENYENTUH REPO INI

> **Untuk siapa:** setiap AI agent (Claude Code, Codex, opencode, Cursor, Gemini, Copilot, Cezar runner, atau apa pun) yang akan membaca, mengubah, atau menjalankan perintah pada repo **ai-private-tutor**.
>
> **Baca file ini SAMPAI HABIS sebelum tindakan pertama.** Repo ini melayani siswa sungguhan. Kesalahan kecil bisa sampai ke anak-anak.

**Terakhir diperbarui:** 2026-10-29 12:15 +07 — penambahan temuan §3.1–3.5: alur rantai agent, pemicu, dan status pemakaian pipeline
**Diverifikasi terhadap:** commit `f12322c` (branch `master`), DB produksi live
**Diperbarui oleh:** sesi DSH — semua angka di bawah dicek langsung ke DB/OS, bukan disalin dari dokumen lama

---

## 0. Aturan Wajib (baca dulu, jangan dilewati)

1. **Baca `ai-state.md` ini dulu**, lalu `dev-docs/ai/PROJECT_CONTEXT.md` dan `MODULE_MAP.md`.
2. **Jangan percaya dokumen tanpa verifikasi.** Dokumen di repo ini pernah memuat angka basi. Kalau menyentuh data, **query DB langsung**. Kalau menyentuh proses, **cek `pm2 ls` / `ss -tlnp`**.
3. **Jangan pernah commit secret.** Pernah terjadi: token Moodle ter-commit (lihat §7).
4. **Build wajib lewat `bash ops/build.sh`**, bukan `npx next build`. Plain `next build` pernah OOM-killed.
5. **Jangan menghapus `.next` sebelum tes lulus.** `ops/build.sh` sudah mengatur urutan ini; jangan diakali.
6. **Branch adalah `master`**, bukan `main`.
7. **Setelah mengubah perilaku, verifikasi dari output yang tersaji** (`curl` ke domain live), bukan dari asumsi source.

---

## 1. Fakta Ringkas (terverifikasi 2026-10-29)

| Item | Nilai | Cara verifikasi |
|---|---|---|
| Repo | `yudatrijaya-coder/ai-private-tutor` — **PUBLIC** ⚠️ | `curl api.github.com/repos/...` → 200 |
| Branch default | **`master`** (bukan `main`) | `git rev-parse --abbrev-ref HEAD` |
| Stack | Next.js 16.3.0 App Router · React 19.2.4 · Tailwind 4 · Prisma 7.9.1 · Telegraf 4.16.3 | `package.json` |
| Node | **v24.11.0** di VPS (dokumen lama menulis 22) | `node -v` |
| DB | PostgreSQL 16.14, db `ai_private_tutor`, user `tutor` | `psql` / MCP |
| LLM | 9Router `http://127.0.0.1:20128/v1`, model `ai_tutor_agent`, fallback `hermes` | 9Router config |
| Bot | `@senangbelajar_bot`, **webhook mode** | Telegram API |
| Domain | `senangbelajar.web.id` | curl |
| VPS | Tencent Cloud Jakarta — `ubuntu@43.133.151.242` | — |
| RAM / Swap | 3,6 GB / 4,9 GB (`/swap.img` 2 GB + `/swap-build.img` 3 GB) | `free -h`, `/proc/swaps` |

### Angka data produksi (live, 2026-10-29)

| Tabel | Jumlah |
|---|---|
| `Student` | **4 baris — hanya 1 siswa nyata: `BAHLIL` (SMP_1)**; `Raihan`/`SHOFI`/`Syifa` bertanda `isTemplate=true` |
| `Material` | 1.296 |
| `Curriculum` | 5 |
| `AgentLog` | 38.699 |

⚠️ **Dokumen lama menyebut "4 siswa".** Yang benar: 1 siswa aktif + 3 template. Jangan laporkan "4 siswa" tanpa cek `isTemplate`.

---

## 2. Proses yang Berjalan

| Proses | Port | Supervisor |
|---|---|---|
| `ai-private-tutor` | 3000 | PM2 |
| `9router` | 20128 | PM2 |
| Caddy | 80/443 | systemd |
| PostgreSQL | 5432 | systemd |
| Redis | 6379 | systemd |
| **`dsh-web.service`** | 3080 | systemd (harness agent, `https://senangbelajar.web.id/agent/`) |
| **Cezar cockpit** | 4321 | ❌ **tanpa supervisor** (`cezar.senangbelajar.web.id`, basic auth) |

### Cron — HATI-HATI, dokumen lama menyesatkan

`START_HERE.md` menulis *"Cron = Hermes cron, bukan crontab OS"*. **Itu tidak akurat.**

- **Yang benar-benar jalan:** crontab OS —
  ```
  */5 * * * *  ops/cron-schedule-sweep.sh   → POST /api/cron/schedule-sweep
  30 3 * * *   ops/backup-db.sh
  ```
- `~/.hermes/profiles/opencode/scripts/*.sh` (14 skrip) **tidak dijalankan** — `hermes-gateway.service` **INAKTIF** dan tidak ada unit di `/etc/systemd/system`.

---

## 3. Sistem Multi-Agent (SUDAH ADA — jangan bangun ulang)

Ini sering salah dipahami. Repo **sudah punya** orkestrasi agent berbasis BullMQ.

| Komponen | Lokasi |
|---|---|
| Definisi 10 queue | `src/queue/definitions.ts` |
| Worker factory (+ AgentLog lifecycle) | `src/queue/worker.ts` |
| DLQ + retry (max 3, backoff) | `src/queue/dlq.ts`, `MAX_RETRIES` |
| Runner / registrasi | `src/queue/runner.ts`, `src/instrumentation.ts` |
| Worker per domain | `src/agents/{curriculum,content,assessment,media,scheduler,guardian}/worker.ts` |
| Log & audit | model `AgentLog` (status, input, output, error, traceId) |
| Dashboard | `/dashboard/agents` (`AgentPipelineView`, `QueueMonitor`) |

### 3.1 Alur rantai agent (dirakit di kode, bukan konfigurasi)

```
POST /api/students  {action:"trigger", studentId, stages}
        │  (src/app/api/students/route.ts:60)
        ▼
   [content-scrape]      agent CONTENT
        │  content/worker.ts:111
        ▼
   [curriculum-review]   agent CURRICULUM (pakai LLM)
        │
        ├── ✅ approved → status=PROCESSED
        │        ├──► [assessment-generate]  curriculum/worker.ts:172
        │        └──► [media-render]         curriculum/worker.ts:188
        │
        └── ❌ rejected → [content-scrape] ulang, sumber lain
                 (maks 2×, lalu tandai manual)  curriculum/worker.ts:231
```

**Pemicu satu-satunya:** `POST /api/students` dengan body `{action:"trigger", studentId, stages?}`.
`stages` default `"all"` → `["curriculum","content","assessment","guardian","schedule"]`.

Hanya dua tempat di UI yang memicunya:
- `/dashboard/agents` → `PipelineTrigger.tsx:40`
- `/dashboard/students/[id]` → `StudentDetailView.tsx:645, 686`

Tidak ada cron yang memicu rantai konten. Tidak ada endpoint lain.

### 3.2 Status AgentLog — dan nuansa yang mudah salah dibaca

| agentType | action | status | n | periode |
|---|---|---|---|---|
| SCHEDULER | `schedule-sweep` | COMPLETED | 33.239 | masih aktif (29 Okt 05:04) |
| ASSESSMENT | `assessment-generate` | FAILED | 5.250 | **hanya 8–9 Jul** |
| ASSESSMENT | `assessment-generate` | COMPLETED | 24 | 8–9 Jul |
| GUARDIAN | `guardian-report` | COMPLETED | 76 | masih aktif (29 Okt 00:00) |
| CURRICULUM | `curriculum-review` | FAILED | 6 | **hanya 9 Jul** |

Aktivitas 7 hari terakhir: **hanya `SCHEDULER` dan `GUARDIAN`** — keduanya **tidak memakai LLM**.

### 3.3 ⚠️ Rantai konten praktis belum pernah dipakai serius

Ini temuan penting, jangan disalahartikan sebagai "sistem rusak":

| action | total | periode |
|---|---|---|
| `assessment-generate` | 5.274 | **hanya 8–9 Jul** |
| `curriculum-review` | **6** | hanya 9 Jul |
| `content-scrape` | **0** | **tidak pernah** |
| `media-render` | **0** | **tidak pernah** |
| `media-yt-fallback` | **0** | **tidak pernah** |
| `assessment-evaluate` | **0** | **tidak pernah** |

Tambahan: **seluruh 1.296 `Material` berstatus `READY`** — tidak ada satu pun `RAW`/`DRAFT` yang menunggu diproses pipeline.

**Interpretasi:** mesinnya lengkap dan menyala (`[instrumentation] Queues: OK`, 10 queue terinisialisasi, 48 key `bull:*` di Redis), tetapi **cincin rantai kontennya belum pernah dipakai masif sejak Juli**. Ini cocok dengan hanya adanya 1 siswa nyata — siswa baru adalah satu-satunya pemicu.

**Belum dipastikan:** apakah ini memang disengaja (pipeline hanya untuk siswa baru), atau ada usaha massal Juli yang berhenti tanpa disadari. Butuh konfirmasi pemilik produk.

**Catatan soal 5.250 `ASSESSMENT` FAILED:** error-nya `"stale: attempt never reached a terminal state"` dan `"stale: retries exhausted with no terminal record (lifecycle bug, fixed)"`. Ini **artefak historis** dari bug lifecycle yang sudah diperbaiki — bukan masalah aktif. Jangan "perbaiki" ulang, dan jangan menganggapnya sebagai tanda sistem sedang rusak.

### 3.4 Mekanisme ketahanan yang sudah ada

| Mekanisme | Lokasi |
|---|---|
| Retry 3× + exponential backoff (2 dtk) | `runner.ts` `defaultJobOptions` |
| Dead Letter Queue | `dlq.ts` — `shouldDeadLetter()`, `effectiveAttempts()` |
| Resume, bukan duplikat (fix bug 2.703 baris ACTIVE) | `worker.ts:57-74` — `findFirst` status transien |
| Fallback in-memory tanpa Redis | `queue/local.ts`, dipakai `instrumentation.ts` |

### 3.5 Konsekuensi untuk perencanaan

Karena runtime agent sudah ada, tugas seperti *audit kurikulum massal* / *ingest Moodle baru* sebaiknya jadi **lapisan dev-time** (mis. Cezar + worktree), bukan menambah queue runtime. Setelah alurnya stabil dan rutin, baru dipindahkan ke queue agar jalan otomatis.

Jangan bangun ulang: queue baru, tabel log baru, atau dashboard agent baru.

---

## 4. Aturan Jenjang (`GradeLevel`) — sumber bug berulang

Enum `GradeLevel` **hanya 3 nilai**, dan **namanya bukan nomor kelas**:

| Enum | Arti sebenarnya |
|---|---|
| `SD_5` | SD kelas **5** |
| `SMP_1` | SMP kelas **7** |
| `SMA_2` | SMA kelas **11** |

### Satu-satunya sumber label: `src/lib/grade-label.ts`

Jangan menulis peta label lokal di file mana pun. Gunakan:
`gradeLabel()`, `gradeShort()`, `gradeLabelWith()`, `gradeOptions()`, `ALL_GRADE_LABELS`, `ENROLLED_GRADES`.

### Ada tes penjaga — jalankan sebelum commit

```bash
npm test    # 11 tes: unit + penjaga arsitektur yang memindai seluruh src/
```

Tes ini **gagal** bila ada peta label lokal dibuat ulang, dan sudah terpasang sebagai gerbang di `ops/build.sh` (sebelum `rm -rf .next`).

**Riwayat:** bug "SMP Kelas 1"/"SMA Kelas 2" sudah **dua kali** lolos ke produksi karena peta label disalin ke 14 file. Jangan ulangi.

---

## 5. Perintah Penting

```bash
# Build produksi (WAJIB — aktivasi swap + heap cap + gerbang tes)
bash ops/build.sh

# Tes label (cepat, tanpa framework tambahan)
npm test

# Restart aplikasi
pm2 restart ai-private-tutor --update-env

# Cek kesehatan
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000

# Type check
npx tsc --noEmit
```

**Batasan:** jangan menjalankan 2 build bersamaan. RAM 3,6 GB; `next build` sudah pernah OOM. Overlay `dsh-web`, Cezar, dan 9Router ikut memakai memori yang sama (saat build berjalan, swap bisa tersaturasi ~4,9 GB).

---

## 6. Koneksi Database untuk Agent

Akses **baca-saja** tersedia lewat MCP `tutor_db` (dbhub), sudah aktif di profil DSH web:

- `mcp__tutor_db__execute_sql` — SELECT/WITH/EXPLAIN/SHOW saja, maks 200 baris
- `mcp__tutor_db__search_objects` — telusuri skema

**Guardrail-nya nyata**, bukan konvensi: `UPDATE`/`DELETE` ditolak dengan `READONLY_VIOLATION`. Diverifikasi 2026-10-29.

Config: `~/.dsh/dbhub-tutor.toml` (password dibaca dari `.env` proyek, tidak disimpan di file).

**Kolom Prisma memakai camelCase ber-quote.** Contoh: `SELECT "gradeLevel" FROM "Student"` — bukan `grade_level`. Ini pernah membuat query gagal.

---

## 7. ⚠️ TEMUAN KEAMANAN TERBUKA

### 7.1 Token Moodle ter-commit ke git — BELUM DIPERBAIKI

Token webservice Moodle `963d206373a4ca4c9d8df93a142add` (`moodle.kumbang.sch.id`) berada di **3 file yang sudah ter-commit**:

| File | Kemunculan |
|---|---|
| `moodle-download.py` | 1 |
| `scripts/_polite-manifest.json` | 10 |
| `scripts/moodle-polite-fetch.py` | 1 |

**Repo ini PUBLIC.** Token ada di riwayat git **selamanya** — menghapus file di commit baru tidak menghilangkannya.

**Yang harus dilakukan (belum selesai):**
1. **Rotate/revoke token di Moodle** — hanya bisa dilakukan pemilik akun.
2. Pindahkan ke `.env` sebagai `MOODLE_WS_TOKEN`.
3. Bersihkan riwayat (`git filter-repo`) — butuh koordinasi karena menulis ulang history.

Jangan menganggap ini sudah beres. Jangan menyebarkan token itu lebih jauh.

### 7.2 Token GitHub plaintext di `.git/config`

Remote URL memuat `ghp_...` dalam bentuk polos. Saat menampilkan output push, selalu mask:
```bash
... | sed 's|https://ghp_[A-Za-z0-9]*@|https://***@|g'
```

### 7.3 `.ai/` (state Cezar) tidak di-gitignore utama

`.ai/cezar/` membawa `.gitignore` sendiri yang melindungi `launch-key`, tapi `config.json` **tidak** ter-ignore, sehingga `git status` menampilkan `?? .ai/`. Berhati-hatilah saat `git add -A`.

---

## 8. Cezar (orkestrasi dev-time)

Terpasang: `@open-mercato/cezar@0.16.3`, cockpit di port 4321, project `ai-private-tutor` sudah terdaftar, runner `opencode`.

**Masalah yang belum diperbaiki:**
1. 🔴 `maxParallel=3` × `memoryLimitMb=2000` = **6 GB** pada RAM 3,6 GB → berisiko OOM. Sarankan `maxParallel: 1`, `memoryLimitMb: 1200`.
2. 🟡 Tanpa systemd unit → mati saat logout, domain jadi 502.
3. 🟡 `gh` CLI tidak terpasang → automation GitHub tidak bisa, PR creation tidak bisa.
4. ℹ️ `claude` CLI tidak terpasang; yang siap: `codex` (login ✅) dan `opencode` (login ✅).

Hook worktree: `~/.local/bin/cezar-worktree-setup.sh` (symlink `node_modules`, hemat ~1,1 GB/worktree).

---

## 9. Jebakan yang Sudah Memakan Korban

| Jebakan | Akibat | Pencegahan |
|---|---|---|
| Menulis peta label jenjang lokal | Bug sampai ke siswa, 2× | Pakai `lib/grade-label.ts`, jalankan `npm test` |
| `next build` polos | OOM-killed | Selalu `bash ops/build.sh` |
| `sed`/`grep` satu pola untuk label | Melewatkan 4 kategori bentuk | Tes arsitektur memindai 4 pola |
| Percaya dokumen tanpa cek DB | Angka basi ("4 siswa", "Hermes cron") | Verifikasi ke sumber |
| Prisma `grade_level` vs `"gradeLevel"` | Query gagal | camelCase ber-quote |
| Restart PM2 saat build berjalan | `Cannot find module .next/...` | Build dulu sampai `BUILD_EXIT=0` |
| Commit `-A` dengan `.ai/` kotor | State agent ikut ter-commit | Cek `git status` per file |
| Menyimpulkan "agent tidak jalan" dari `AgentLog` mentah | 5.281 FAILED terlihat seperti sistem rusak, padahal artefak Juli | Lihat §3.2–3.3; cek periode & action, bukan hanya status |
| Menyimpulkan "pipeline aktif" dari `Queues: OK` | Queue menyala ≠ rantai dipakai | Cek `action` di `AgentLog` + status `Material` |
| Mengira ada cron yang memicu rantai konten | Hanya `POST /api/students {action:"trigger"}` (§3.1) | Baca pemicunya, jangan berasumsi |

---

## 10. Protokol Menutup Pekerjaan

Sebelum menyatakan selesai:

1. `npm test` lulus.
2. `npx tsc --noEmit` bersih.
3. `bash ops/build.sh` → `BUILD_EXIT=0`.
4. `pm2 restart ai-private-tutor --update-env`, lalu `curl` domain live → 200.
5. `git status` — tidak ada file tak diinginkan.
6. **Perbarui bagian "Angka data produksi" dan "Terakhir diperbarui" di file ini** bila ada perubahan nyata.
7. Commit + push ke `origin master`. Mask token saat menampilkan output.

---

## 11. Rujukan Lanjutan (jangan duplikasi di sini)

| Dokumen | Isi |
|---|---|
| `dev-docs/ai/PROJECT_CONTEXT.md` | Stack, topologi, struktur sumber |
| `dev-docs/ai/MODULE_MAP.md` | Modul bisnis → file |
| `dev-docs/ai/CURRENT_STATE.md` | Maturitas fitur (⚠️ snapshot 2026-10-25, bisa basi) |
| `dev-docs/ai/START_HERE.md` | Titik masuk lama (⚠️ memuat klaim cron & repo yang tidak akurat) |
| `dev-docs/ai/FINAL_SYSTEM_HANDOVER.md` | Handover sistem |

> `ai-state.md` adalah **sumber kebenaran untuk kondisi terkini**. Bila berbeda dengan dokumen di atas, **file ini menang** — tapi tetap verifikasi ke sistem sebelum bertindak.
