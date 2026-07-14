# Modul: Content Agent

> **Path:** `src/agents/content/`
> **File Utama:** `scrape.ts`, `worker.ts`

---

## Fungsi

Scrape materi pembelajaran dari internet, extract teks bersih, dan siapkan untuk quiz generation. Multi-source fallback — kalau satu sumber gagal, coba sumber lain.

## File Structure

| File | Fungsi |
|------|--------|
| `index.ts` | Barrel exports |
| `scrape.ts` | Web scraper — extract teks dari HTML/URL |
| `fallback.ts` | Multi-source fallback logic |
| `ethics.ts` | Content ethics filter |
| `worker.ts` | Queue consumer untuk `content-scrape` |

## Queue

| Queue | Concurrency | Trigger |
|-------|-------------|---------|
| `content-scrape` | 2 | Curriculum selesai generate |

## Data Flow

```
Curriculum → trigger content-scrape queue
    │
    ▼
Content Agent Worker
    ├── Coba sumber utama → gagal? → fallback.ts
    ├── Extract teks → clean HTML
    ├── Ethics filter → scan konten tidak pantas
    └── Update Material status → trigger curriculum-review
```

## Key Logic

- **Multi-source fallback** — urutan sumber dicoba sampai berhasil
- **Scrape per priority** — student butuh week_1 dulu, hemat bandwidth
- **Extract teks** — dari HTML page dan PDF
- **Ethics filter** — scan konten untuk safety
