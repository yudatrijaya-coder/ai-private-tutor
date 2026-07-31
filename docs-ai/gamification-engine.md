# Gamification Engine

> Terakhir update: 31 Juli 2026

## Overview

`src/lib/gamification.ts` menangani XP, streak, dan badge. Dipanggil dari `POST /api/students/activity`.

## XP Rules

| Activity | XP |
|----------|----|
| `quiz_complete` | 25 |
| `quiz_complete` (perfect) | 50 |
| `slide_view` | 5 |
| `mindmap_view` | 5 |
| `video_click` | 5 |
| `exam_complete` | 100 |
| `streak_day` (bonus harian) | 10 |

```typescript
export function getXpFor(type: string, isPerfect = false): number {
  if (type === "quiz_complete" && isPerfect) return XP_RULES.quiz_perfect;
  return XP_RULES[type] ?? 0;
}
```

Perfect score: `score === maxScore` diekstrak dari `metadata` di `handleActivity`.

## Streak Logic

`updateStreak(studentId, activityDate)` dipanggil sekali per hari — saat aktivitas pertama hari itu.

```
lastActivityDate = null       → first activity ever → streak = 1, award streak XP
diffDays = 0                 → same day → no change
diffDays = 1                 → consecutive → streak++, longestStreak = max, award streak XP
diffDays >= 2                 → streak broken → reset streak = 1
```

`lastActivityDate` di-set ke jam 00:00:00 sebelum dihitung.

## Badge Catalogue (14 badges)

| Code | Name | Icon | Category | XP Reward | Threshold |
|------|------|------|----------|-----------|-----------|
| `first_quiz` | Quiz Pertama! | 🎯 | milestone | 50 | 1 quiz |
| `quiz_10` | Rajin Quiz | 📝 | milestone | 100 | 10 quiz |
| `quiz_50` | Gila Quiz | 🔥 | milestone | 250 | 50 quiz |
| `streak_3` | Semangat 3 Hari | ⭐ | streak | 30 | 3 hari |
| `streak_7` | Sepekan Penuh | 💪 | streak | 100 | 7 hari |
| `streak_30` | Bulan Ini Milikku | 🏆 | streak | 500 | 30 hari |
| `score_100` | Sempurna! | 💯 | milestone | 100 | 1 perfect score |
| `exam_complete` | Ujian Berlalu | 📚 | milestone | 150 | 1 exam |
| `slides_10` | Pembaca Aktif | 📖 | consistency | 20 | 10 slide |
| `videos_5` | Cinelearn | 🎬 | consistency | 30 | 5 video |
| `mindmap_5` | Pemeta Hebat | 🗺️ | consistency | 25 | 5 mindmap |
| `mastery_matematika` | Master Matematika | 🧮 | mastery | 200 | semua topik ≥ 0.8 |
| `mastery_ipa` | Sainstis Cilik | 🔬 | mastery | 200 | semua topik ≥ 0.8 |
| `mastery_ips` | Jelajah Dunia | 🌍 | mastery | 200 | semua topik ≥ 0.8 |

Mastery badge: `mastery >= 0.8` untuk **semua** topik di subject tersebut (Matematika/IPA/IPS).

Seed: `scripts/seed-badges.ts` — jalankan sekali setelah migrasi.

## Functions

### `handleActivity(params)`

Entry point utama. Langkah:

1. Insert `StudentActivity` record
2. Cek perfect score dari metadata → `getXpFor()`
3. `awardXp()` jika xp > 0
4. Cek first activity of the day → `updateStreak()`
5. `checkBadges()` → array badge code yang baru terbuka

Return: `{ xpAwarded, newBadges }`

### `awardXp(studentId, amount)`

```typescript
await prisma.student.update({
  where: { id: studentId },
  data: { xp: { increment: amount } },
});
```

### `updateStreak(studentId, activityDate)`

Logika ada di atas. Kalau streak naik, juga award `streak_day` XP (10).

### `checkBadges(studentId)`

- Ambil semua badge dari DB
- Hitung stats: attempt count, perfect scores, slides/videos/mindmaps
- Untuk `score_100`: filter attempts dengan `score === maxScore`
- Skip badge yang sudah dimiliki student
- Upsert `StudentBadge` + award `badge.xpReward`

## Wiring: `/api/students/activity`

```typescript
const activityResult = await handleActivity({
  studentId: student.id,
  materialId: materialId || undefined,
  type,
  metadata,
});
```

Response include `gamification.newBadges` kalau ada badge baru terbuka.
