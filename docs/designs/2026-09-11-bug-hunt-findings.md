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
