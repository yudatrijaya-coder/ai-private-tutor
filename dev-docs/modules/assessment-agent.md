# Modul: Assessment Agent

> **Path:** `src/agents/assessment/`
> **File Utama:** `generator.ts`, `grader.ts`, `exam.ts`, `worker.ts`

---

## Fungsi

Generate quiz & exam otomatis dari materi, koreksi jawaban siswa, tracking mastery level per topik, adaptive difficulty.

## File Structure

| File | Fungsi |
|------|--------|
| `index.ts` | Barrel exports (generateQuiz, gradeAttempt, calculateMastery, dll) |
| `types.ts` | Type definitions (QuestionData, QuizData, MasteryLevel, dll) |
| `generator.ts` | Generate quiz dari materi + static quiz bank |
| `grader.ts` | Koreksi jawaban + hitung mastery |
| `exam.ts` | Generate composite exam dari multiple topik |
| `worker.ts` | Queue consumer untuk `assessment-generate` dan `assessment-evaluate` |

## Queue

| Queue | Concurrency | Trigger |
|-------|-------------|---------|
| `assessment-generate` | 3 | Content siap (READY) |
| `assessment-evaluate` | 2 | Student submit jawaban |

## Data Flow

```
Generate:
Content READY → assessment-generate queue
    │
    ▼
Generator → Ambil quiz dari static bank (per topik)
    │
    └── Assign Quiz ke Student

Evaluate:
Student submit jawaban (via bot/dashboard)
    │
    ▼
assessment-evaluate queue → Grader
    ├── Koreksi jawaban
    ├── Hitung mastery level
    └── Update ProgressSnap

Exam:
POST /api/exam → generator.ts
    ├── Ambil quiz dari bank (multi-topik)
    └── Composite exam dari beberapa materi
```

## Key Logic

- **Quiz dari static bank** — 1650 soal pre-generated (SD 540, SMP 495, SMA 615)
- **Mastery thresholds** — di `types.ts`: MASTERY_THRESHOLDS, RECENCY_WEIGHTS
- **Adaptive** — difficulty menyesuaikan performa siswa
- **Update Guardian** — hasil assessment dikirim ke Guardian Agent untuk weekly report
