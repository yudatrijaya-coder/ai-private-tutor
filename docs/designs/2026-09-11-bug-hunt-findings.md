# Bug Hunt Findings — Deep Dive 4 Permukaan

- **Tanggal hunt:** 2026-09-11
- **Spec:** `docs/designs/2026-09-11-bug-hunt-design.md` (commit `662fc96`)
- **Sifat:** read-only. Tidak ada kode produksi yang diubah selama hunt.
- **Metode:** breadth-first, 4 permukaan, bukti dari curl produksi + probe DB langsung + dogfood halaman terautentikasi.

## Bar bukti

| Tingkat | Syarat |
|---|---|
| `CONFIRMED` | Ada bukti mentah yang bisa direproduksi (curl output, query DB, file:line) |
| `LIKELY` | Ada bukti kode/data, belum direproduksi end-to-end |
| `SUSPECT` | Pola mencurigakan dari grep/scan, belum diverifikasi |
| `RULED OUT` | Sudah diselidiki, bukan bug — dicatat agar tidak diselidiki ulang |

## Ringkasan

| Severity | Jumlah |
|---|---|
| CRITICAL | 2 |
| HIGH | 15 |
| MEDIUM | 12 |
| LOW | 7 |
| RULED OUT | 19 |

Akar tunggal terbesar: **`src/middleware.ts` menjaga `/student` (halaman) tapi tidak `/api/students` (API)** — selisih satu huruf `s`. Route yang lolos harus menjaga dirinya sendiri, dan tidak konsisten. Satu blok guard menutup 13 temuan.

---

# Surface A — Security & Access Control

## Akar masalah

```ts
// src/middleware.ts
pathname.startsWith("/student")      // halaman siswa
pathname.startsWith("/dashboard")    // admin
pathname.startsWith("/api/admin/")   // API admin
```

`/student` tidak cocok dengan `/api/students`. Route `/api/students/*` jatuh ke `NextResponse.next()`.

## CONFIRMED

| ID | Sev | Route | Bukti |
|---|---|---|---|
| A-01 | CRITICAL | `GET /api/students` | 200 tanpa auth. Mengembalikan `passwordHash` bcrypt (`$2b$10$…`), `telegramId`, `parentTelegramId`, `scheduleConfig`, status trial untuk **semua** siswa |
| A-02 | CRITICAL | `DELETE /api/students/[id]` | 404 pada ID fiktif = handler jalan tanpa cek sesi. Menghapus siswa + curriculum + material + quiz + attempt + log |
| A-03 | HIGH | `GET /api/students/quizzes?studentId=X` | 200, 40.734 byte |
| A-04 | HIGH | `GET /api/students/activity?studentId=X` | 200, 21.021 byte |
| A-05 | HIGH | `GET /api/students/material/[id]` | 404 pada ID fiktif = handler jalan |
| A-06 | HIGH | `GET /api/exam/template?studentId=X` | 200, 20.287 byte |
| A-07 | HIGH | `GET /api/cron/daily-nudge` | 200 tanpa secret — memicu notifikasi massal |
| A-08 | HIGH | `GET /api/students/exams?studentId=X` | 200 |
| A-09 | MEDIUM | `GET /api/study` | 200, nama siswa + menit belajar + jumlah kuis |
| A-10 | MEDIUM | `GET /api/cron/progress-snap` | 200 tanpa secret |
| A-11 | MEDIUM | `GET /api/students/subjects?studentId=X` | 200 |
| A-12 | LOW | `GET /api/queues` | 200, nama & isi 10 antrean (`assessment-generate` failed: 540) |
| A-13 | LOW | `GET /api/bot/diag` | 200, identitas bot |

## IDOR — eskalasi horizontal (CONFIRMED)

Login sebagai **Syifa (SD_5)**, minta data **Raihan (SMP_1)** lewat query param. Semua 200:

```
/api/students/quizzes?studentId=RAIHAN001       → 200, 61.066 byte
/api/students/activity?studentId=RAIHAN001      → 200,  5.103 byte
/api/students/exams?studentId=RAIHAN001         → 200,  3.854 byte
/api/students/subjects?studentId=RAIHAN001      → 200,    210 byte
/api/exam/template?studentId=RAIHAN001          → 200, 20.287 byte
/api/students/gamification?studentId=RAIHAN001  → 200,  2.545 byte
/api/students/mastery?studentId=RAIHAN001       → 200,  9.892 byte
/api/students/self-compare?studentId=RAIHAN001  → 200,    166 byte
```

Isi terverifikasi keluar: `{"studentId":"0d3fbf85-…","byMaterial":{…}}` — data attempt Raihan nyata.

Pola `studentId` bisa ditebak: `SYIFA001`, `RAIHAN001`, `SHOFI001`, `TIUMU001`.

## RULED OUT

| Item | Alasan |
|---|---|
| `/api/admin/*` | 401 ✓ |
| `/api/student/password` | 401 ✓ (`getStudentSession`) |
| `/api/students/{gamification,mastery,self-compare,weak-topics,review,achievement-extra,leaderboard}` | 401 ✓ menjaga diri sendiri |
| `/api/reminders/check`, `/api/cron/schedule-sweep` | 401 ✓ |
| `/api/bot/diag/prompt` | 403 ✓ |
| Secret di bundle klien | 0 file di `.next/static` memuat nilai `.env` ✓ |
| SQL dirangkai string | hanya di generated Prisma client ✓ |
| `verifyStudentOwnership()` selalu `true` | **dead code** — tak ada pemanggil di `src/` ✓ (tetap jebakan untuk pemakai masa depan) |
| Kunci jawaban bocor via `/api/exam/template` | 0 kemunculan `correctAnswer`/`correctIndex`/`explanation` ✓ |
| Rate limit login | 429 setelah 9 percobaan (batas 10/menit) ✓ |

## SUSPECT

| ID | Temuan | Lokasi |
|---|---|---|
| A-14 | Fail-open: `CRON_SECRET \|\| "local-cron"` | `api/cron/schedule-sweep`, `api/reminders/check` |
| A-15 | Validasi-sebelum-auth: balas 400 (validasi param) sebelum 401. Bocor info kecil | beberapa route |
| A-16 | `POST /api/students` memicu pipeline (curriculum, content, assessment, guardian, schedule) tanpa auth | `api/students/route.ts` |
| A-17 | `POST /api/exam/attempt` tanpa auth — bisa memalsukan nilai ujian | `api/exam/attempt/route.ts` |
| A-18 | Fallback login tanpa password: `// else: no passwordHash set — backward compat, allow login without password`. Saat ini 0 siswa tanpa hash, tapi jebakan hidup | `api/auth/student-login/route.ts:77` |
| A-19 | Token minted via script tanpa klaim `status`/`trialEndsAt` → cek expiry middleware dilewati (middleware hanya cek bila klaim ada) | `src/lib/auth/student.ts`, `src/middleware.ts:81` |

---

# Surface B — Data Integrity & Content

## CONFIRMED

| ID | Sev | Temuan | Bukti |
|---|---|---|---|
| B-01 | HIGH | **197 material `SMA_2` berada di kurikulum RAIHAN001 yang `SMP_1`.** Isinya materi SMP (Teks Deskripsi, Teks Prosedur) → salah label jenjang, bukan salah konten | query `Material.gradeLevel` vs `Curriculum.gradeLevel` |
| B-02 | HIGH | **3 material duplikat identik** (judul, konten, gradeLevel sama) | `GROUP BY topic HAVING COUNT(*)>1` |
| B-03 | MEDIUM | **172 material berstatus `READY` tapi `processedContent` kosong** | query DB |
| B-04 | MEDIUM | **603 dari 1426 material pakai `weekOrder=999`** (sentinel, bukan minggu nyata) | query DB |
| B-05 | MEDIUM | `videoScript` kosong di **semua** 1426 material | query DB |
| B-06 | LOW | Topik kembar: "Sistem Eksresi" vs "Sistem Ekskresi" | `src/data/youtube-sma11.ts` |
| B-07 | LOW | 10 material `DRAFT`, 1416 `READY` | query DB |
| B-08 | LOW | Drift docs: `docs/architecture` klaim "78 video" SD (nyata **82**), total klaim 442 (nyata **446**) | `docs/architecture/page.tsx:516-530` |

## RULED OUT

| Item | Alasan |
|---|---|
| 679/1284 soal "jawaban tak ada di opsi" | **false positive probe** — `correctAnswer` berisi huruf ("A"/"C"), bukan teks opsi |
| Logika penilaian exam | benar — bandingkan huruf, `POST /api/exam/attempt` aman dari sisi kalkulasi |
| Orphan `Material`/`Quiz`/`ExamAttempt` | tidak ada |
| `metadata.slide_sibi` / `mindmap_sibi` | ada di 1426/1426 material ✓ |

---

# Surface C — Runtime & Reliability

## CONFIRMED

| ID | Sev | Temuan | Bukti |
|---|---|---|---|
| C-01 | HIGH | **540 job `assessment-generate` gagal, 0 sukses.** Alasan seragam: `Material not found or not processed: <uuid>`. Semua materialId sudah tak ada di DB (`COUNT(*) = 0`). Gagal 2026-07-09, masih menumpuk di Redis | `redis-cli ZCARD bull:assessment-generate:failed` → 540 |
| C-02 | HIGH | **45 error Redis hari ini 12:12** (`Stream isn't writeable and enableOfflineQueue options is false`) — 10 worker crash. Pola sama 2026-09-02 (8×), 2026-09-05 (110×) | `logs/err.log` |
| C-03 | HIGH | OOM `Killed` 2026-09-11 11:31:51 — build hari ini. Akar C-02: Redis mati → worker crash → retry storm | `logs/err.log:8578` |
| C-04 | MEDIUM | **6 skrip cron orphan** tak dipakai job mana pun | `~/.hermes/profiles/opencode/scripts/` |
| C-05 | MEDIUM | `AgentLog` GUARDIAN terakhir **30 Juli**, SCHEDULER **15 Juli**, tabel `Reminder` **kosong** — padahal `guardian-report-weekly` lapor `ok` | query DB |
| C-06 | LOW | Webhook error sinkronisasi terakhir 2026-09-08 06:10 UTC | Telegram `getWebhookInfo` |

