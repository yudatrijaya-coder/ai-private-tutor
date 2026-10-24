# Modul: Assessment Agent

> **Path:** `src/agents/assessment/`
> **Verifikasi:** 2026-10-25, commit `0207add`

---

## Fungsi

Membuat soal (LLM + bank statis), menilai jawaban, menghitung penguasaan per topik, lalu
menganalisis kelemahan untuk rencana perbaikan.

## File

| File | Fungsi |
|------|--------|
| `index.ts` | Barrel export |
| `types.ts` | `MASTERY_THRESHOLDS`, `RECENCY_WEIGHTS`, tipe soal |
| `generator.ts` | Generate soal — **primary path lewat `callLLM`**, bukan hanya bank statis |
| `grader.ts` | Nilai jawaban + hitung mastery |
| `exam.ts` | Susun exam gabungan dari beberapa topik |
| `worker.ts` | `processAssessmentGenerate`, `processAssessmentEvaluate`, `processImprovementAnalysis` |
| `__tests__/` | Unit test generator/grader |

## Queue

| Queue | Concurrency | Trigger |
|-------|------:|---------|
| `assessment-generate` | 3 | Materi siap (READY) |
| `assessment-evaluate` | 2 | Siswa submit jawaban |
| `improvement-analysis` | 1 | Setelah attempt dinilai |

## Ambang Penguasaan

Dari `types.ts`:

| Level | Rentang |
|---|---|
| `BEGINNER` | 0 – 0.4 |
| `DEVELOPING` | 0.4 – 0.6 |
| `PROFICIENT` | 0.6 – 0.8 |
| `MASTERED` | 0.8 – 1.0 |

`RECENCY_WEIGHTS` memberi bobot lebih besar pada attempt terbaru
(`newest 0.5`, `recent 0.3`, `older 0.15`, `oldest 0.05`).

## Data Flow

```
Generate:
Material READY → assessment-generate
    └── generator.ts → callLLM (SYSTEM_PROMPTS.assessment)
         └── Quiz tersimpan, ditautkan ke Material

Evaluate:
Siswa menjawab (bot / web) → POST /api/students/quizzes/[id]/grade
    ├── grader.ts → skor per soal
    ├── Attempt dibuat
    ├── mastery diperbarui (StudentSubjectMastery / TopicMastery)
    └── jawaban salah → masuk ReviewQueue (SM-2)

Improvement:
attemptId → improvement-analysis → ImprovementPlan
```

## Catatan

Bank statis `src/data/quiz-bank-*.ts` (540 SD / 495 SMP / 615 SMA) adalah **sumber seed
dan template exam**, bukan satu-satunya sumber soal runtime. Soal runtime hidup di tabel
`Quiz` (1.315 baris per 2026-10-25).
