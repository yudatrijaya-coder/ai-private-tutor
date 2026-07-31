# Cron Endpoints

> Terakhir update: 31 Juli 2026

## 1. `GET /api/cron/progress-snap`

Weekly snapshot per-student per-subject. Dipanggil setiap Minggu 23:00 via cron.

```typescript
export async function GET() {
  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
  });
  // For each student, for each subject:
  //   - quiz attempts → mastery = totalScore / totalMax
  //   - studentActivity (last 7 days) → studyMinutes
  //   - Create ProgressSnap row
}
```

### ProgressSnap fields

| Field | Source |
|-------|--------|
| `studentId` | Student |
| `subject` | dari Material (deduplicate) |
| `mastery` | `totalScore / totalMax` seluruh quiz |
| `quizCount` | jumlah attempt |
| `totalScore` | sum score |
| `totalMax` | sum maxScore |
| `studyMinutes` | `sum(timeSpent) / 60` dari aktivitas 7 hari terakhir |
| `snapDate` | `new Date()` |

**7 snaps created** → 7 snapshots per student per subject.

## 2. `GET /api/cron/daily-nudge`

Telegram reminder jika gap >= 2 hari sejak aktivitas terakhir.

| Condition | Action |
|-----------|--------|
| `lastActivity === today` | skip |
| `lastActivity === null` | skip (never studied) |
| `daysSince < 2` | skip |
| `daysSince >= 2` | send nudge |

### Nudge message

```
🌅 Selamat pagi, {nama}!
Streak kamu sedang di {N} hari — jangan putus!
Hari ini belum belajar? Yuk mulai 10 menit aja! 📚

[🧠 Mulai Quiz] [📖 Baca Materi]
```

Keyboard: inline buttons ke `/student/quiz` dan `/student/slides`.

Hanya student dengan `status: "ACTIVE"` dan `telegramId: not null`.

## 3. `GET /api/cron/guardian-report`

Parent weekly digest — enhanced dengan gamification data.

### Data per student

| Data | Source |
|------|--------|
| Quiz count (week) | `Attempt` where `createdAt >= 7 days ago` |
| Rata-rata skor | `totalScore / totalMax` |
| Waktu belajar | `sum(timeSpent) / 60` |
| Streak | `Student.currentStreak` |
| Total XP | `Student.xp` |
| Badge baru (max 3) | `StudentBadge.badge` (latest) |
| Topik mastery | `ProgressSnap` terbaru |

### Message tone

| Score | Tone |
|-------|------|
| ≥ 80% | 🌟 {student} belajar sangat baik minggu ini! |
| ≥ 50% | 👍 {student} sudah berusaha, tetap semangat! |
| < 50% | 💪 {student} butuh dukungan extra minggu ini. |

Hanya student dengan `parentTelegramId: not null` dan `status: "ACTIVE"`.

## Common: `isTemplate` Filter

Semua cron endpoint **termasuk** ACTIVE students — tidak ada filter `isTemplate`. Template student (Syifa, Raihan, SHOFI) juga di-snap, di-nudge, dan dilaporkan ke parent.