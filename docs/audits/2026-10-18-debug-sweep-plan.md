# Debug Plan End-to-End — AI Private Tutor

**Basis**: grafik graphify 4.094 node / 8.646 edge (tervalidasi 99,9% edge import, 100% source_location)
**Commit acuan**: `7605181` (= HEAD)
**Metode**: `systematic-debugging` (4 fase) — **tanpa perbaikan sebelum root cause ditemukan**
**Prinsip**: kalau tidak ada bug, laporkan "tidak ada bug" dan lanjut. Tidak memaksakan temuan.

---

## Ringkasan Kluster

Urutan diturunkan dari **jangkauan dampak di grafik** (fan-in × fan-out) dan **alur data produksi**,
bukan dari ukuran folder.

| # | Kluster | Node | Risiko | Alasan prioritas (dari grafik) |
|---|---------|------|--------|-------------------------------|
| **K1** | Bot: routing & kuis | 326 | **Tinggi** | `message.ts` fan-out 61, `quiz.ts` fan-out 79, `onboarding.ts` fan-out 46. Jangkauan terluas, menyentuh 54 node quiz + 33 onboarding |
| **K2** | Auth & sesi siswa | 48 | **Tinggi** | `student.ts` in 18/out 13; gerbang semua `/api/students/*` (middleware 197 baris) |
| **K3** | Ujian & LLM | 56 | **Sedang-tinggi** | `weekly-exam-generator` out 21; `client.ts` out 32; biaya uang nyata |
| **K4** | Cron & idempotency | 38 | **Sedang** | 7 endpoint, 9 pemakai `claimOnce`; gagal senyap = notifikasi ganda/hilang |
| **K5** | Queue & DLQ | 5 | **Sedang** | `worker.ts` out 18, `runner.ts` out 16; job hilang tanpa jejak |
| **K6** | Nilai & gamifikasi | 32 | **Sedang** | `quiz-grading` in 16, `gamification.ts` kohesi 0,571 |
| **K7** | Bank konten & kurikulum | 24 | **Rendah** | Data statis, 40k baris; bug di sini = konten salah, bukan crash |

**Dikecualikan (sudah diverifikasi aman):**
- Cron auth — 7/7 pakai `checkCronSecret()` fail-closed (`src/lib/cron/guard.ts`)
- Middleware auth — melindungi `/api/admin/`, `/api/students/*`, `/api/exam/*`, `/api/queues`, `/api/bot/diag`
- Import cycle — 0 terdeteksi

---

## Protokol per Kluster

Setiap kluster menjalani 4 fase. Berhenti kalau tidak ada bukti bug.

```
FASE 1 — ROOT CAUSE
  1.1 Pakai grafik: ./graphify-run.sh explain "<node kunci>"
  1.2 Baca kode nyata di file:baris yang ditunjuk grafik
  1.3 Bangun feedback loop yang BISA MERAH
  1.4 Kumpulkan bukti (log, DB, respons HTTP)

FASE 2 — POLA
  2.1 Cari kode serupa yang BEKERJA (grafik: query --context call)
  2.2 Daftar perbedaan

FASE 3 — HIPOTESIS
  3.1 3-5 hipotesis, diurutkan
  3.2 Uji satu per satu, satu variabel
  3.3 Kalau gugur → hipotesis baru, JANGAN menumpuk fix

FASE 4 — VERIFIKASI
  4.1 Reproduksi merah → hijau
  4.2 Cek regresi di kluster tetangga (grafik: path A B)
```

**Aturan berhenti**: hipotesis gugur 2x berturut → laporkan "tidak ditemukan bug" + bukti yang
sudah diperiksa. Jangan lanjut memaksa.

---

## K1 — Bot: Routing & Kuis (PRIORITAS 1)

**Kenapa pertama**: jangkauan 326 node. `message.ts` fan-out 61 → memanggil hampir semua handler.
`quiz.ts` 1.805 baris, 37 fungsi, fan-out 79. Kalau ada satu bug, dampaknya paling luas.

**Node kunci dari grafik:**
- `src/bot/handlers/message.ts::onMessage` (fan-out 61)
- `src/bot/handlers/quiz.ts` (37 fungsi, fan-out 79)
- `src/bot/state-machine.ts::routeByState`
- `src/bot/handlers/onboarding.ts` (fan-out 46)

**Pertanyaan debug:**
1. Apakah `routeByState` punya state yang tidak punya handler → bot diam?
2. `quiz.ts`: 37 fungsi tanpa test — apakah ada cabang yang tidak ter-reach?
3. Timer kuis (`scheduleQuestionTimer` / `clearQuestionTimer`): ada kebocoran timer?
4. `escapeMd()` — 52 edge, 105 pemakaian `parse_mode`: ada jalur yang lupa escape?

**Feedback loop:** kirim payload webhook sintetis ke `/api/bot/webhook` dengan secret, assert balasan.

**Sinyal yang sudah dikumpulkan:** 105 `parse_mode` vs 15 file memakai `escapeMd` → potensi gap escaping.

