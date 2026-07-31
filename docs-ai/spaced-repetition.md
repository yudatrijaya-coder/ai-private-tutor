# Spaced Repetition (SM-2)

> Terakhir update: 31 Juli 2026

## Overview

`src/lib/spaced-repetition.ts` implementasi algoritma SM-2 untuk mengulang soal yang pernah salah. Wrong answers otomatis masuk queue saat quiz dinilai.

## SM-2 Algorithm

### `computeSM2(quality, prevEase, prevInterval, prevReps, prevLapses)`

| quality | Behavior |
|---------|----------|
| 0–2 (salah) | reps = 0, interval = 1, lapses++, ease decrease |
| 3 (keras) | reps++, interval baru |
| 4–5 (benar) | reps++, interval = prevInterval × ease, mastered = true kalau reps >= 3 |

```
ease = max(1.3, prevEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
```

| q | ease delta |
|---|-----------|
| 5 | +0.1 |
| 4 | -0.08 |
| 3 | -0.14 |
| 2 | -0.20 |
| 1 | -0.26 |
| 0 | -0.32 |

Return: `{ easeFactor, intervalDays, repetitions, lapses, mastered }`

`mastered = q >= 4 && reps >= 3`

## ReviewQueue Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (PK) | UUID |
| `studentId` | string (FK) | Student UUID |
| `quizId` | string (FK) | Quiz UUID |
| `questionIdx` | int | Index soal dalam quiz |
| `subject` | string | Mata pelajaran |
| `topic` | string? | Topik opsional |
| `easeFactor` | float | Default 2.5 |
| `intervalDays` | int | Hari sebelum review berikutnya (default 1) |
| `repetitions` | int | Berapa kali dijawab benar |
| `lapses` | int | Berapa kali dijawab salah |
| `mastered` | bool | Sudah dikuasai |
| `dueAt` | datetime | Jatuh tempo review |
| `lastReviewAt` | datetime? | Last review timestamp |

Unique constraint: `@@unique([studentId, quizId, questionIdx])` — 1 row per soal per student.

## Adding Wrong Answers

Dipanggil dari `POST /api/students/activity` — setelah `Attempt` dibuat.

```typescript
const questions = (quiz?.questions as Array<{ correctAnswer?: string }>) ?? [];
for (const [idx, ans] of answers.entries()) {
  const question = questions[idx];
  if (!question) continue;
  const isCorrect = String(ans).trim().toUpperCase() === String(question.correctAnswer).trim().toUpperCase();
  if (!isCorrect) {
    await addToReviewQueue(student.id, quizId, idx, subject, topic);
  }
}
```

- `dueAt` = besok (`setDate(getDate() + 1)`)
- `upsert`: kalau soal sudah ada di queue, reset reps=0, lapses++, interval=1
- Quiz baru → create baru

## Functions

### `addToReviewQueue(studentId, quizId, questionIdx, subject, topic?)`

Upsert ke `ReviewQueue`. Kalau sudah ada, update: dueAt=besok, mastered=false, lapses++, reps=0, interval=1.

### `gradeReviewItem(reviewId, quality)`

1. Ambil item dari DB
2. `computeSM2()` → state baru
3. `dueAt = now + intervalDays`
4. `lastReviewAt = now()`
5. Update DB dengan hasil

### `getDueReviews(studentId, limit=10)`

```typescript
prisma.reviewQueue.findMany({
  where: { studentId, mastered: false, dueAt: { lte: new Date() } },
  orderBy: { dueAt: "asc" },
  take: limit,
  include: { quiz: { select: { questions: true } } },
});
```

## Bot `/review` Command

Di `src/bot/commands.ts` — `sendReview(ctx, student)`:

1. `getDueReviews(student.id, 10)`
2. Kalau kosong: cek apakah ada yang belum jatuh tempo (`mastered=false`) → "belum jatuh tempo" vs "semua sudah dikuasai"
3. Kalau ada: group by subject, tampilkan jumlah soal per subject + link ke dashboard

```typescript
// src/bot/commands.ts
export async function sendReview(ctx: Context, student: Student): Promise<void> {
  const due = await getDueReviews(student.id, 10);
  // ...
}
```
