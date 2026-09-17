# Sesi Kurikulum Berhenti 7 Minggu — `scheduleConfig` Shape Mismatch

**Tanggal temuan:** 2026-09-17
**Ditemukan saat:** menjawab pertanyaan "Syifa kelas 5, ada konten pending seiring penambahan week?"
**Dampak:** tidak ada satu pun sesi kurikulum (DAILY) dijadwalkan untuk SEMUA siswa dari akhir Juli sampai 17 September 2026.
**Status:** diperbaiki, terverifikasi end-to-end.

---

## Ringkas

`assignSessionsIfNeeded()` di `/api/cron/schedule-sweep` melewati setiap siswa
karena predikat `studentHasScheduleConfig()` hanya mengenali bentuk config
**flat** (`sessionsPerDay` / `excludeDays` / `customTimes` / `preferredTime`),
sedangkan onboarding bot menulis bentuk **per-hari** (`{ days: { monday: {...} } }`).

Predikat selalu mengembalikan `false` → `continue` → 0 sesi dibuat → cron tetap
melaporkan `COMPLETED` dan `sessionsAssigned: 0` sebagai **sukses biasa**.

## Kenapa tidak terdeteksi 7 minggu

Sesi tetap muncul di dashboard, jadi tidak ada yang tampak rusak. Penyebabnya:
ujian membuat sesi `INTENSIVE` lewat jalur kode lain (`applyImprovementPlan`)
yang **tidak pernah memanggil predikat ini**. Yang mati hanya penjadwalan
kurikulum mingguan — persis bagian yang menjadwalkan week/materi baru.

Kegagalan bersifat *silent success*: `sessionsAssigned: 0` adalah nilai normal
untuk cron yang berjalan 145×/hari, jadi tidak ada sinyal untuk diperiksa.

## Bukti

Sesi `COMPLETED` terakhir per siswa (bukan INTENSIVE):

| Siswa | Tipe | Sesi terakhir |
|---|---|---|
| RAIHAN001 | DAILY | 2026-07-24 |
| SYIFA001 | DAILY | 2026-07-25 |
| SHOFI001 | DAILY | 2026-07-22 |
| RAIHAN001 | INTENSIVE | 2026-09-16 |
| SYIFA001 | INTENSIVE | 2026-09-10 |

Semua sesi DAILY berhenti di sekitar 22–25 Juli — periode yang sama dengan
masuknya bentuk `days` ke `Student.scheduleConfig`.

Reproduksi predikat lama terhadap config Syifa yang asli:

```
config Syifa punya keys: days
studentHasScheduleConfig -> false
=> guard menolak, assignSessionsIfNeeded SKIP, 0 sesi dibuat
```

## Cacat kedua

Guard "sudah punya sesi?" menghitung **semua** sesi mendatang tanpa memfilter
tipe atau jendela minggu:

```ts
scheduledAt: { gte: now }   // mencakup sesi INTENSIVE milik sistem ujian
if (existingCount > 0) continue;
```

Akibatnya siswa yang memegang satu sesi ujian (Raihan, satu INTENSIVE
2026-09-18) dianggap "sudah terjadwal" dan tidak pernah mendapat sisa minggunya.
Bahkan setelah cacat pertama diperbaiki, cacat ini akan menahan perbaikan.

## Perbaikan

1. **`src/lib/schedule/schedule-config.ts`** (baru) — `hasScheduleConfig()`
   menerima bentuk flat **dan** `{ days: {...} }` (map kosong tetap ditolak).
   Dipindah ke `src/lib/` supaya bisa diuji di luar konteks cron.
2. **`assignSessionsIfNeeded()`** — guard diganti: hitung `expectedSlots` dari
   `computeWeeklySlots()` untuk minggu berjalan, lalu bandingkan dengan sesi
   `SCHEDULED` di jendela minggu yang sama. Minggu yang terisi sebagian bisa
   dilengkapi; minggu yang penuh tetap berhenti murah.
3. **`computeWeeklySlots()`** diekspor dari `assigner.ts` agar route dapat
   memakai definisi "slot minggu" yang sama dengan yang dipakai penugasan.

## Verifikasi

| Uji | Hasil |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | sukses |
| `npx tsx scripts/check-schedule-config.ts` | 11/11 PASS |
| Cron run 1 (`sessionsAssigned`) | **17** |
| Cron run 2 (idempoten) | **0** |
| Cron run 3 (idempoten) | **0** |
| Sesi mendatang sebelum | 1 (hanya INTENSIVE Raihan) |
| Sesi mendatang sesudah | 18 |
| Duplikat `(student, scheduledAt)` | 0 |
| Sesi `MISSED` di masa depan | 0 |

Jadwal yang dihasilkan cocok persis dengan config Syifa/Raihan: Kamis & Selasa &
Minggu 19:30 (DAILY), Jumat & Senin & Rabu 19:00 (INTENSIVE), Sabtu dilewati.

```
SYIFA001 | Thu 18 Sep 19:00 | INTENSIVE | Matematika       | Pecahan
SYIFA001 | Sun 20 Sep 19:30 | DAILY     | Bahasa Indonesia | Aku yang Unik
SYIFA001 | Mon 21 Sep 19:00 | INTENSIVE | IPAS             | Indonesia Kaya
SYIFA001 | Tue 22 Sep 19:30 | DAILY     | PJOK             | Eksplorasi Gerak
SYIFA001 | Wed 23 Sep 19:00 | INTENSIVE | PJOK             | Permainan Bola
```

## Catatan untuk audit berikutnya

- **`sessionsAssigned: 0` bukan bukti sehat.** Uji nol-hipotesis: jika config
  siswa mengizinkan N sesi/minggu dan 0 sesi mendatang ada, itu kegagalan.
- **Kolom `timestamp` tanpa timezone di Postgres:** server memakai
  `TimeZone = Asia/Shanghai`. Membandingkan kolom itu dengan `now()`
  (`timestamptz`) menafsirkan nilai sebagai waktu lokal server, bukan UTC —
  query audit menghasilkan hasil menyesatkan. Pakai literal eksplisit
  (`createdAt > timestamp '2026-09-17 05:25:00'`).
- **Bentuk `scheduleConfig` historis:** `seed.ts` menulis flat
  (`preferredTime`, `timezone`, `sessionDuration`); onboarding bot menulis
  `{ days: {...} }`; `computeWeeklySlots()` hanya membaca `days`.
