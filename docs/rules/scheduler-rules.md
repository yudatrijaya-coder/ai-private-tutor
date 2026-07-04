# Scheduler Agent — Safety Rules & Guardrails

> **Priority: LOW** — Logic murni, gak kontak langsung dengan anak/parent. Tapi tetap penting karena ngaruh ke konsistensi belajar.

## 1. Balance Rules

### 1.1 Max Study Load
```typescript
const MAX_STUDY_LOAD = {
  daily: {
    max_sessions_per_day: 2,          // 1 daily + 1 intensive max
    max_minutes_per_day: 270,         // 15 daily + 255 intensive (4.25 jam)
    min_break_between_sessions: 120,  // 2 jam jeda minimal
  },
  weekly: {
    max_daily_sessions: 7,            // 7 hari
    max_intensive_sessions: 3,        // Mon/Wed/Fri
    max_total_hours: 15,              // Biar gak overload
  }
};
```

- Jangan overload anak. Kalau anak minta tambah jadwal > max → veto
- "Wah, kalau belajar terlalu banyak nanti pusing. Coba besok aja ya?"

### 1.2 Rest Days
- Minimal 1 hari dalam seminggu tanpa jadwal (student choice atau auto-assign)
- Default: Minggu libur
- Kalau student minta belajar di hari libur → approve (tapi cuma 1 sesi daily pendek)

## 2. Reminder Safety

### 2.1 No Spam
- Max 3 reminder per sesi (H-1, 30 menit sebelum, 5 menit missed)
- Jangan kirim reminder > 2 jam sebelum jadwal
- Jangan kirim reminder di luar jam 06:00 - 21:00

### 2.2 Gentle Language
- Reminder harus positif, bukan menyalahkan
- ❌ "Kamu belum belajar! Ayo!"
- ✅ "Halo! 30 menit lagi kita belajar pecahan. Kak Budi udah siapin video seru! 🎬"

## 3. Reschedule Rules

### 3.1 Reschedule Limits
- Max 2 reschedule per sesi (setelah itu skip atau parent intervene)
- Max 3 reschedule per minggu per student
- Reschedule > 2x dalam sehari → flag Guardian: "student appears avoidant"

### 3.2 Veto Rules
Scheduler boleh veto kalau:
- Student minta skip topik yang mastery-nya < 30%
- Reschedule menyebabkan jadwal bentrok (> 2 sesi/hari)
- Student minta ganti topik ke topik yang belum waktunya (prerequisite belum dipelajari)

Scheduler **tidak boleh** veto kalau:
- Student minta jadwal diundur 1-2 jam (fleksibel)
- Student minta ganti topik ke topik lain dengan level sama
- Student minta libur 1 hari (tapi > 3 hari berturut-turut → Guardian notif)

## 4. Motivation Video Rules

### 4.1 Honesty in Praise
- Praise harus berdasarkan data nyata, bukan generic
- ❌ "Kamu terbaik!" (kalau cuma belajar 1x seminggu)
- ✅ "Minggu ini Andi belajar 5 topik! Pecahan naik 20%! Hebat! 🔥"

### 4.2 Grade-Appropriate Language
- SD motivation: pake analogi mainan, makanan, pujian warna-warni
- SMP motivation: pake bahasa gaul ringan, referensi game/sekolah
- SMA motivation: fokus ke masa depan, real-world application

### 4.3 No Shaming
DILARANG di motivation video:
- Menyoroti kekurangan student
- "Kok cuma belajar 2x?"
- "Kakakmu lebih rajin"
