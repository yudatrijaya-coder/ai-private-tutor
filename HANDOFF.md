# Handoff — AI Private Tutor

> Terakhir update: 28 Juli 2026

---

## Template ↔ Student Model

Setiap level punya 1 **template** (`isTemplate=true`). Student baru WAJIB copy dari template, bukan regenerate.

| Grade | Template | Student |
|-------|----------|---------|
| SD_5 | **Syifa** (`d4c8f21a...`) ✅ 130/130 | Anton (`04e06244...`) ✅ copy from Syifa |
| SMP_1 | **Raihan** (`a61bcc63...`) ✅ 482/482 | — |
| SMA_2 | **SHOFI** (`98f0274e...`) ✅ 402/402 | — |

## Current State (28 Jul 2026)

| Student | Grade | Total | Ready | SIBI | Mindmap | Manim | YouTube | Quiz |
|---------|-------|:-----:|:-----:|:----:|:-------:|:-----:|:-------:|:----:|
| **Syifa** ✅ template SD_5 | 130 | 130 | 130 | 130 | 130 | 130 | 130 |
| **Anton** ✅ copy from Syifa | 130 | 130 | 130 | 130 | 130 | 130 | 130 |
| **Raihan** ✅ template SMP_1 | 482 | 482 | 482 | 468 | 481 | 482 | 482 |
| **SHOFI** ✅ template SMA_2 | 402 | 402 | 402 | 380 | 402 | 402 | 402 |

## SIBI Content Pipeline

- `scripts/sibi-match-and-generate.py` — ONLY utk template student
- `scripts/video_pipeline.py` — ONLY utk template student
- Student → copy persis dari template via `UPDATE ... FROM`
- SIBI books: 22 PDF Kurikulum Merdeka di `public/moodle-files/`

## Deployment

- VPS: ubuntu@43.133.151.242
- PM2: `ai-private-tutor` (port 3000, Caddy)
- DB: PostgreSQL 16, localhost:5432, `ai_private_tutor`
- Bot: @senangbelajar_bot (webhook)