---

## K2 — Auth & Sesi Siswa

**Node kunci:**
- `src/lib/auth/student.ts` (in 18, out 13)
- `src/lib/auth/access.ts::evaluateStudentAccess`
- `src/lib/auth/student-secret.ts::readStudentSecret`
- `src/lib/rate-limit.ts`

**Pertanyaan debug:**
1. Cookie `student_session` yang kedaluwarsa — apakah benar ditolak di middleware DAN handler?
2. `evaluateStudentAccess`: TRIAL vs ACTIVE vs HOLD — apakah ada status yang lolos tanpa sengaja?
3. Rate limit login: bisa di-bypass lewat header `X-Forwarded-For`?

**Feedback loop:** login dengan token kedaluwarsa/status HOLD, assert 401.

---

## K3 — Ujian & LLM

**Node kunci:**
- `src/services/weekly-exam-generator.ts` (out 21)
- `src/llm/client.ts::callLLM` (in 43)
- `src/agents/assessment/generator.ts` (out 27)

**Pertanyaan debug:**
1. `callLLM` fallback chain: kalau semua model gagal, apa yang dikembalikan? String kosong?
2. Budget check (`checkBudget`) — apakah dicek SEBELUM panggilan (bisa overspend)?
3. Respons LLM non-JSON: apakah ada `JSON.parse` tanpa guard di jalur ini?
4. `ApiUsage` tercatat untuk semua panggilan, termasuk yang gagal?

**Feedback loop:** panggil generator dengan model tidak valid, assert error terkontrol (bukan crash).

**Sinyal:** 15 `JSON.parse` di lib/services/agents — perlu diperiksa satu per satu mana yang tanpa try/catch.

---

## K4 — Cron & Idempotency

**Node kunci:**
- `src/lib/cron/idempotency.ts` (in 30)
- `src/lib/cron/guard.ts::checkCronSecret`
- `src/services/daily-nudge.ts`, `guardian-report.ts`, `motivation-nudge.ts`

**Pertanyaan debug:**
1. `claimOnce` — apakah klaim dilepas kalau job gagal (supaya bisa retry)?
2. Job jalan 2x bersamaan (race) — apakah `CronClaim` benar-benar atomik?
3. Fail-closed saat `CRON_SECRET` kosong — sudah benar; apakah `logCronRun` juga jalan saat ditolak?

**Feedback loop:** panggil endpoint cron 2x berurutan, assert efek samping hanya sekali.

---

## K5 — Queue & DLQ

**Node kunci:** `src/queue/worker.ts` (out 18), `runner.ts` (out 16), `dlq.ts`

**Pertanyaan debug:**
1. Job gagal → masuk DLQ? Atau hilang?
2. `attempts=0` default (menurut memori proyek) — apakah retry benar-benar jalan?
3. Worker restart → job in-flight hilang tanpa jejak?

---

## K6 — Nilai & Gamifikasi

**Node kunci:** `src/lib/quiz-grading.ts` (in 16), `src/lib/gamification.ts` (kohesi 0,571)

**Pertanyaan debug:**
1. Jawaban benar/salah — bagaimana menangani soal tanpa kunci jawaban?
2. `isAnswerCorrect`: case sensitivity, whitespace, opsi duplikat?
3. Badge diberikan 2x untuk attempt yang sama?

---

## K7 — Bank Konten & Kurikulum

**Node kunci:** `src/data/curriculum-*.ts` (40k baris), `quiz-bank-*.ts`, `src/lib/curriculum-active.ts` (in 36)

**Pertanyaan debug:**
1. `getActiveCurriculumId` — kalau ada 2 kurikulum aktif, mana yang dipilih?
2. Bank TS vs bank DB — prioritas sesuai dokumentasi?
3. Kunci `subject||topic||subTopic` — ada tabrakan antar grade?

---

## Deliverable

Untuk setiap kluster, keluaran berupa salah satu:

- **BUG TERVERIFIKASI** — root cause + file:baris + reproduksi merah→hijau + dampak
- **TIDAK ADA BUG** — daftar yang diperiksa + bukti (query/uji yang dijalankan)
- **RISIKO (bukan bug)** — pola berbahaya yang belum memicu kegagalan

Laporan akhir ditulis ke `docs/audits/2026-10-18-debug-sweep.md`.

---

## Catatan alat

```bash
# Telusuri kluster
./graphify-run.sh explain "onMessage()"
./graphify-run.sh seeded "x" --seed "onMessage()" --context call

# Jalur antar komponen
./graphify-run.sh path "handleQuizAnswer()" "quiz-grading.ts"

# Verifikasi grafik masih valid sebelum dipakai
python3 tools/graphify/validate-e2e.py
```

**Batasan grafik yang harus diingat:**
- God nodes tercampur modul standar (`json`, `re`, `time`, `subprocess`) — abaikan
- Edge ke `package.json` = dependency, bukan import kode
- Grafik tahu *apa* terhubung, tidak tahu *mengapa* — selalu baca kode di file:baris
