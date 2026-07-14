# CURRENT_STATE

> **Status:** DATA FILE — AI WAJIB mengupdate setiap akhir task/batch.
> **Purpose:** Snapshot kondisi terkini development.

---

## Feature Maturity

| Feature | Status | Notes |
|---------|--------|-------|
| Mindmap Premium | ✅ Production | Radial layout, Lucide icons, CSS animations, 3-level nodes |
| Quiz Bank | ✅ Production | 1650 soal (SD540, SMP495, SMA615) + exam generator |
| Curriculum SIBI | ✅ Production | SD5, SMP1, SMA2 dari PDF resmi |
| Exam Generator | ✅ Production | Template + detail page |
| Pipeline Trigger | ✅ Production | Dashboard curriculum/content/quiz/jadwal |
| LLM Integration | ✅ Production | 9Router combo + fallback chain |
| Telegram Bot | ✅ Production | Webhook mode, 3 persona, homework/reminder/schedule |
| Student Web Auth | ✅ Production | Login dengan password (bcrypt), ganti password, share link |
| Student Landing Page | ✅ Production | Quote rotator, recommendation carousel, quick actions, interactive schedule |
| Template System | ✅ Production | New students copy curriculum from Syifa/Raihan/SHOFI per grade level |
| Schedule System | ✅ Production | 60/30/10 assignment, H-1/T-30 reminders, daily brief, auto-assign |
| Admin Dashboard | ✅ Production | Manage students, curriculum, quizzes, set password |
| WhatsApp Bot | 🟡 In Progress | Next.js webhook + QR auth |

## What Was Done Recently

- **Docs migration complete**: `dev-docs/modules/` (11 files) + `dev-docs/architecture/` (4 files revised to Indonesian) + web docs updated
- **Password management**: Student login with bcrypt + set/change password via web + admin
- **Bot password support**: LLM can set/change password with [PASSWORD] command
- **Navigation**: Back button in student header (← on non-home pages) + return-to-home on password page
- **Schedule system**: Full cron pipeline (every 3m) for session reminders (H-1, T-30, missed), daily brief (6-10AM), auto-assignment via 60/30/10
- **Schedule bot commands**: [SCHEDULE], [SCHEDULE:WEEK], [SCHEDULE:SET], [SCHEDULE:ASSIGN]
- **Auto-default config**: New students get default schedule config (1x/day 16:00, exclude Sunday)
- **Student Web improvements**: Quiz page fixed — subject picker when no subject param, no more infinite loading
- **Landing page revamp**: Motivational quote rotator (auto-roll 8s, 15 tokoh), recommendation carousel (3 cards/page, auto-roll 6s), quick action buttons (Quiz/Exam/Mindmap/Buku), interactive schedule with per-item action buttons
- **Template system**: Syifa/Raihan/SHOFI marked as template. New student registered at same grade level gets deep-copied curriculum (materials, quizzes, slides, mindmaps) instead of generating from data banks
- **Default password + credential notification**: New students get auto-generated password (belajar123) and receive Telegram notification with student ID, password, and dashboard link on registration
- **Backfill credentials**: Exported script `scripts/send-credentials.ts` to send credentials to existing students

## Known Issues / Blockers

- WhatsApp Bot masih dalam pengembangan (QR auth flow)
- Tidak ada blocker saat ini

## Cron Jobs

| Name | Schedule | Script / Endpoint | Purpose |
|------|----------|-------------------|---------|
| Schedule + Reminder Sweep | every 3m | `/api/reminders/check` + `/api/cron/schedule-sweep` | Personal reminders + schedule H-1/T-30/missed + daily brief + auto-assign |
