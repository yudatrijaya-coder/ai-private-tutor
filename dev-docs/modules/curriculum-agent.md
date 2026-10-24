# Modul: Curriculum Agent

> **Path:** `src/agents/curriculum/`
> **Verifikasi:** 2026-10-25, commit `0207add`

---

## Fungsi

Membangun kurikulum seorang siswa dari bank data statis (SIBI/Kurikulum Merdeka), lalu memverifikasi hasil scrape materi. **Tidak memakai LLM** — seluruh isi berasal dari `src/data/curriculum-topics.ts` dan `src/data/curriculum-content.ts`.

## File

| File | Fungsi |
|------|--------|
| `index.ts` | Barrel export |
| `service.ts` | `generateCurriculumDraft()`, `replaceCurriculumForStudent()` |
| `worker.ts` | `processCurriculumReviewJob()` — consumer queue `curriculum-review` |

## Queue

| Queue | Concurrency (definitions.ts) | Trigger |
|-------|------:|---------|
| `curriculum-review` | 2 | Worker memanggil setelah content selesai |

## Data Flow

```
POST /api/students {action:"trigger", studentId, stages:["curriculum"]}
    │
    ▼
generateCurriculumDraft(studentId, gradeLevel)
    ├── GRADE_TOPICS[grade]  → daftar topik per minggu
    ├── getContent(topic)    → isi materi
    ├── Quiz dari bank statis (SD5 / SMP7 / SMA11)
    └── replaceCurriculumForStudent() → tulis Curriculum + Material
         (versi baru = version + 1; versi lama tetap ada di DB)
```

## Aturan Penting

Satu siswa dapat memiliki beberapa `Curriculum` (v1, v3, …). Yang berlaku hanya versi tertinggi —
selalu baca lewat `ACTIVE_CURRICULUM_ORDER` di `src/lib/curriculum-active.ts`, jangan
menggabungkan semua kurikulum milik siswa (akan menduplikasi materi dan merusak `weekOrder`).

## Dependencies

- **Prisma** — `Curriculum`, `Material`, `Quiz`
- **Static data** — `src/data/curriculum-topics.ts`, `curriculum-content.ts`, `quiz-bank-*.ts`
- **Queue** — `content-scrape` dipicu setelah materi dibuat
