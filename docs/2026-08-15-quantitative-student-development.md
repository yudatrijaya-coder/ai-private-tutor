# Quantitative Student Development — Fitur #1–#4 (Terverifikasi 15 Ags 2026)

Dokumentasi fitur yang membuat app lebih interaktif & kuantitatif terhadap perkembangan
siswa. Semua fitur memakai **data yang sudah dikumpulkan** (TopicMastery, ProgressSnap,
Attempt, ExamAttempt) — tidak ada schema baru.

**Status: semua fitur sudah diimplementasi, di-deploy, dan diuji end-to-end di produksi.**

| # | Fitur | File utama | Status |
|:--|:------|:-----------|:-------|
| 1 | Bot tutor pakai data mastery | `src/bot/agent/tutor.ts` | ✅ terverifikasi |
| 2 | Grafik perkembangan (tren) | `src/app/(student)/student/progress/page.tsx` | ✅ terverifikasi |
| 3 | Misi Hari Ini (+XP) | `src/app/api/student/missions/route.ts` + `MissionSection.tsx` | ✅ terverifikasi |
| 4 | Bot proactive kuantitatif | `quiz.ts`, `exam/*`, `daily-nudge`, `student-weekly-report` | ✅ terverifikasi |

---

## #1 — Bot tutor pakai data mastery (system prompt)

**Apa**: Sebelumnya system prompt LLM tutor hanya berisi persona + waktu WIB. Sekarang
`buildSystemPrompt` memanggil `buildMasterySummary(student)` dan menyuntikkan blok
`📊 DATA PERKEMBANGAN SISWA` ke system prompt: streak, XP, rata-rata mastery per mapel,
dan topik lemah (dengan severity). Query dibungkus try/catch — aman kalau gagal.

**File**: `src/bot/agent/tutor.ts`

**Bukti terverifikasi** (15 Ags 2026, Test A):
- Simulasi update Telegram sebagai siswa Syifa → log menunjukkan blok mastery ter-injeksi:
  streak 6, XP 10.555, topik lemah `Shopping (Bahasa Inggris) 40% (severe)`.
- Jawaban LLM di ChatLog **persis memakai data itu**: *"topik paling lemah: Shopping —
  mastery 40%… mapel lain sudah 100%"*. Bukan jawaban generik.

**Cara uji**:
```bash
# 1. Uji chat asli: kirim pesan ke @senangbelajar_bot, lalu cek log:
pm2 logs ai-private-tutor --lines 50 --nostream | grep -i "mastery\|tutor"
# 2. Cek ChatLog di DB (tabel ChatLog) — jawaban LLM harus menyebut data siswa
#    (mis. "topik paling lemah: <topik> — mastery <X>%").
# 3. (Opsional) script tsx satu kali untuk lihat ringkasan yang dibangun:
cd ~/ai-private-tutor && cat > /tmp/check-mastery-summary.ts <<'EOF'
import { prisma } from "./src/lib/prisma";
import { buildMasterySummary } from "./src/bot/agent/tutor";
const s = await prisma.student.findFirst({ where: { name: "Syifa" } });
if (s) console.log(await buildMasterySummary(s));
EOF
NODE_OPTIONS="--max-old-space-size=1536" npx tsx /tmp/check-mastery-summary.ts
```

---

## #2 — Grafik perkembangan di halaman Progress

**Apa**: Halaman progress siswa sekarang menampilkan:
- **Line chart SVG** "Perkembangan Penguasaan" — tren mastery per subject dari `ProgressSnap`
  (90 hari, titik per hari, multi-subject warna berbeda).
- **Bar chart** "Waktu Belajar per Minggu" — 5 minggu terakhir dari StudySession.

Tanpa dependency baru (SVG custom), mengikuti tema student (CSS vars). Sebelumnya halaman
hanya menampilkan keadaan terakhir (bar mastery per subject) padahal `ProgressSnap` sudah
dikumpulkan harian oleh cron.

**File**: `src/app/(student)/student/progress/page.tsx`

**Cara uji**:
```bash
# 1. Pastikan ProgressSnap terisi (cron progress-snap):
curl -s -H "x-cron-secret: $CRON_SECRET" https://senangbelajar.web.id/api/cron/progress-snap
# 2. Buka browser sebagai siswa → https://senangbelajar.web.id/student/progress
#    Cek: line chart per subject + bar chart waktu belajar muncul.
# 3. Verifikasi data di DB:
cd ~/ai-private-tutor && NODE_OPTIONS="--max-old-space-size=1536" npx tsx -e '
import { prisma } from "./src/lib/prisma";
console.log(await prisma.progressSnap.count());'
```

---

## #3 — Misi Hari Ini (+XP)

**Apa**: Home siswa punya daftar tugas dinamis:
- Sesi belajar terjadwal hari ini (`ScheduleSession`)
- Topik lemah 2 teratas (`TopicMastery` weakness severe/moderate)
- Improvement plan dari exam terbaru (`ExamAttempt` → `ImprovementPlan`)
- Fallback: quiz

