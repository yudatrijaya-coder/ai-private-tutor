# AI Private Tutor — Audit Fix Implementation Plan

> **Execution:** Use parallel subagents per batch, review between batches. Hourly progress cron.

**Goal:** Fix 9 priority items from audit: security holes (webhook, middleware), cost leaks (pricing, caps), learning experience (server-side grading, real gamification, broken links, exam timer, adaptive difficulty, spaced repetition).

**Architecture:** Independent worksteams touch different files — parallelize by batch. Each batch produces a commit.

---

## Batch A — Security (no deps, pure additions)

### A1. Webhook secret-token + dedupe
- `src/app/api/bot/webhook/route.ts`: verify `X-Telegram-Bot-Api-Secret-Token`, ack 200 before processing, dedupe `update_id` via in-memory Set
- `src/bot/bot.ts`: add `secret_token` when setting webhook
- `.env.example`: add `TELEGRAM_WEBHOOK_SECRET`

### A2. Cost tracking fix
- `src/llm/client.ts`: normalize model name before pricing lookup (`model.split('/').pop()`), make `studentId` required, add daily token cap check

### A3. Auth middleware for admin API
- `src/middleware.ts`: add `/api/admin/*` to student check, or better: add admin auth check before `/api/admin/*` routes pass through

### A4. Missing DB indexes
- Add migration SQL for 6 indexes (non-blocking `CREATE INDEX CONCURRENTLY`)

## Batch B — Learning Experience

### B5. Server-side grading + immediate per-question feedback
- New: `POST /api/students/quizzes/[id]/grade` that calls `gradeAttempt()`
- Modify: `quiz/page.tsx` — after each answer, show ✅/❌ + explanation before next question; results come from server not client
- Remove: client-side `correctIndex` from quiz detail API response (still needed for grading but not rendered)
- Fix: quiz abandonment, masteryAfter NULL, ProgressSnap empty

### B6. Real streak/stars
- `(student)/layout.tsx`: replace hardcoded 🔥3/⭐120 with fetch from real student data (query unique activity days, total quiz count, total score)
- Add server component data fetching

### B7. Fix topic-tree quiz link
- `topic-tree/[subject]/page.tsx:206`: change `quizId=${data.id}` (material id) → fetch actual quizId
- Fix: dead end when clicking Quiz from topic tree

## Batch C — Polish

### C8. Daily token cap
- `llm/client.ts`: aggregate today's tokens by studentId, reject if > `DAILY_TOKEN_CAP`

### C9. Exam timer enforcement
- `quiz/page.tsx QuizScreen`: display countdown bar, auto-submit when time runs out

### C10. Adaptive difficulty routing
- `quiz/page.tsx QuizResult`: based on score: <40% → "baca slide dulu" link, 40-70% → retry with different questions, >80% → celebration

---

## Progress Reporting

A cronjob every 60 min that reports progress of the 10 items to the user via telegram.

## Files Changed Summary

| File | Batch | Change |
|------|-------|--------|
| `src/app/api/bot/webhook/route.ts` | A1 | secret-token, dedupe, ack-first |
| `src/bot/bot.ts` | A1 | setWebhook with secret_token |
| `src/llm/client.ts` | A2, C8 | pricing fix, required studentId, token cap |
| `src/middleware.ts` | A3 | admin API auth |
| Prisma migration | A4 | 6× CREATE INDEX CONCURRENTLY |
| New: `src/app/api/students/quizzes/[id]/grade/route.ts` | B5 | POST grade endpoint |
| `src/app/(student)/student/quiz/page.tsx` | B5, C9, C10 | per-question feedback, timer, adaptive routing |
| `src/app/api/students/quizzes/[id]/route.ts` | B5 | strip correctIndex from response |
| `src/app/(student)/layout.tsx` | B6 | real streak/stars |
| `src/app/(student)/student/topic-tree/[subject]/page.tsx` | B7 | fix quiz link |
| `.env.example` | A1 | TELEGRAM_WEBHOOK_SECRET |