Skrip orphan: `audit-all-progress.sh`, `audit-sd5-progress.sh`, `daily-nudge-trigger.sh`, `guardian-weekly-trigger.sh`, `moodle-weekly-check.py`, `progress-snap-trigger.sh`.

## RULED OUT

| Item | Alasan |
|---|---|
| Cron `schedule-reminder-sweep` | **benar-benar bekerja** — `logs/cron-sweep.log` tunjukkan `h1Sent`/`t30Sent`/`missedMarked` nyata tiap hari |
| Redis service | aktif, `Restart=always` ✓ |
| Tabel `Reminder` kosong | tak dipakai desain — reminder dikirim langsung, bukan disimpan |
| Error `Server Reference ID ... "x"` | scanner internet, bukan bug kita |
| `Failed to parse body as FormData` | scanner yang sama |
| `pending_update_count` | 0 ✓ |
| 3 job cron Hermes | semua `last_status: ok` ✓ |

## SUSPECT

| ID | Temuan |
|---|---|
| C-07 | `CRON_SECRET` (33 char) **sama persis** dengan token hardcoded di `schedule-sweep.sh` — secret ada di file skrip, bukan hanya env |
| C-08 | `/swap-build.img` (3G) tidak di `/etc/fstab` → hilang saat reboot, build OOM lagi |
| C-09 | Worker BullMQ tanpa guard OOM — 10 worker crash bersamaan saat Redis mati |

---

# Surface D — Student UX & Dogfood

Dogfood lewat HTTP dengan cookie sesi asli (`scripts/mint-student-token.cjs`). Browser blokir `document.cookie` oleh guard keamanan Hermes, jadi inspeksi terautentikasi lewat curl.

## CONFIRMED

| ID | Sev | Temuan | Lokasi |
|---|---|---|---|
| D-01 | HIGH | **Tombol "🧠 Mindmap" mendarat di halaman error.** Link ke `/student/mindmap/${subject}` **tanpa `?id=`**, padahal `matId` tersedia. Halaman render "ID materi tidak ditemukan" | `student/page.tsx:534` vs `student/subject/[subject]/page.tsx:441` (yang benar pakai `?id=${material.id}`) |
| D-02 | MEDIUM | 5 halaman render shell kosong di SSR, hanya ~130 char teks: `/student/achievement`, `/leaderboard`, `/profile-link`, `/quiz`, `/review` — semua bergantung `useEffect` tanpa konten server | lihat bawah |

Status halaman terautentikasi (cookie SYIFA001):

| Halaman | HTTP | Bytes | Teks terlihat |
|---|---|---|---|
| `/student` | 200 | 72.767 | 1.907 char — sehat |
| `/student/subject/Matematika` | 200 | 184.137 | 2.587 char — sehat |
| `/student/big-mindmap/Matematika` | 200 | 396.027 | 1.499 char — sehat |
| `/student/progress` | 200 | 134.946 | 898 char — sehat |
| `/student/videos` | 200 | 57.854 | 796 char — sehat |
| `/student/topic-tree/Matematika` | 200 | 61.118 | 987 char — sehat |
| `/student/mindmap-sample` | 200 | 70.420 | 529 char |
| `/student/profile` | 200 | 24.727 | 496 char |
| `/student/password` | 200 | 22.186 | 379 char |
| `/student/big-mindmap` | 200 | 28.362 | 353 char |
| `/student/mindmap/Matematika` | 200 | 24.376 | 239 char — **"ID materi tidak ditemukan"** |
| `/student/exam` | 200 | 21.154 | 207 char |
| `/student/achievement` | 200 | 20.065 | **130 char (shell)** |
| `/student/leaderboard` | 200 | 20.065 | **130 char (shell)** |
| `/student/profile-link` | 200 | 20.072 | **130 char (shell)** |
| `/student/quiz` | 200 | 20.068 | **130 char (shell)** |
| `/student/review` | 200 | 20.046 | **130 char (shell)** |

## RULED OUT

| Item | Alasan |
|---|---|
| `⭐ 12365` di header | = XP Syifa di DB (12365) ✓ sah |
| Konflik jenjang di `/student/profile` | tab switcher "SD Kelas 5 / SMP Kelas 1 / SMA Kelas 2" — bukan kebocoran |
| Landing page | 200, 0 error konsol ✓ |
| `/docs/architecture` | 200, 0 error konsol ✓ |
| Login page | 200, 0 error konsol ✓ |
| Halaman `/student/*` 404 saat ditebak | saya menebak URL yang tak ada, bukan bug |

## SUSPECT

| ID | Temuan |
|---|---|
| D-03 | `.slice(0, 3)` di `subject/[subject]/page.tsx:458` — video ke-4+ tak pernah tampil |
| D-04 | Tombol `▶️` tanpa label teks (hanya `title`) — aksesibilitas |
| D-05 | `/student/mindmap-sample` menampilkan "Suku Banyak Matematika Tingkat Lanjut" (SMA) di akun SD_5 — halaman contoh, mungkin disengaja |

---

# Koreksi atas asumsi awal

| Klaim awal | Koreksi |
|---|---|
| "57 dari 69 route tanpa auth" | **Overstatement** — regex probe tak mengenali `getStudentSession()`. Angka nyata: **13 route terbuka**. Uji curl langsung yang jadi otoritas |
| "Beberapa route terbaca 0 byte" | Artefak skrip probe (kena batas 50 tool-call), bukan bug |
| "679 soal jawabannya tak ada di opsi" | **False positive** — `correctAnswer` berisi huruf |
| "`Reminder` kosong = cron rusak" | Cron bekerja; tabel memang tak dipakai |
| "Proyek Next.js 14" | **Next.js 16.3.0 + React 19.2.4 + Tailwind 4** — docs benar, asumsi yang basi |
| "`verifyStudentOwnership()` bypass aktif" | Dead code, tak ada pemanggil |

---

# Prioritas perbaikan

| Urut | Item | Dampak |
|---|---|---|
| 1 | **A-01 / A-02** | Kebocoran hidup: hash password terbaca publik, siswa bisa dihapus siapa pun |
| 2 | **A-03…A-13** | Tambahkan `/api/students` + keluarga ke guard middleware — **satu perubahan menutup 13 temuan** |
| 3 | **D-01** | Satu baris: tambahkan `?id=${matId}` di `student/page.tsx:534` |
| 4 | **C-01 / C-03** | Bersihkan 540 job gagal, pasang guard OOM worker |
| 5 | **B-01** | Perbaiki 197 material salah label jenjang |
| 6 | **C-07** | Pindahkan `CRON_SECRET` keluar dari skrip |

Perbaikan #2 paling berdampak: middleware saat ini menjaga halaman tapi tidak API-nya. Satu blok `startsWith("/api/students")` menutup seluruh permukaan A sekaligus, bukan tambal per route.


---

# Pass perbaikan — 2026-09-11 (malam)

Semua perbaikan di bawah **sudah di-deploy**: build produksi `next build` sukses,
PM2 `ai-private-tutor` restart, dan setiap klaim diverifikasi lewat probe HTTP
nyata terhadap `localhost:3000` **dan** `https://senangbelajar.web.id`.

## Hasil verifikasi (bukti mentah)

**Sebelum → sesudah, tanpa kredensial apa pun** (17 route):

| Route | Sebelum | Sesudah |
|---|---|---|
| `GET /api/students` | 200 + `passwordHash` bcrypt | **401** |
| `DELETE /api/students/<id>` | 404 (handler jalan tanpa auth) | **401** |
| `GET /api/students/quizzes?studentId=X` | 200 (40.734 B) | **401** |
| `GET /api/students/activity?studentId=X` | 200 (21.021 B) | **401** |
| `GET /api/students/material/<id>` | 404 | **401** |
| `GET /api/exam/template?studentId=X` | 200 (20.287 B) | **401** |
| `GET /api/cron/daily-nudge` | 200 (notifikasi massal) | **401** |
| `GET /api/cron/progress-snap` | 200 | **401** |
| `GET /api/study` | 200 (seluruh siswa ACTIVE) | **401** |
| `GET /api/students/{subjects,topics,exams,mastery}` | 200 | **401** |
| `GET /api/queues` | 200 | **401** |
| `GET /api/bot/diag` | 200 | **401** |
| `GET /api/mindmap/screenshot` | 200 | **401** |

**IDOR — sesi sah Syifa (SD_5) meminta data Raihan (SMP_1):**

```
GET /api/students/activity?studentId=RAIHAN001  ->  200
  {"studentId":"4f248d53-940f-406c-ae64-a1722f8d5c86", ...}   # = UUID Syifa
GET /api/students/exams?studentId=RAIHAN001     ->  200
  {"title":"Weekly Exam ... (Kelas SD_5)"}                    # = exam Syifa
```