Checkbox interaktif → selesai = **+10 XP** (masuk `XP_RULES`, pakai `handleActivity` yang
juga update streak + badge), dedup per hari. Route `GET/POST /api/student/missions`.

**File**: `src/app/api/student/missions/route.ts` (baru),
`src/components/student/MissionSection.tsx` (baru),
`src/lib/gamification.ts` (XP_RULES +10), home student.

**Bukti terverifikasi**: uji query data asli menghasilkan misi "Perkuat: Shopping (Bahasa
Inggris)" untuk Syifa; di browser nyata, halaman home menampilkan misi dari topik lemah.

**Cara uji**:
```bash
# 1. API (butuh session siswa — 401 tanpa auth):
curl -s -o /dev/null -w "%{http_code}\n" https://senangbelajar.web.id/api/student/missions  # → 401
# 2. Browser: login siswa → halaman home → seksi "🎯 Misi Hari Ini" muncul,
#    klik lingkaran → cek XP naik +10 (dan misi tidak muncul lagi hari ini).
# 3. Verifikasi DB: tabel StudentActivity/StudentBadge bertambah.
```

---

## #4 — Bot proactive kuantitatif

Empat sub-fitur:

### 4a. Delta mastery pasca quiz
Pesan hasil quiz menampilkan `📈 Mastery [topik]: X% → Y% ▲/▼` + `✨ +XP`.
**File**: `src/bot/handlers/quiz.ts`

**Cara uji** (Test B terbukti 15 Ags):
```bash
# Alur quiz penuh lewat webhook (payload callback harus punya message.chat!):
# 1) quiz:subject:<mapel> → 2) quiz:pick:<quizId> → 3) quiz:ans:<idx>:<opt> tiap soal
# Lalu cek:
pm2 logs ai-private-tutor --nostream | grep -i "mastery"
# DB: attempt baru + topicMastery.mastery berubah sesuai weighted average
# (newMastery = old*0.85 + scorePct*0.15)
```

### 4b. Delta mastery pasca exam
Response API menyertakan `masteryDeltas` per topik; halaman exam menampilkan blok
`📈 Penguasaan topik` di hasil. **Fix terverifikasi**: delta kini dipersist di
`ExamAttempt.details` sehingga tampil juga saat melihat attempt lama ("Lihat"),
bukan hanya setelah submit.
**File**: `src/app/api/exam/attempt/route.ts`, `src/app/api/students/exams/[id]/route.ts`,
`src/app/(student)/student/exam/page.tsx`

**Cara uji**:
```bash
# Submit attempt via API:
curl -s -X POST https://senangbelajar.web.id/api/exam/attempt \
  -H "Content-Type: application/json" \
  -d '{"studentId":"SYIFA001","examId":"<id>","answers":{"0":"A","1":"B"}}'
# Response harus berisi masteryDeltas: [{topic, before, after}].
# Browser: selesaikan exam → hasil menampilkan "📈 Penguasaan topik".
# Kembali ke daftar → "Lihat" → blok delta TETAP muncul (fix attempt lama).
```

### 4c. Daily nudge (streak at risk + saran topik lemah)
Reminder harian ke Telegram: pesan saran topik lemah (`🎯 Saran: perkuat <topik>`),
penekanan "awas putus! 🔥" kalau streak ≥3, tombol inline ke subject.
**File**: `src/app/api/cron/daily-nudge/route.ts`

**Cara uji** (terbukti 15 Ags — Raihan & SHOFI ter-nudge):
```bash
curl -s -H "x-cron-secret: $CRON_SECRET" https://senangbelajar.web.id/api/cron/daily-nudge
# → {"ok":true,"results":["nudged <nama>",...]}
# Syarat nudge: status ACTIVE + telegramId + gap >= 2 hari tanpa aktivitas.
```

### 4d. Weekly summary siswa
Ringkasan kuantitatif mingguan ke Telegram siswa: streak, XP, rata-rata mastery,
quiz/exam 7 hari (hanya COMPLETED/ANALYZED), exam terbaik, topik lemah. Dipicu
bersamaan cron guardian-report. **Fix**: count exam & best exam kini pakai filter
status yang sama (`COMPLETED`/`ANALYZED`).
**File**: `src/services/student-weekly-report.ts` (baru), `src/app/api/cron/guardian-report/route.ts`

**Cara uji**:
```bash
curl -s -X POST -H "x-cron-secret: $CRON_SECRET" https://senangbelajar.web.id/api/cron/guardian-report
# → {"success":true,...,"studentReport":{"sent":N,...}}
# Cek pesan di Telegram siswa: "📊 Ringkasan Mingguanmu, <nama>! ..."
```

---

## Catatan operasional
- Semua panggilan LLM tetap 1 panggilan per request (9Router serial — aturan project).
- Perubahan belum tentu di-push; cek `git log --oneline -5` di VPS untuk commit terbaru.
- Data siswa yang dipakai uji (Syifa, Raihan, SHOFI) adalah siswa asli — jangan hapus.
- Konteks tambahan: `docs/designs/2026-08-10-exam-and-improvement-plan-design.md` (exam),
  `docs/rules/tutor-rules.md` (persona tutor).
