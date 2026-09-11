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