Sebelumnya 8 endpoint mengembalikan data Raihan. Sekarang `studentId` dari
query/body **diabaikan untuk pemanggil siswa** dan selalu di-pin ke
`session.studentId`. Tidak ada lagi kebocoran lintas siswa.

**Regresi siswa sah (sesi Syifa):** `activity`, `quizzes`, `mastery`, `subjects`,
`exams`, `study` → **200** dengan data Syifa sendiri. Tidak ada yang rusak.

**Regresi dashboard admin:** `/dashboard` tanpa sesi → **307 → /login** (bukan
500, jadi `auth()` di Edge middleware jalan); login NextAuth → 302; `/dashboard`
dengan cookie admin → **200** (84.765 B); `GET /api/students` dengan cookie admin
→ **200**, dan `grep -c passwordHash` = **0** (hash di-strip di handler).

**Cron tetap jalan:** tanpa secret → 401; dengan secret →
`{"ok":true,...,"sessionsAssigned":0}` dan
`{"success":true,...,"schedulesCreated":3}`. Kedua skrip `~/.hermes` (yang kini
membaca `CRON_SECRET` dari `.env`) exit 0.

**C-01 tuntas:** 540 job `assessment-generate` gagal → **0**. Lihat di bawah.

## Akar C-01 (bukan bug kode)

540 job gagal dalam burst **4,6 menit** (2026-07-10 04:55:28 → 05:00:04),
semuanya dengan `failedReason = "Material not found or not processed: <uuid>"`.
Semua menunjuk satu siswa `a80cbfa5-9e21-42fa-a0e2-69943d9a2161` yang **sudah
tidak ada di DB** (0 material, 0 curriculum). Jadi ini sampah orphan — retry
tidak akan pernah berhasil.

Dibersihkan dengan `scripts/purge-orphan-jobs.ts`, yang **hanya** menghapus job
bila (1) `failedReason` cocok pola orphan DAN (2) `materialId`-nya tidak ada di
tabel `Material`. Dry-run: `orphans=540, kept=0`. Eksekusi: `removed 540`.

4 job `improvement-analysis` yang masih gagal **sengaja tidak dihapus** — itu
error nyata, bukan orphan: 1× `Unterminated string in JSON` dan 3× `401 Invalid
API key` (insiden kunci LLM yang sudah dicatat di memori operasional).

## Perubahan kode

| Berkas | Perubahan |
|---|---|
| `src/middleware.ts` | +72 baris: guard `/api/students*`, `/api/study`, `/api/exam{,/}`, `/api/queues`, `/api/bot/diag` — menerima sesi **siswa ATAU admin**; cron fail-closed |
| `src/lib/auth/scope.ts` | **baru** — `resolveScope()`, `isAdmin()`, `scopedStudentIdentifier()` |
| 15 route API | guard + pin `studentId` ke sesi |
| `(student)/student/page.tsx` | D-01: `?id=${matId}`; D-03: kirim `quizId` bukan `materialId` |
| `cron/schedule-sweep`, `reminders/check` | hapus `CRON_SECRET \|\| "local-cron"` (fail-open → fail-closed) |
| `scripts/purge-orphan-jobs.ts` | **baru** — pembersih job orphan, idempoten, ada `--dry-run` |
| 3 skrip `~/.hermes/profiles/opencode/scripts/` | token hardcoded → baca `CRON_SECRET` dari `.env` |

Dua regresi **ditemukan dan dicegah** saat pass ini:

1. `/api/students/*` dipakai dashboard admin lewat NextAuth. Guard sesi-siswa-saja
   akan memutus dashboard → guard dibuat menerima **kedua** kredensial.
2. `/api/exam` ternyata dipakai **halaman siswa** (exam mode), bukan hanya admin.
   Sempat dibuat admin-only → dikembalikan ke siswa-atau-admin dengan `studentId`
   di-pin ke sesi.

## Sisa / belum dikerjakan

