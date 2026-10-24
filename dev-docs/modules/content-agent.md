# Modul: Content Agent

> **Path:** `src/agents/content/`
> **Verifikasi:** 2026-10-25, commit `0207add`

---

## Fungsi

Mengambil materi pembelajaran dari sumber web terkurasi, memfilter konten tidak pantas, lalu menandai materi siap dipakai. Punya allowlist domain dan rate limiter — bukan scraper bebas.

## File

| File | Fungsi |
|------|--------|
| `index.ts` | Barrel export |
| `scrape.ts` | `isAllowedDomain()`, `filterContent()`, `fetchWithCheerio()`, `safeFetchText()` |
| `ethics.ts` | `ETHICS` (robots.txt, delay 2 s, maks 50 halaman/domain), `truncateToEthicsLimit()` |
| `fallback.ts` | `resolveSources()`, `emptyFallback()` — urutan sumber cadangan |
| `worker.ts` | `processScrapeJob()` — consumer queue `content-scrape` |

## Queue

| Queue | Concurrency | Trigger |
|-------|------:|---------|
| `content-scrape` | 2 | Curriculum selesai generate |

## Kebijakan Sumber

- **Allowlist** (`ALLOWED_DOMAINS`): `kemdikbud.go.id`, `ruangguru.com`, `quipper.com`,
  `zenius.net`, `academia.edu`, `scholar.google.com`, `wikipedia.org`, `sma*.sch.id`, `smp*.sch.id`.
- **Blocklist** (`BLOCKED_DOMAIN_FRAGMENTS`): porn, sex, adult, gambling, forum, chat, social-media.
- **Batas etika**: hormati `robots.txt`, jeda minimal 2 detik antar request per domain,
  maksimum 50 halaman per domain per sesi, UA pengenal.

## Data Flow

```
content-scrape queue
    │
    ▼
fetchWithCheerio(url) → ambil HTML
    ├── isAllowedDomain()  → tolak domain di luar allowlist
    ├── filterContent()    → buang konten dewasa/kata terlarang
    ├── truncateToEthicsLimit() → potong sesuai batas
    └── tulis Material.rawContent → status diproses lanjut
```

## Catatan

`slice` konten yang masuk ke prompt LLM dibatasi agar tidak meledak token; ringkasan dan
pembersihan akhir terjadi di tahap berikutnya (`curriculum-review`, `assessment-generate`).
