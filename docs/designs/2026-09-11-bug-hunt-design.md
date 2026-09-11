# Bug Hunt Design — Deep Dive 4 Permukaan

- **Tanggal:** 2026-09-11
- **Status:** disetujui (pendekatan A + C)
- **Cakupan:** seluruh aplikasi AI Private Tutor (Next.js 14 App Router + Prisma + Telegraf + PM2/Caddy)
- **Bukan cakupan:** perbaikan. Dokumen ini hanya mendefinisikan cara *menemukan* dan *membuktikan* bug. Fix ditangani terpisah setelah ledger disetujui.

## Tujuan

Menemukan bug nyata di seluruh permukaan aplikasi dengan bukti yang bisa direproduksi — bukan daftar dugaan. Output akhir: **findings ledger** dengan setiap entri punya tingkat bukti, lokasi `file:line`, dan bukti mentah.

## Bar bukti

Setiap temuan wajib punya tingkat. Tidak ada temuan tanpa tingkat.

| Tingkat | Syarat |
|---|---|
| `CONFIRMED` | Ada repro loop yang merah pada gejala persis, dan hijau setelah fix |
| `LIKELY` | Ada bukti kode/data yang kuat, tapi belum bisa direproduksi end-to-end |
| `SUSPECT` | Pola mencurigakan dari grep/scan, belum diselidiki |
| `RULED OUT` | Sudah diselidiki, terbukti bukan bug — dicatat agar tidak diselidiki ulang |

Aturan:
- `CONFIRMED` wajib menyertakan perintah repro yang bisa dijalankan ulang.
- `LIKELY` wajib menyertakan `file:line` + potongan kode/data.
- Temuan yang naik tingkat harus dicatat dari tingkat mana ia naik.
- `RULED OUT` sama pentingnya dengan temuan — mencegah kerja ulang.

## Severity

| Severity | Definisi |
|---|---|
| `CRITICAL` | Kebocoran data lintas siswa, bypass otorisasi, kehilangan data, situs mati |
| `HIGH` | Fitur utama salah/rusak untuk sebagian siswa, konten salah jenjang, gagal senyap |
| `MEDIUM` | Cacat yang terlihat user tapi ada jalan pintas, inkonsistensi data |
| `LOW` | Kosmetik, pesan tidak jelas, cacat yang tak mengubah perilaku |

## Pendekatan

**A — Breadth-first**, dengan **C (dogfood browser) dilipat ke permukaan D**.

1. Jalankan ~35–40 probe mekanis lintas 4 permukaan sekali jalan → ledger kandidat mentah.
2. Triage: buang false positive, beri severity awal, ranking.
3. Deep-dive top-N dengan repro loop sampai naik ke `CONFIRMED`/`LIKELY`.
4. Laporkan.

Alasan memilih A: 4 permukaan tanpa peta cakupan menghasilkan hunt yang melebar tanpa ujung. Breadth dulu memberi peta; bar bukti menjaga agar hanya kandidat yang benar-benar bisa direproduksi yang naik jadi "bug".

## Probe per permukaan

### A — Security & access control

| # | Probe | Cara |
|---|---|---|
| A1 | Guard function yang `return true` tanpa cek | grep `verify*`/`assert*`/`can*` + inspeksi body |
| A2 | Setiap route `src/app/api/**` punya guard? | enumerasi route × cari cek session/secret |
| A3 | IDOR: route siswa verifikasi kepemilikan resource? | inspeksi route yang menerima `id`/`studentId` |
| A4 | Resolusi identitas Telegram saat tabrakan | inspeksi `findStudentByTelegramId` |
| A5 | `parentTelegramId` dipakai sebagai otorisasi? | grep pemakaian |
| A6 | Secret bocor ke bundle klien | grep `NEXT_PUBLIC_*`, scan `.next/static` untuk nilai `.env` |
| A7 | Secret cron per-route (header vs query legacy) | enumerasi route `api/cron/**` |
| A8 | Konfigurasi JWT (algoritma, expiry, opsi verify) | baca modul session |
| A9 | Validasi input di boundary + SQL dirangkai string | grep `$queryRawUnsafe`, template literal di query |
| A10 | Webhook: validasi secret | baca route webhook |

### B — Data integrity & content

| # | Probe | Cara |
|---|---|---|
| B1 | Orphan: Material tanpa Curriculum, Quiz tanpa Material, ExamAttempt tanpa Exam | SQL LEFT JOIN IS NULL |
| B2 | `Material.gradeLevel` vs `Curriculum.gradeLevel` beda | SQL join |
| B3 | Kebocoran lintas jenjang | SQL |
| B4 | Topik typo/kembar | SQL group by lower(topic) |
| B5 | Kekosongan konten per field | SQL count per kolom |
| B6 | Integritas kuis: `correctIndex` dalam rentang, jumlah opsi | SQL + parsing |
| B7 | Enum skema vs nilai nyata di DB | bandingkan `schema.prisma` vs `SELECT DISTINCT` |
| B8 | Duplikat soal dalam satu kuis | SQL/parsing |

### C — Runtime & reliability

| # | Probe | Cara |
|---|---|---|
| C1 | Klasifikasi setiap signature error di `logs/err.log` | ekstraksi + hitung + atribusi |
| C2 | `catch {}` kosong & promise tanpa await | grep pola |
| C3 | Kausal restart PM2 | korelasikan waktu restart dengan log |
| C4 | Queue BullMQ vs fallback in-memory — job hilang? | baca modul queue |
| C5 | Cron benar-benar bekerja atau no-op | baca skrip cron + cek efeknya |
| C6 | Panggilan LLM tanpa timeout | grep fetch tanpa AbortController |
| C7 | Pertumbuhan heap | sampel memori PM2 |
| C8 | Webhook: pending & error rate | Telegram getWebhookInfo |

### D — Student-facing UX & flow

| # | Probe | Cara |
|---|---|---|
| D1 | Dogfood tiap halaman siswa dengan sesi mint | browser + `browser_console` |
| D2 | Error konsol senyap | `browser_console` setelah tiap navigasi |
| D3 | Tombol mati, `href="#"`, handler kosong | snapshot + inspeksi |
| D4 | Empty state saat 0 data | navigasi + observasi |
| D5 | Wiring gamifikasi: streak, bintang, badge, spaced repetition | telusuri tulis-baca field |
| D6 | Alur registrasi → trial → expire → extend | telusuri handler + route |
| D7 | Layout mobile | viewport + screenshot |

## Format ledger

```markdown
| ID | Tingkat | Sev | Permukaan | Temuan | Lokasi | Bukti |
|----|---------|-----|-----------|--------|--------|-------|
| A1 | CONFIRMED | CRITICAL | Security | verifyStudentOwnership selalu true | src/agents/guardian/safety.ts:255 | repro: `npx tsx ...` |
```

Kolom `Bukti` wajib berisi perintah atau data mentah, bukan narasi.

## Risiko

| Risiko | Mitigasi |
|---|---|
| False positive dari grep mekanis | Bar bukti: `SUSPECT` tidak boleh naik tanpa repro |
| Scope melebar tak terkendali | Batasi deep-dive ke top-N hasil triage |
| Probe mengubah state produksi | Semua probe read-only; tak ada tulis ke DB/`.env` |
| Kebocoran kredensial ke ledger | Semua nilai rahasia di-mask `<set>` / `<redacted>` |

## Urutan eksekusi

1. Surface A breadth scan
2. Surface B breadth scan
3. Surface C breadth scan
4. Surface D dogfood
5. Triage + ledger kandidat
6. Deep-dive top-N
7. Laporan final
