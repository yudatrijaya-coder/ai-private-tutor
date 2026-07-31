# Handoff — AI Private Tutor

> Terakhir update: 31 Juli 2026

---

## Template ↔ Student Model

Setiap level punya 1 **template** (`isTemplate=true`). Student baru WAJIB copy dari template, bukan regenerate.

| Grade | Template | Student |
|-------|----------|---------|
| SD_5 | **Syifa** (`d4c8f21a...`) ✅ 130/130 | Anton (`04e06244...`) ✅ copy from Syifa |
| SMP_1 | **Raihan** (`a61bcc63...`) ✅ 482/482 | — |
| SMA_2 | **SHOFI** (`98f0274e...`) ✅ 402/402 | — |

## Current State (31 Jul 2026)

All gaps resolved. Full coverage across all students.

| Student | Grade | Total | Slide | Video | Quiz |
|---------|-------|:-----:|:-----:|:-----:|:----:|
| **Syifa** ✅ template SD_5 | 130 | 130 | 130 | 130 |
| **Anton** ✅ copy from Syifa | 130 | 130 | 130 | 130 |
| **Raihan** ✅ template SMP_1 | 482 | 482 | 482 | 482 |
| **SHOFI** ✅ template SMA_2 | 402 | 402 | 402 | 402 |

### What was done (31 Jul 2026)
- **Slide sync:** 30 Raihan material — `rawContent` → `metadata.slide` via SQL
- **Quiz generation:** 59 missing quizzes created across Anton (15), SHOFI (43), Syifa (1)
  - 3-pass pipeline via 9Router (`gen-quizzes-missing.js` → `-retry` → `-final`)
  - All 59/59 success, 1,180 total quizzes in DB
- **Docs:** `docs-ai/quiz-generation.md`, `docs-ai/slide-sync.md`
- **Gamification:** XP, streak, badge engine (14 badges seeded via `scripts/seed-badges.ts`)
  - `src/lib/gamification.ts` — `handleActivity()`, `awardXp()`, `updateStreak()`, `checkBadges()`
  - Wired to `POST /api/students/activity`
- **Spaced repetition:** SM-2 algorithm on wrong answers
  - `src/lib/spaced-repetition.ts` — `computeSM2()`, `addToReviewQueue()`, `gradeReviewItem()`, `getDueReviews()`
  - Wrong answers auto-added to queue from `activity/route.ts` at attempt creation
- **ProgressSnap weekly cron:** 7 snaps created per student per subject
  - `GET /api/cron/progress-snap` — weekly snapshot per student (ACTIVE only)
- **Daily nudge + parent digest:**
  - `GET /api/cron/daily-nudge` — Telegram reminder if gap >= 2 days
  - `GET /api/cron/guardian-report` — enhanced parent weekly digest with XP/streak/badge
- **Bot:** 6 new commands (`/badge`, `/review`, `/nilai`, `/pr`, `/help` + aliases)
  - Prompt refactored to single source of truth (`src/bot/agent/capabilities.ts`)
  - Safety fix: buffer-and-scan per paragraph in `streamMessage()`
  - Command routing in webhook mode via `routeCommand()` from `message.ts`
- **New files:**
  - `src/lib/gamification.ts`
  - `src/lib/spaced-repetition.ts`
  - `src/bot/agent/capabilities.ts`
  - `src/bot/commands.ts`
  - `src/app/api/cron/progress-snap/route.ts`
  - `src/app/api/cron/daily-nudge/route.ts`
  - `scripts/seed-badges.ts`
  - `docs-ai/gamification-engine.md`
  - `docs-ai/spaced-repetition.md`
  - `docs-ai/bot-enhancements.md`
  - `docs-ai/cron-endpoints.md`

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
