# Modul: Curriculum Agent

> **Path:** `src/agents/curriculum/`
> **File Utama:** `service.ts`, `worker.ts`

---

## Fungsi

Generate dan manage kurikulum untuk setiap student berdasarkan data statis dari SIBI. Tidak menggunakan LLM untuk generate — semua data berasal dari static data banks.

## File Structure

| File | Fungsi |
|------|--------|
| `index.ts` | Barrel exports |
| `service.ts` | Service utama — generate curriculum dari `curriculum-topics.ts` dan `curriculum-content.ts` |
| `worker.ts` | Queue consumer untuk `curriculum-review` |

## Queue

| Queue | Concurrency | Trigger |
|-------|-------------|---------|
| `curriculum-review` | 2 | Content selesai scrape |

## Data Flow

```
Pipeline Trigger (dashboard)
    │
    ▼
Curriculum Service → Baca curriculum-topics.ts → Match dengan grade student
    │
    ├── Buat Curriculum record di DB
    ├── Buat Material records (topik per minggu)
    └── Trigger content-scrape queue
```

## Key Logic (`service.ts`)

- `generateCurriculum(studentId, gradeLevel)` — Generate full curriculum dari data statis
- `reviewMaterial(materialId)` — Verifikasi hasil scrape, set status material
- Data sumber: `src/data/curriculum-topics.ts`, `src/data/curriculum-content.ts`
- Tidak menggunakan LLM sama sekali (semua dari data statis pre-generated)

## Dependencies

- **Prisma** — CRUD curriculum & material
- **Queue** — Trigger content-scrape setelah curriculum jadi
- **Static Data** — `src/data/curriculum-topics.ts`, `src/data/curriculum-content.ts`
