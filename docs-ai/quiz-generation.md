# Quiz Generation Pipeline

> Terakhir update: 31 Juli 2026

## Overview

Scripts di `scripts/` untuk generate quiz ke PostgreSQL. Semua routing via **9Router** (`localhost:20128`).

## Files

| Script | Purpose |
|--------|---------|
| `gen-quizzes-missing.js` | Batch awal — 59 materials tanpa quiz |
| `gen-quizzes-retry.js` | Retry 6 yang gagal di batch awal |
| `gen-quizzes-final.js` | Retry akhir 2 yang masih gagal (lower temp) |

## How It Works

1. Query PostgreSQL untuk material tanpa quiz: `NOT EXISTS (SELECT 1 FROM "Quiz" q WHERE q."materialId" = m.id)`
2. Panggil 9Router (`hermes` model) dengan system prompt untuk generate 5 soal
3. Parse JSON array dari response, insert ke `"Quiz"` table

## 9Router Response Handling

Response 9Router punya format khusus:

- Body adalah JSON + trailing `\ndata: [DONE]\n`
- Response wrapper: `d.data?.choices || d.choices`
- Content bisa empty (`finish_reason="length"`) — semua token habis di reasoning

**JS Fix:**
```js
let rawText = await r.text();
rawText = rawText.replace(/\s*data:\s*\[DONE\]\s*$/, "").trim();
const d = JSON.parse(rawText);
const choices = d.data?.choices || d.choices;
```

## Prompt Strategy

| Parameter | batch1 | batch2 | batch3 |
|-----------|--------|--------|--------|
| temperature | 0.7 | 0.5 | 0.3 |
| max_tokens | 4096 | 2000 | 3000 |
| retries | 3 | 3 | 4 |
| success rate | 53/59 | 4/6 | 2/2 |

Lower temperature + explicit instruction format → higher JSON compliance.

## DB Connection

Gunakan `pg` Pool dengan explicit credentials (bukan `DATABASE_URL`):

```js
const pool = new Pool({
  host: "localhost", port: 5432, user: "tutor",
  password: process.env.PGPASSWORD || "tutor123",
  database: "ai_private_tutor",
});
```

`DATABASE_URL` di `.env` punya password yang di-mask jadi `***`.