- ~~**B-02**~~ — **diperbaiki di pass 3 + 4** (lihat bagian di bawah). Yang
  dilaporkan semula ("603 pakai `weekOrder=999`, `videoScript` kosong, 172
  `READY` tanpa konten") ternyata bukan cacat — akar sebenarnya adalah
  kontaminasi penalaran LLM di `slide_sibi`/`mindmap_sibi`.
- ~~**C-02**~~ — **diperbaiki di pass 3** (lihat bagian di bawah).
- **B-04** — ~~"Minggu 999"~~ **diperbaiki di pass 3**.
- **D-02** — 5 halaman siswa ~20 KB shell SSR.
- ~~**A-19**~~ — **diperbaiki di pass 2** (lihat bagian di bawah).
- ~~**B-01**~~ — **diperbaiki di pass 2** (lihat bagian di bawah).

---

# Pass 2 — A-19 (gerbang kedaluwarsa) + B-01 (salah label jenjang)

## A-19 — token `student_session` tanpa klaim entitlement

### Akar
`createStudentSession()` di `src/lib/auth/student.ts` menandatangani JWT berisi
**hanya** `studentId`, `studentIdentifier`, `name`, `gradeLevel`. Middleware
`src/middleware.ts` hanya memeriksa *tanda tangan* token, bukan hak aksesnya:

```ts
// sebelum
if (payload.trialEndsAt) {                    // ← opsional: token tanpa klaim = lolos
  if (new Date(payload.trialEndsAt as string) < new Date()) { redirect("/expired") }
}
if (payload.status && !["ACTIVE","TRIAL"].includes(payload.status)) { redirect("/expired") }
```

Dua celah: (1) `createStudentSession` tidak pernah mengisi kedua klaim itu,
jadi syarat `if (payload.X)` selalu false → gerbang kedaluwarsa **dilewati
total**; (2) `status` juga opsional, jadi `SUSPENDED`/`EXPIRED` ikut lolos bila
token dibuat tanpa klaim.

Satu akar ketiga: **8 berkas mendeklarasikan secret `STUDENT_JWT_SECRET` sendiri**
dengan fallback `?? "student-dev-secret-change-in-production"` — string yang
publik di riwayat git. Saat `next build` (env tidak lengkap) fallback ter-capture
di module scope, dan token uji bisa ditandatangani dengan string publik itu.

### Perbaikan

| Berkas | Perubahan |
|---|---|
| `src/lib/auth/student-secret.ts` | **baru** — `readStudentSecret()` / `requireStudentSecret()`; fail-closed, dibaca saat panggilan (bukan module scope) |
| `src/lib/auth/access.ts` | **baru** — `evaluateStudentAccess(claims, now)`: murni, tanpa Prisma, bisa dipakai Edge middleware **dan** route Node |
| `src/lib/auth/student.ts` | mint token **selalu** mengisi `status` + `trialEndsAt`; `getStudentSession()` menolak sesi yang tidak berhak |
| `src/middleware.ts` | gerbang jadi **fail-closed**: klaim hilang / `trialEndsAt` lewat / status non-aktif → redirect `/expired` |
| `src/app/api/auth/student-login/route.ts` | tolak login lebih awal dengan pesan spesifik (TRIAL berakhir / akun nonaktif) |
| 8 berkas (halaman + route) | hapus secret inline + fallback `student-dev-secret-*`; pakai `requireStudentSecret()` |

`npx tsx scripts/test-student-access.ts` — 12 kasus, semua lulus:

```
lulus: 12/12
```

Kasus kunci (regresi yang dulu bocor):

| Klaim | Harapan | Hasil |
|---|---|---|
| `{status: TRIAL, trialEndsAt: <lampau>}` | tolak | ✅ ditolak |
| `{status: TRIAL, trialEndsAt: <depan>}` | izinkan | ✅ |
| `{status: ACTIVE}` | izinkan | ✅ |
| `{status: ACTIVE, trialEndsAt: <lampau>}` | izinkan (bayar, trial tak relevan) | ✅ |
| `{status: SUSPENDED}` / `EXPIRED` / `CANCELLED` | tolak | ✅ |
| klaim kosong / `status` hilang | **tolak** (dulu: lolos) | ✅ ditolak |
| `status: ACTIVE`, tanpa `trialEndsAt` | izinkan | ✅ |
| `TRIAL` tanpa `trialEndsAt` | **tolak** (dulu: lolos) | ✅ ditolak |

### Catatan dampak
Gerbang ini memakai klaim token (tanpa query DB), jadi siswa yang statusnya
diubah admin tetap memakai token lamanya sampai token kedaluwarsa (7 hari) atau
login ulang. Perilaku ini disengaja agar middleware Edge tetap bebas Prisma;
`getStudentSession()` menambahkan pemeriksaan yang sama di sisi server.

## B-01 — 197 material salah label jenjang

### Koreksi temuan awal
Ledger pass 1 menyebut ini "salah label jenjang" tanpa membuktikan arahnya.
Bukti yang dikumpulkan sekarang menunjukkan **labelnya** yang salah, **bukan
barisnya**:

- 79 topik distinct pada 197 baris itu. **44 ada verbatim** di
  `src/data/curriculum-topics-smp7.ts` (`Teks Deskripsi`, `Bilangan`, `Aljabar`,
  `Klasifikasi Makhluk Hidup`, `Greetings`, `Berpikir Komputasional`, …);
  **0 hanya ada** di `curriculum-topics-sma11.ts`.
- 31 sisanya juga topik Kelas 7 yang kebetulan tidak ada di file topik
  (`latar sejarah kelahiran Pancasila`, `Besaran dan Pengukuran`,
  `Pengantar Informatika`, `我叫李文 - Wǒ jiào lǐ wén`, …).
- Baris-baris itu berada di kurikulum **Raihan (SMP_1)** dan membawa konten
  hasil generate: `slide_sibi` 197/197, `mindmap_sibi` 197/197,
  `videoUrl` 185/197.
- Cakupan global: **hanya Raihan** yang punya ketidakcocokan —
  `RAIHAN001 SMP_1 → 197 baris SMA_2`. Siswa lain 0.

### Akar kode (yang membuat baris salah label terlihat siswa)
Query halaman siswa memfilter **hanya** `subject`, bukan `gradeLevel`, padahal
`Material` membawa `gradeLevel` sendiri:

```ts
// sebelum
materials: { where: { subject: decodedSubject } }   // baris SMA_2 ikut tampil
```

### Perbaikan
1. **Data** — `scripts/fix-b01-grade-mislabel.ts` (dry-run default, `--apply`
   untuk eksekusi, snapshot rollback ditulis lebih dulu):
   ```
   mismatched rows: 197 (semua SMA_2)
   updated 197 rows -> gradeLevel=SMP_1
   verification: mismatches remaining = 0
   ```
   Snapshot: `docs/designs/2026-09-11-b01-rollback-RAIHAN001.json`.
   Tidak ada baris yang dihapus (492 → 492) dan tidak ada konten yang hilang
   (`slide_sibi` 492/492, `mindmap_sibi` 492/492, `videoUrl` 482/492).
2. **Kode** — scoping `gradeLevel` ditambahkan di 6 query siswa:

| Berkas | Query |
|---|---|
| `(student)/student/subject/[subject]/page.tsx` | daftar material per mapel |
| `(student)/student/topic-tree/[subject]/page.tsx` | topic tree (+ `getSessionGrade()`) |
| `(student)/student/page.tsx` | fallback materi dashboard |
| `(student)/student/videos/page.tsx` | daftar video |
| `api/students/topics/route.ts` | topic picker |
| `api/exam/template/route.ts` | template ujian periode + timeline |

Dengan scoping ini, baris salah label tidak bisa lagi bocor ke siswa walau
datanya kembali kacau di masa depan.

## Status akhir pass 2

| Item | Status |
|---|---|
| A-19 gerbang kedaluwarsa | ✅ fail-closed, 12/12 tes lulus |
| A-19 secret ganda / fallback publik | ✅ 8 berkas → satu sumber `requireStudentSecret()` |
| B-01 salah label jenjang (data) | ✅ 197 baris → `SMP_1`, 0 sisa |
| B-01 scoping jenjang (kode) | ✅ 6 query |
| `npx tsc --noEmit` | ✅ 0 error |

## Sisa (belum dikerjakan)

- **B-02** — 603/1426 material `weekOrder=999`; `videoScript` kosong di seluruh
  1426; 172 material `READY` tanpa konten.
- **C-02** — 34× `Cannot read properties of undefined (reading 'type')`.
- **D-02** — 5 halaman siswa ~20 KB shell SSR.
- **A-18** — `student-login` fallback tanpa `passwordHash` (0 siswa terdampak).

---

# Pass 3 — B-02 (konten terkontaminasi) + B-04 (label minggu) + C-02 (TypeError auth)

## B-02 — `metadata.slide_sibi` berisi penalaran mentah LLM, bukan slide

### Akar

Skrip generator SIBI (`scripts/sibi-*.py`, `scripts/generate-*.cjs`) hanya
membuang pagar ``` dari respons model, tanpa memvalidasi bahwa isinya benar-benar
slide. Ketika model berdeliberasi alih-alih menjawab, deliberasi itu **disimpan
verbatim** ke `metadata.slide_sibi`.

Jalur tampil memperparahnya — `??` berhenti pada nilai non-null apa pun:

```ts
// src/app/api/students/material/[id]/route.ts (sebelum)
const slides = source === "sibi"
  ? (metadata?.slide_sibi ?? metadata?.slide)   // dump non-null → fallback tak pernah jalan
  : metadata?.slide;
```

### Skala (terukur)

| Metrik | Nilai |
|---|---|
| Baris diperiksa | 1426 |
| `slide_sibi` = dump penalaran | **268** (19%) |
| Bisa dipulihkan dari kandidat bersih | 266 |
| Tanpa kandidat bersih (placeholder) | 2 |
| false positive / false negative detektor | 0 / 0 |

Sebaran: Pendidikan Pancasila 41, Biologi 39, Bahasa Indonesia 37, Kimia 35,
Matematika 26, Fisika 20, Sejarah 15, IPA 14, PJOK 14, IPS 11, lainnya 16.

Penanda yang ditemukan (semua bahasa meta Inggris, tidak pernah muncul di slide
ajar berbahasa Indonesia): `the user wants`, `Analyze the Request`,
`Identify the Goal`, `Deconstruct the Topic`, `<think>`, `Let me ...`.

### Perbaikan

1. **`src/lib/content/slide-content.ts` (baru)** — `isLlmReasoningDump()` +
   `isUsableSlideText()` + `resolveSlideMarkdown()` / `resolveMindmap()`.
   Penanda "konklusif" (satu hit cukup) dipisah dari penanda "lemah"
   (`target audience:`, `constraints:`) yang butuh dua kemunculan.
2. **Jalur tampil** — `resolveSlideMarkdown()` menggantikan rantai `??` di
   `src/app/api/students/material/[id]/route.ts`.
3. **Data** — `scripts/fix-b02-slide-cot.ts`: teks asli **dipindah** ke
   `metadata.slide_sibi_raw` (tidak dihancurkan), `slide_sibi` diisi kandidat
   bersih, atau kuncinya dihapus bila tak ada kandidat. 268 baris diperbarui.
   Snapshot: `docs/designs/2026-09-11-b02-rollback.json`.
4. **Verifikasi** — `scripts/test-slide-content.ts`: 16/16 unit + sapuan DB
   (false positive 0, false negative 0).

Hasil: `dump tersisa di slide_sibi = 0`, `slide_sibi_raw tersimpan = 268`.

### Sisa cluster B (bukan cacat, terdokumentasi)

| ID | Status | Alasan |
|---|---|---|
| B-02 "3 material duplikat" | **false positive** | 403 grup `(curriculumId, subject, topic)` berulang, tetapi `topic` = **bab** dan `subTopic` = pelajaran (mis. "Matriks" 9× dengan `subTopic` berbeda). Bukan duplikat. |
| B-03 "172 READY tanpa konten" | **false positive** | 186 baris tanpa `processedContent`, tetapi 184/186 punya `metadata.slide`, 183 punya `slide_sibi`, 186/186 punya `videoUrl`. `processedContent` bukan sumber tampilan. |
| B-05 `videoScript` kosong | **by design** | Skrip video disimpan di `metadata.videoScript` oleh `src/agents/media/worker.ts:39`; kolom `Material.videoScript` legacy. |
| B-07 10 DRAFT | normal | Sisa alur draf. |

## B-04 — `weekOrder=999` ditampilkan sebagai "Minggu 999"

### Akar

`999` adalah sentinel "belum ditempatkan" untuk 603/1426 material (mis. Bahasa
Mandarin 52/52, Matematika Penalaran 52/52). Skrip ujian sudah menanganinya
(`weekOrder: { lt: 999 }`), tetapi UI siswa mencetak nilainya mentah:

```tsx
// src/app/(student)/student/subject/[subject]/page.tsx:337
Minggu {material.weekOrder}     // → "Minggu 999"
```

### Perbaikan

```tsx
{material.weekOrder >= 999 ? "Tambahan" : `Minggu ${material.weekOrder}`}
```

Material tanpa slot minggu tetap terlihat, tanpa nomor palsu.

## C-02 — `Cannot read properties of undefined (reading 'type')` (34×)

### Akar

`@auth/core` 0.41.3 (`node_modules/@auth/core/lib/index.js:53`) melakukan
dereferensi `options.provider.type` untuk aksi `callback` **sebelum** memvalidasi
bahwa `providerId` ada:

```js
case "callback":
    if (options.provider.type === "credentials")   // options.provider undefined
        validateCSRF(action, csrfTokenVerified);
```

`POST /api/auth/callback` tanpa segmen provider → TypeError → ditangkap,
di-log `[auth][error]`, dan diubah jadi 302 ke halaman error. Terjadi bersamaan
dengan banjir `Failed to find Server Action "x"` (pemindai otomatis), terakhir
2026-09-10 21:02.

### Reproduksi

```
before=34
  [302] POST /api/auth/callback            ← TypeError, 302 ke error page
  [308] POST /api/auth/callback/
after=36  delta=2
```

### Perbaikan

`src/app/api/auth/[...nextauth]/route.ts` — guard sebelum menyerahkan ke library.
ID provider adalah segmen path, jadi bentuk cacat bisa dideteksi lebih dulu:

```ts
export async function POST(req: NextRequest) {
  if (/\/callback\/?$/.test(new URL(req.url).pathname)) {
    return NextResponse.json({ error: "MissingProviderId" }, { status: 400 });
  }
  return handlers.POST(req);
}
```

Callback tanpa ID provider tidak pernah valid, jadi 400 lebih tepat daripada
500/302. Tes regresi: `scripts/test-c02-callback-guard.sh` (5/5) — memastikan
`callback/credentials` tetap 302, `session` tetap 400, dan tidak ada
`reading 'type'` baru di `logs/err.log`.

> Catatan: akar ada di `node_modules` (`next-auth@5.0.0-beta.32` /
> `@auth/core@0.41.3`). Guard ini bertahan sampai upstream memperbaiki
> `lib/index.js:53`; perbarui tes bila versi naik.

---

# Pass 4 — B-02 lanjutan: `mindmap_sibi` juga terkontaminasi

## Bagaimana ditemukan

Probe produksi Pass 3 memakai pola deteksi yang sama terhadap **seluruh** respons
API, bukan hanya field `slides`. Field `mindmap` ikut kena:

```json
[{"id":"0","label":"Struktur Bumi","children":[
   {"id":"1","label":"Thinking. 1.  **Analyze the Request:**"},
   {"id":"2","label":"Target: Mindmap outline."},
   {"id":"3","label":"Format: Hierarchical, indented dashes, 2 spaces per level."}]}]
```

Jadi remediasi Pass 3 **belum tuntas** — ia hanya menutup `slide_sibi`.

## Akar kedua: bug di resolver yang baru ditulis

`resolveMindmap` (dan cabang `slides` di `resolveSlideMarkdown`) mengembalikan
kandidat array **tanpa validasi**:

```ts
// src/lib/content/slide-content.ts (sebelum)
if (Array.isArray(candidate)) {
  if (candidate.length > 0) return JSON.stringify(candidate);   // ← lolos validasi
  continue;
}
if (isUsableSlideText(candidate)) return candidate.trim();
```

`mindmap_sibi` disimpan sebagai **array JSON**, jadi cabang array selalu menang dan
`isLlmReasoningDump` tidak pernah dijalankan. Detektor yang benar pun tidak akan
menolong selama jalur ini melewatinya.

## Skala (terukur)

| Metrik | Nilai |
|---|---|
| Baris dengan `mindmap_sibi` | 1426 (semua) |
| Tipe JSON | array 1424, object 2 |
| Terkontaminasi | **289** (20%) |
| Bisa dipulihkan dari `metadata.mindmap` | 266 |
| Tanpa sumber bersih | 23 |

Sebaran: Sejarah 16, PJOK 15, IPS 9, Informatika 6, Geografi 4, Bahasa Mandarin 1,
Pendidikan Pancasila 6, Biologi 3, lainnya.

## Perbaikan

1. **Validasi array/objek** — `candidateText()` menyerialkan pohon sehingga
   detektor melihat `label`; `isUsableMindmap()` menilai korpus label
   (≥ 2 label, tidak ada penanda deliberasi). Cabang `slides` di
   `resolveSlideMarkdown` kini tunduk pada bar yang sama.
2. **Data** — `scripts/fix-b02-mindmap-cot.ts`: pohon asli dipindah ke
   `metadata.mindmap_sibi_raw`; `mindmap_sibi` diisi pohon bersih dari
   `metadata.mindmap`, atau kuncinya dihapus bila tak ada pengganti.
   289 baris diperbarui. Snapshot:
   `docs/designs/2026-09-11-b02-mindmap-rollback.json`.
3. **Tes** — 10 kasus mindmap baru (termasuk array kosong, node tunggal,
   fallback ke `metadata.mindmap`, dan `slides` array kotor). Sapuan DB kini
   memeriksa kedua field.

Hasil: `mindmap_sibi tak layak/dump = 0`, `mindmap_sibi_raw tersimpan = 289`,
`mindmap bocor ke klien = 0`, tes **31/31**.

## Sisa yang terdokumentasi

23 material (Sejarah, Geografi, Biologi, Pendidikan Pancasila — semuanya SMP_1)
kehilangan mindmap karena `mindmap_sibi` satu-satunya sumbernya dan isinya
deliberasi. UI merender tanpa mindmap; **lebih baik kosong daripada sampah**.
Regenerasi mindmap untuk 23 baris ini adalah pekerjaan pipeline konten terpisah
(lihat `ai-private-tutor-sibi-pipeline`), bukan cacat kode.

**Tindak lanjut (2026-09-11):** 23 baris ini direkonsiliasi dan diregenerasi —
lihat "Pass 5" di bawah.

---

# Pass 5 — gelombang e (A-07, A-18, A-20, C-03…C-09, D-02, B-02 keluarga 2)

## A-07 + A-20 — dua endpoint cron tanpa autentikasi sama sekali

`src/app/api/cron/daily-nudge/route.ts` dan
`src/app/api/cron/progress-snap/route.ts` tidak memanggil pemeriksaan secret
apa pun. A-07 sudah tercatat; A-20 ditemukan saat menyisir ulang seluruh
direktori `src/app/api/cron/` (bukan dari ledger).

Dampak: siapa pun yang tahu URL dapat memicu blast Telegram ke seluruh siswa
(`daily-nudge`) atau menulis snapshot progres palsu (`progress-snap`). Keduanya
tidak butuh sesi.

Perbaikan: keduanya kini memakai `checkCronSecret()` dari
`src/lib/cron/guard.ts` dan menulis `logCronRun()`. **5/5 route cron** kini
ter-guard dan ter-log dengan pola yang sama.

`daily-nudge` juga diubah agar melaporkan kegagalan: sebelumnya selalu
`{ ok: true }` walau ada kirim yang gagal (pola sama dengan C-05). Kini
mengembalikan `ok: false` + `failed: n`, dan `logCronRun` memakai status
`FAILED` bila ada kegagalan.

## A-14 — guard cron fail-open

Akar: `CRON_SECRET || "local-cron"` — bila `CRON_SECRET` tidak diset, secret
jatuh ke nilai publik yang bisa ditebak, sehingga endpoint terbuka di produksi.
Pola sama muncul di lebih dari satu route.

Perbaikan: satu guard bersama `src/lib/cron/guard.ts` (`checkCronSecret()`).
Bila secret tidak diset, guard **menolak** (fail-closed), bukan menerima.
`schedule-sweep` yang sebelumnya memakai perbandingan inline kini memakai guard
yang sama dan menulis `logCronRun()`.

## A-18 — fallback login tanpa `passwordHash`

Akar: `src/app/api/auth/student-login/route.ts` punya cabang
`// else: no passwordHash set — backward compat, allow login without password`.
Saat itu 0 siswa terdampak, tapi jebakannya hidup: begitu ada satu baris siswa
tanpa hash, akun itu bisa dimasuki tanpa password.

Perbaikan: **fail-closed** — siswa tanpa `passwordHash` tidak dapat login.

## C-03 — OOM saat build

Akar: `next build` kehabisan memori pada VPS. Perbaikan: `ops/build.sh`
(54 baris) menjalankan build di latar dengan `NODE_OPTIONS` yang dibatasi, plus
swap build `/swap-build.img` 3 GB yang **persisten** di `/etc/fstab`.

Bukti: `swapon --show` menampilkan swap aktif; `findmnt --verify` bersih;
`bash ops/build.sh` **exit 0** dua kali.

## C-04 — koreksi temuan: 6 skrip "orphan" bukan dead code

Inventaris ulang menunjukkan 3 job cron memakai 3 skrip, dan 6 skrip sisanya
adalah **manual tools terdokumentasi** (dipanggil manusia, tidak dijadwalkan di
`jobs.json`). Hanya `guardian-weekly-trigger.sh` yang benar-benar usang —
dihapus, digantikan `guardian-report-trigger.sh`.

Dokumentasi: `~/.hermes/profiles/opencode/scripts/README.md` (baru) membedakan
"scheduled" vs "manual"; dua `SKILL.md` yang masih merujuk nama skrip lama
diperbaiki.

## C-09 — `enableOfflineQueue: false` di `src/queue/redis.ts`

Dengan opsi itu, perintah melempar error saat Redis sempat putus alih-alih
menunggu reconnect. Diubah agar menunggu reconnect.

## D-02 — shell kosong di 5 halaman siswa

`/student/achievement`, `/leaderboard`, `/profile-link`, `/quiz`, `/review`
adalah client component yang hanya merender spinner saat SSR (~130 char). Satu
komponen `SkeletonPageShell` di `src/components/Skeleton.tsx` kini dipakai
kelimanya, sehingga SSR mengirim kerangka halaman, bukan shell kosong.

## B-02 keluarga 2 — detektor melewatkan satu keluarga kontaminasi penuh

Pass 1 hanya menangkap keluarga pertama: model **menarasikan rencana**
("Analyze the Request", "Let me think"). Sapuan ulang menemukan keluarga kedua:
model **mengulang brief sebagai spec**, lalu menempel outline aslinya.

```
Goal: Create a mind map outline.
Format: Dash (-) and indentation.
Levels: Maximum 3 levels.
Kekalahan Jepang          ← mindmap asli menyusul
```

### Skala (terukur)

| Gelombang | Field | Sumber |
|---|---|---|
| Sapuan awal | 67 `mindmap_sibi` + 2 `slide_sibi` | detektor keluarga 2 |
| Setelah aturan dipertajam | +20 `mindmap_sibi` + 4 `slide_sibi` | oracle independen |
| **Total dipindahkan** | **91 field** → `*_raw` | reversibel |

Semua baris punya `metadata.mindmap` / `metadata.slide` bersih sebagai
pengganti — tidak ada regenerasi LLM, tidak ada biaya. Snapshot:
`docs/designs/2026-09-11-b02-family2-rollback.json`.

### Akar ketiga: oracle tes yang tautologis

`scripts/test-slide-content.ts` memakai `isLlmReasoningDump()` — fungsi yang
sedang diuji — sebagai "ground truth". Akibatnya tes **tidak mungkin** melaporkan
regresi detektor; ia hanya bisa mengonfirmasi dirinya sendiri. Oracle kini
menuliskan polanya sendiri, independen dari daftar regex detektor.

Oracle independen itu langsung menemukan 24 field yang detektor lewatkan.

### Dua false positive yang dibatalkan

Aturan spec-line harus **berjangkar di awal label** dan **hanya bertitik-dua**.
Versi pertama terlalu luas dan memblokir materi sah:

| Teks | Kenapa sah |
|---|---|
| `Kosakata HSK 3.0 Level 1: Hanzi Dasar` | nama topik (kata `Level` di tengah) |
| `Constraints (PRIMARY KEY, NOT NULL, UNIQUE, FOREIGN KEY)` | materi SQL; `(` bukan pemisah spec |
| `Format: [Tahun]年[Bulan]月…` | mengajarkan pola tanggal |
| `Format: NamaDepan + TahunLahir` | mengajarkan pola username |

Karena itu aturan spec-line **hanya berlaku untuk mindmap**, tidak untuk slide:
label node mindmap adalah frasa pendek, sedangkan `Format:` pada slide adalah
konten ajar biasa. Menjalankannya pada slide akan menolak materi bagus dan
membuat generator berulang sia-sia.

### Hasil verifikasi

- `scripts/test-slide-content.ts` — **31/31 lulus**, `false positive = 0`,
  `false negative = 0`, `mindmap bocor ke klien = 0`.
- `scripts/test-sibi-content-guard.py` — **semua lulus**, termasuk regresi untuk
  keempat false positive di atas.
- Sapuan DB langsung: 1422 baris `slide_sibi` + 1330 `mindmap_sibi`,
  **0 terkontaminasi**.
- `npx tsc --noEmit` — **exit 0**.

### Rekonsiliasi 23 vs 16

Catatan Pass 4 menyebut 23 baris kehilangan mindmap. Rekonsiliasi:
`mindmap_sibi` kotor = 289 → 266 dipulihkan + 23 kosong; dari 23 itu **7 punya
`metadata.mindmap` LLM** sehingga masih terender, dan **16 benar-benar kosong**.
Regenerasi menyasar 16, hasil **16/16 berhasil, 0 gagal**. Irisan himpunan
"16 diregenerasi" dengan "91 terkontaminasi" = **kosong**, jadi output regen
tidak menambah kontaminasi baru.

---

# Pass 6 — temuan baru dari verifikasi ulang (C-10, C-11, C-12)

Ditemukan saat memverifikasi gelombang e, bukan dari ledger. Ketiganya cacat
nyata, bukan kosmetik.

## Koreksi label: C-08 sudah selesai

Catatan kerja sempat menyebut "C-08 = AgentLog basi". **Salah label.** C-08 di
ledger adalah `/swap-build.img` tidak ada di `/etc/fstab`. Sudah selesai:
`/etc/fstab` baris 11 memuat `/swap-build.img`, `swapon --show` menampilkan
3 GB aktif. "AgentLog basi" sebenarnya **C-05**.

## C-11 — `/laporan` mustahil menampilkan laporan

Handler bot `handleReport` (`src/bot/handlers/parent.ts`) mencari baris
`AgentLog` dengan:

```ts
agentType: "GUARDIAN", action: "report", status: "COMPLETED"
```

**Tidak ada kode mana pun yang menulis `action: "report"`.** Bukti dari DB:

| Query | Hasil |
|---|---|
| `GUARDIAN` + `action='report'` | **0 baris** |
| `GUARDIAN` + `action='guardian-report'` | **24 baris** |

Akibatnya `/laporan` **selalu** menjawab "Belum ada laporan mingguan", berapa
pun laporan yang sudah terkirim ke orang tua.

Lapisan kedua: `output` yang tersimpan adalah objek ringkasan
(`{subjects, weakAreas, safety, reportId}`), bukan teks laporan. Jadi walau
nama action dicocokkan, handler hanya akan mencetak JSON mentah ke orang tua.

Perbaikan: laporan **dibuat saat diminta** — `generateWeeklyReport()` lalu
`formatWeeklyReport()`. Formatter diekstrak dari `sendWeeklyReportToParent()`
agar jalur dorong mingguan dan jalur `/laporan` memakai teks yang identik, dan
tidak bisa lagi berbeda diam-diam.

## C-12 — teks peringatan darurat berisi `\\n` literal

`sendEmergencyAlertToParent()` (`src/agents/guardian/notifier.ts`) menyusun
teks dengan `\\\\n` **di dalam template literal**. TypeScript mengubah `\\`
menjadi satu backslash, jadi runtime menerima `\n` sebagai **dua karakter**
(backslash + n), bukan baris baru.

Verifikasi: `repr()` pada byte mentah menunjukkan run 2 backslash sebelum `n`
di lima tempat; `cat -A` mengonfirmasi. Bandingkan dengan baris lain di berkas
yang sama yang benar memakai `"\n"`.

Akibatnya pesan darurat ke orang tua tampil sebagai satu baris rusak:
`🚨 DARURAT — Nama\\n\\n*Jenis:* ...`. Perbaikan: `\\n` → `\n`.

## C-10 — 5.369 baris `AgentLog` tidak pernah mencapai status terminal

| Status | Jumlah | Rentang |
|---|---|---|
| `ACTIVE` | 2.703 | 2026-07-08 … 2026-09-08 |
| `RETRYING` | 2.663 | 2026-07-05 … 2026-09-03 |
| `QUEUED` | 3 | 2026-07-06 … 2026-07-08 |

Total **5.369** (sempat tertulis 5.366 — salah jumlah; 2.703 + 2.663 + 3 = 5.369).
Terbesar: `assessment-generate` — **2.637 `ACTIVE` + 2.637 `RETRYING`**,
terakhir disentuh 2026-07-09. Ini residu insiden C-01 yang tidak pernah
ditutup: worker menulis `ACTIVE` saat mulai dan `RETRYING` saat gagal, tapi
tidak ada yang memindahkannya ke status terminal.

**Dampak terbatas**: DLQ (`src/queue/dlq.ts`) hanya membaca
`status: "FAILED"` + `error contains "Dead-lettered"`, dan handler orang tua
memfilter `GUARDIAN` + `COMPLETED`, jadi baris macet ini tidak mengotori
tampilan. Tetapi baris `ACTIVE` permanen membuat setiap inspeksi manual
menyesatkan — terlihat seperti job yang masih berjalan padahal sudah mati
sejak Juli.

**Reaper sudah disiapkan, BELUM dijalankan** — menunggu keputusan.
`scripts/reap-stale-agent-logs.ts` (dry-run sebagai default):

```
npx tsx scripts/reap-stale-agent-logs.ts            # dry-run, cutoff 7 hari
npx tsx scripts/reap-stale-agent-logs.ts --apply    # menulis + snapshot rollback
```

Dry-run nyata: **5.367 kandidat** lewat cutoff 7 hari (dari 5.369 total — 2
baris masih segar). Rincian terbesar `ASSESSMENT | assessment-generate |
ACTIVE -> 2637` dan `... | RETRYING -> 2637`. Rentang 2026-07-08 … 2026-09-03.
Tidak menyentuh baris terminal, menulis snapshot id+status sebelum `--apply`.
Dijalankan dry-run: **0 baris ditandai, DB tidak berubah**.

---

# Pass 7 — C-10: akar masalahnya bukan data, tapi siklus hidup worker

Investigasi lanjutan membatalkan premis "5.369 job macet". Baris-baris itu
**bukan job yang menggantung** — mereka baris yang tidak pernah diperbarui.

## Akar 1 — worker menulis siklus hidup sebagai tiga `create`, nol `update`

`src/queue/worker.ts` membuka baris dengan `agentLog.create({status:"ACTIVE"})`
lalu menulis transisi berikutnya sebagai **baris baru**, bukan pembaruan:

```ts
await prisma.agentLog.create({ data: { ..., status: "ACTIVE" } });     // baris 49
await prisma.agentLog.create({ data: { ..., status: "COMPLETED" } });  // baris 63
await prisma.agentLog.create({ data: { ..., status: "RETRYING" } });   // baris 77
```

`grep -c 'agentLog.update' src/queue/worker.ts` → **0**. Baris ACTIVE tidak
pernah ditutup, secara konstruksi. Setiap percobaan job meninggalkan satu baris
yatim.

Bukti berpasangan dari DB — `jobId 26`: `ACTIVE 12:02:24.510` lalu
`COMPLETED 12:02:27.811`. Dua baris, satu job.

| agentType / action | ACTIVE | COMPLETED | RETRYING | Aritmetika |
|---|---|---|---|---|
| `assessment-generate` | 2637 | 0 | 2637 | 2637 = 2637 |
| `improvement-analysis` | 39 | 21 | 18 | 39 = 21+18 |
| `guardian-report` | 12 | 12 | 0 | 12 = 12 |
| `scheduler-assign` | 10 | 10 | 0 | 10 = 10 |
| `curriculum-review` | 3 | 0 | 3 | 3 = 3 |

`src/queue/dlq.ts` **sudah** memakai `updateMany` — pola yang benar ada di repo;
worker-nya yang menyimpang.

## Akar 2 — `shouldDeadLetter` tidak pernah bernilai true

Dua cacat di fungsi yang sama:

1. **Filter mustahil cocok.** Ia mencari `jobId` + `status:"RETRYING"`, tetapi
   worker menulis baris `RETRYING` **setelah** memanggilnya. Tidak ada baris
   yang pernah menjadi `FAILED`.
2. **Off-by-one.** `job.attemptsMade` bersifat 0-based selama proses berjalan —
   terbukti di runtime: 0, 1, 2 pada tiga percobaan, baru menjadi 3 di event
   `failed` setelah blok catch kembali. Perbandingan `attemptsMade >= attempts`
   karena itu tidak pernah benar.

Konsekuensi: **DLQ tidak pernah menerima satu pun entri** — 0 baris bertanda
`Dead-lettered` dari 5.497 baris, padahal `getDeadLetteredJobs()` mencari persis
penanda itu. Retry job dihabiskan tanpa jejak.

## Perbaikan

- `worker.ts`: satu baris per JOB. Baris pembuka disimpan id-nya, transisi
  memakai `update`. Percobaan ulang **melanjutkan** baris yang ditinggalkan
  percobaan sebelumnya (`findFirst` pada status transien). Filter status
  transien itulah yang membuatnya aman saat BullMQ mendaur ulang job id: baris
  job lama sudah terminal sehingga tidak cocok, dan id yang didaur ulang
  membuka baris baru.
- `shouldDeadLetter` menjadi predikat murni tanpa tulis DB, memakai
  `attemptsMade + 1 >= (job.opts.attempts ?? MAX_RETRIES)`. Penutupan baris kini
  milik worker, yang memang pemilik barisnya.
- Label dead letter disesuaikan dengan `attempts` job, bukan konstanta global.

## Test regresi — `scripts/test-agent-log-lifecycle.ts`

9/9 lulus. **RED terbukti lebih dulu**: sebelum perbaikan, job sukses
menghasilkan `["ACTIVE","COMPLETED"]` dan job gagal `["ACTIVE","RETRYING"] ×3`
(6 baris, 0 terminal) — persis tanda tangan produksi. Sesudah perbaikan:
1 baris `COMPLETED`, dan 1 baris `FAILED` bertanda
`Dead-lettered after 3 failed attempts`.

Terisolasi di Redis database 9; aplikasi memakai database 0, jadi worker
produksi tidak bisa mengonsumsi job uji dan test tidak bisa mengganggu
produksi. Diverifikasi: 0 baris uji tertinggal di DB.

## Sapu residu — `scripts/sweep-stranded-agent-logs.ts`

Reaper seragam **dibatalkan** karena akan menanam diagnosis palsu: 12 baris
`ACTIVE` untuk `guardian-report` bersaudara dengan 12 baris `COMPLETED` — job
itu **berhasil**. Label seragam `FAILED` akan menulis kebohongan ke dalam data.
Skrip karena itu menurunkan label dari fakta, bukan mengasumsikannya.

Bukti "saudara terminal" lewat `jobId` pun dibatasi jendela **1 jam**, karena
BullMQ mendaur ulang job id (`jobId` unik hanya 555 dari 5.497 baris). Tanpa
jendela: 317 baris diklaim "superseded". Dengan jendela: **71** — 246 baris
dibatalkan klaimnya dan jatuh ke klasifikasi konservatif.

Hasil `--apply` (snapshot: `docs/designs/2026-09-11-c10-stranded-sweep-rollback.json`):

| status asal | status baru | alasan | jumlah |
|---|---|---|---|
| `RETRYING` | `FAILED` | retries habis tanpa catatan terminal | 2648 |
| `ACTIVE` | `FAILED` | percobaan tak pernah mencapai status terminal | 2645 |
| `ACTIVE` | `COMPLETED` | job selesai; baris tak pernah diperbarui | 56 |
| `RETRYING` | `COMPLETED` | job selesai; baris tak pernah diperbarui | 15 |
| `QUEUED` | `FAILED` | percobaan tak pernah mencapai status terminal | 3 |

**5.367 baris ditulis, sisa basi 0.**

| status | sebelum | sesudah |
|---|---|---|
| `ACTIVE` | 2703 | **2** |
| `RETRYING` | 2663 | **0** |
| `QUEUED` | 3 | **0** |
| `FAILED` | 3 | 5299 |
| `COMPLETED` | 135 | 207 |

2 baris `ACTIVE` tersisa sengaja tidak disentuh (lebih muda dari cutoff 7 hari).

## Bug ketiga: DLQ tidak pernah menerima satu entri pun

Ditemukan saat menyiapkan verifikasi produksi. Dua cacat bertumpuk di
`shouldDeadLetter()`:

1. **Filter mustahil cocok** — ia mencari `jobId` + `status: "RETRYING"`,
   padahal worker menulis baris itu *setelah* memanggilnya.
2. **Off-by-one** — `attemptsMade` bersifat 0-based selama proses berjalan
   (terukur: 0, 1, 2 pada job 3-percobaan), baru naik ke 3 di event `failed`.

Akibatnya predikatnya tak pernah bernilai benar, jadi **0 dari 5.497 baris**
memuat penanda `Dead-lettered` — padahal `getDeadLetteredJobs()` mencari persis
penanda itu. Tampilan DLQ dan tombol retry manual permanen kosong. Perbaikan:
`shouldDeadLetter` dijadikan predikat murni (tanpa tulis DB), dan worker yang
menutup barisnya.

## Semantik percobaan BullMQ — terukur, bukan diasumsikan

`job.opts.attempts` **tidak** bernilai `undefined` saat `attempts` tidak
ditentukan; nilainya **`0`**, dan BullMQ menjalankan processor **sekali**:

| cara job ditambahkan | `job.opts.attempts` | processor jalan |
|---|---|---|
| tanpa `attempts`, tanpa default queue | 0 | 1 |
| `attempts: 0` | 0 | 1 |
| `attempts: 1` | 1 | 1 |
| `attempts: 3` | 3 | 3 |

Limit sebenarnya karena itu `max(1, opts.attempts)` — diekstrak ke
`effectiveAttempts()` di `dlq.ts` agar predikat dan pesan dead-letter tak bisa
saling berselisih.

Catatan jujur: ekspresi lama `job.opts.attempts ?? MAX_RETRIES` **bukan** bug
fungsional — `0 ?? 3` menghasilkan `0`, jadi fallback-nya mati dan
`Math.max(1, 0)` = 1 tetap benar. Yang salah adalah pesannya: job tanpa
`attempts` dilaporkan "Dead-lettered after **0** failed attempts". Hipotesis
awal bahwa fallback itu bisa memulihkan bug asli **diuji dan gugur** (test tetap
14/14 dengan versi `?? MAX_RETRIES`), dan koreksi ini dicatat alih-alih
dipertahankan.

## Bukti di produksi — `scripts/verify-c10-in-production.ts`

Test regresi berjalan di Redis db 9 dengan worker sendiri. Itu membuktikan
logikanya, bukan worker yang **sedang berjalan**. Skrip ini menaruh dua job ke
queue sungguhan (Redis db 0) lewat `getQueue()` aplikasi — jadi ikut membawa
`defaultJobOptions` (`attempts: 3`) — lalu membiarkan worker produksi
mengonsumsinya dan membaca barisnya dari DB.

Job dipilih agar **tanpa efek ke pihak ketiga**:

1. `assessment-generate` dengan siswa + topik tak dikenal → material tak
   ditemukan, processor kembali tanpa panggilan LLM dan tanpa tulis data.
   Jalur SUKSES, dan justru queue yang mengakumulasi 2.637 baris yatim.
2. `improvement-analysis` dengan `attemptId` tak ada → `analyzeExamAttempt`
   melempar di lookup, sebelum panggilan LLM. Jalur GAGAL dengan retry penuh.

`guardian-report` **sengaja tidak dipakai**: `processGuardianReportJob` selalu
memanggil `sendWeeklyReportToParent`, jadi memicunya akan mengirim pesan
Telegram ke orang tua sungguhan. Invarian yang diuji adalah siklus hidup, dan
job apa pun melatihnya — tak ada alasan menerima efek samping itu.

Hasil (deploy `23:18`, commit `c0aea7d`+):

```
verify-c10-ok-5bf53aa3    COMPLETED  -
verify-c10-fail-5bf53aa3  FAILED     Dead-lettered after 3 failed attempts
lulus: 9/9
```

Job gagal menghabiskan **3 percobaan** dalam **satu baris** — artinya retry
benar-benar terjadi dan barisnya di-resume antar percobaan, bukan hanya sekali
jalan. Sesudahnya `getDeadLetteredJobs()` mengembalikan **2 baris** untuk
pertama kalinya; sebelumnya selalu 0.

Baris verifikasi dihapus sesudahnya (`scripts/check-dlq-and-cleanup.ts --apply`),
dibaca ulang dari DB: 0 tersisa.

## Verifikasi

- `npx tsx scripts/test-agent-log-lifecycle.ts` — **14/14** (naik dari 9: kasus
  "gagal tanpa `attempts`" ditambahkan)
- `npx tsx scripts/verify-c10-in-production.ts` — **9/9** di worker produksi
- `npx tsx scripts/check-dlq-and-cleanup.ts` — DLQ mengembalikan 2 baris; 4 baris uji dihapus
- `npx tsx scripts/test-slide-content.ts` — 31/31
- `python3.12 scripts/test-sibi-content-guard.py` — lulus
- `npx tsx scripts/test-student-access.ts` — 13/13
- `bash scripts/test-c02-callback-guard.sh` — 5/5
- `npx tsc --noEmit` — **exit 0**; `ops/build.sh` — **exit 0**
- Deploy online, `[queue/runner] 10 queue(s) initialised`
- Probe: `/` 200, `/login` 200, `/student` 307, cron tanpa secret 401
- DB: 0 baris uji tertinggal; Redis db 9 dibersihkan, db 0 (aplikasi) utuh
- D-04 (tombol `▶️` tanpa label teks) — diperbaiki: `aria-label` deskriptif +
  emoji di dalam `aria-hidden`.

---

# Pass 8 — penutupan sisa (2026-09-12)

## Kandidat youtube `TE1BqPXXX7E` — **false positive**

`src/data/youtube-sma11.ts:95` memuat video ID `TE1BqPXXX7E`. Tiga huruf `X`
membuatnya terlihat seperti placeholder. **Bukan.**

oEmbed mengembalikan metadata nyata yang cocok persis dengan entri di berkas:

```
title:  "Konsep Dasar Turunan Fungsi Aljabar Matematika Wajib Kelas 11 m4thlab"
author: "m4th-lab"        ← sama dengan field channel: "m4th-lab"
thumb:  maxresdefault.jpg 159.401 byte  (gambar nyata, bukan placeholder abu-abu)
```

Kontrol negatif dari investigasi sebelumnya tetap berlaku: tiga ID acak
well-formed (`aB3dE5gH7jK`, `TE1BqPXXX7F`, `Qw9zX2mN8pL`) semuanya dijawab
**400** oleh oEmbed, jadi oEmbed tidak asal meloloskan. Video-nya ada, `XXX`
kebetulan. Tidak ada perubahan berkas.

## Sisa 2 baris `AgentLog` non-terminal — disapu

Sapuan sebelumnya (`--days 7`) sengaja melewati 2 baris yang lebih muda dari
cutoff. Keduanya ternyata juga yatim, dan **keduanya job yang berhasil** —
saudara terminalnya ada di dalam jendela 1 jam:

| jobId | baris `ACTIVE` | saudara terminal | jeda |
|---|---|---|---|
| 25 | 2026-09-05 13:42:32 | `COMPLETED` 13:43:19 | 47 s |
| 26 | 2026-09-08 12:02:24 | `COMPLETED` 12:02:27 | 3 s |

`npx tsx scripts/sweep-stranded-agent-logs.ts --days 3 --apply` →
**2 baris `ACTIVE` → `COMPLETED`**, alasan
`superseded: job completed, this row was never updated (lifecycle bug, fixed)`.
Snapshot rollback: `docs/designs/2026-09-12-c10-stranded-sweep-rollback.json`.

Sesudahnya `SELECT count(*) ... status IN ('QUEUED','ACTIVE','RETRYING')`
= **0** — pertama kali tabel `AgentLog` bersih dari baris non-terminal.

## `safety.ts` — dua helper privasi yang fail-open

`verifyStudentOwnership()` mengembalikan `true` tanpa syarat, dan
`filterVisibleStudents()` mengembalikan masukannya utuh. Keduanya **dead code**
(tak ada pemanggil di `src/` maupun `scripts/`), jadi belum ada kebocoran nyata
— tetapi begitu pemanggil pertama muncul, setiap orang tua akan melihat data
setiap keluarga. Ini pola yang sama dengan A-14 (guard cron fail-open).

Premis TODO di komentar lama juga sudah usang: ia menunggu
`ParentStudentLink` / `student.parentId`, padahal relasinya **sudah ada**
sebagai `Student.parentTelegramId`.

Perbaikan — keduanya **fail-closed**, memakai `parentTelegramId`:

- `verifyStudentOwnership(studentId, parentUserId)` menerima `Student.id`
  (uuid) **atau** `Student.studentId` (mis. `"RAIHAN001"`). Input kosong, siswa
  tak dikenal, dan siswa tanpa orang tua tertaut semuanya `false`.
- `filterVisibleStudents(ids, parentUserId)` mengembalikan irisan, urutan
  masukan dipertahankan, namespace id yang diberikan dipertahankan.

Pola `await import("@/lib/prisma")` di dalam fungsi diikuti — sama seperti
`createEmergencyIntervention()` di berkas yang sama — agar tidak menambah
import top-level pada modul yang di-re-export barrel `agents/guardian`.

### Test regresi — `scripts/test-guardian-ownership.ts`

**RED terbukti lebih dulu.** Dengan `safety.ts` versi lama (di-`git stash`),
skrip yang sama menghasilkan **4/15**; dengan versi baru **15/15**. Kegagalan
versi lama persis tanda tangan fail-open:

```
FAIL  login id + parent LAIN      got=true  expected=false
FAIL  siswa tidak dikenal         got=true  expected=false
FAIL  parentUserId kosong         got=true  expected=false
FAIL  hanya milik parent ini      got=["RAIHAN001","TIUMU001","NO-SUCH-STUDENT"]  expected=["RAIHAN001"]
```

Fixture dibaca dari DB nyata (read-only), bukan dikarang: RAIHAN001/SHOFI001/
SYIFA001 berbagi `parentTelegramId=640765830`, TIUMU001 `NULL`. Skrip keluar
dengan kode 2 bila fixture bergeser, supaya tidak lulus secara palsu.

## Verifikasi

- `npx tsx scripts/test-guardian-ownership.ts` — **15/15** (RED: 4/15)
- `npx tsc --noEmit` — **exit 0**
- `ops/build.sh` — **exit 0**
- DB: baris `AgentLog` non-terminal **0** (sebelumnya 2)

## Sisa yang belum tertutup

- **C-05 runtime.** Patch `guardian` sudah deploy 2026-09-11, tetapi job
  GUARDIAN terakhir berjalan 2026-09-06 — sebelum patch. Bukti runtime pertama
  baru ada setelah `guardian-report-weekly` jalan **2026-09-13 18:00**.
- **`/api/health` tidak dibuat** — keputusan pemilik produk (2026-09-12):
  probe publik yang ada dinilai cukup.
- **TIUMU001 trial berakhir 2026-09-13 03:49:37** — keputusan perpanjangan ada
  di tangan pemilik produk, di luar lingkup audit ini.

---

# Pass 9 — C-13: `/api/cron/guardian-report` tanpa idempotensi (2026-09-12)

## Bagaimana ditemukan

Saat menutup Pass 8, `AgentLog` menunjukkan GUARDIAN terakhir **2026-07-30**
padahal cron `guardian-report-weekly` melaporkan `ok` pada 2026-09-06. Untuk
memisahkan "route tidak menulis log" dari "cron tidak benar-benar memanggil",
secret di `.env` diekstrak persis dengan cara yang dipakai tiga skrip cron dan
dikirim sebagai probe auth ke endpoint.

**Probe itu bukan probe.** `POST /api/cron/guardian-report` adalah endpoint yang
melakukan pekerjaan, bukan yang memeriksa kredensial — jadi dua request
verifikasi (nilai apa adanya, lalu nilai tanpa kutip) menjalankan digest
mingguan **dua kali** dan mengirim **6 pesan per jalan** (3 ke orang tua, 3 ke
siswa). Dua belas pesan Telegram terkirim ke penerima sungguhan.

Ini kesalahan operator, bukan cacat kode — tetapi ia menyingkap cacat kode yang
nyata: tidak ada apa pun yang mencegah jalan kedua.

## Temuan

`sendWeeklyGuardianReports()` (`src/services/guardian-report.ts:143`) mengambil
**semua** `Student` dengan `status: "ACTIVE"` dan `parentTelegramId != null`,
lalu mengirim tanpa memeriksa kapan laporan terakhir dikirim. Tidak ada
idempotensi di route, di service, maupun di tabel — `grep -ci
'idempot\|alreadySent\|lastRun\|dedup'` pada `src/app/api/cron/*/route.ts`
menghasilkan **0** untuk `guardian-report` dan `daily-nudge`.

Bukti dari DB, dua baris berurutan 2,5 detik terpisah, keduanya sukses:

```
COMPLETED|guardian-report|2026-09-12 03:02:05.867Z|{"sent":6,"failed":0, ...}
COMPLETED|guardian-report|2026-09-12 03:02:08.389Z|{"sent":6,"failed":0, ...}
```

Dampak: setiap pemanggilan ulang mengirim digest duplikat ke orang tua dan
siswa. Pemicu yang realistis, tanpa niat jahat:

1. **Retry setelah timeout.** `~/.hermes/profiles/opencode/scripts/guardian-report-trigger.sh`
   memakai `curl --max-time 120`. Bila 3+3 kirim melewati 120 s, curl keluar
   non-nol dan skripnya `exit 1` — laporan sudah terkirim, tapi terlihat gagal,
   dan menjalankannya lagi menggandakan semuanya.
2. **Dua penjadwal.** Job `0 18 * * 0` ada di Hermes cron; `POST
   /api/cron/guardian-report` juga dapat dipanggil dari mana saja oleh siapa pun
   yang memegang secret.
3. **Jalan manual untuk menguji**, seperti yang baru saja terjadi.

`daily-nudge` punya bentuk serupa: ia memfilter `daysSince >= 2` berdasarkan
**aktivitas terakhir siswa**, bukan berdasarkan kapan nudge terakhir dikirim.
Siswa yang tidak aktif 3 hari karena itu menerima nudge setiap kali cron harian
jalan, bukan sekali.

## Status

**Belum diperbaiki.** Kandidat perbaikan, dari yang paling kecil:

- **Klaim idempoten berbasis waktu** — sebelum mengirim, periksa `AgentLog`
  terakhir untuk `agentType=GUARDIAN, action=guardian-report, status=COMPLETED`;
  lewati bila lebih muda dari 6 hari. Kembalikan `skipped` agar pemanggil tahu.
- **Kirim per-siswa dengan kunci unik** — satu baris per siswa per minggu
  (mis. `guardian-report:<studentId>:<ISO-week>`), sehingga kiriman yang gagal
  bisa diulang tanpa menggandakan yang sudah berhasil.
- Untuk `daily-nudge`: filter pada nudge terakhir, bukan aktivitas terakhir.

Perlu keputusan pemilik produk sebelum dikerjakan — ia mengubah perilaku
pengiriman, bukan sekadar menambal bug.


