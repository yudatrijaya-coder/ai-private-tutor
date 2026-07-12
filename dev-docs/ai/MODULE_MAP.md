# MODULE_MAP

> **Status:** DATA FILE — AI WAJIB mengupdate saat ada modul baru atau perubahan struktur modul.
> **Purpose:** Mapping visual antara modul bisnis dan komponen kode.

---

## Module to Code Map

| Module | Pages | API Routes | Components | Data |
|--------|-------|-----------|------------|------|
| **Tutor Agent** | `src/app/(dashboard)/dashboard/agents/` | `src/app/api/bot/webhook/route.ts` | `PipelineTrigger.tsx` | `src/bot/agent/tutor.ts` |
| **Quiz** | `src/app/(dashboard)/dashboard/quizzes/*` | `src/app/api/exam/route.ts`, `api/students/quizzes/*` | | `src/data/quiz-bank-*.ts` |
| **Curriculum** | `src/app/(dashboard)/dashboard/curriculum/*` | `src/app/api/students/route.ts` | `PaginatedTable.tsx`, `StudentDetailView.tsx` | `src/data/curriculum-topics-*.ts` |
| **Mindmap** | `src/app/(student)/student/mindmap/[subject]/` | | `ReactFlowMindmap.tsx`, `CustomNode.tsx`, `iconMap.ts`, `animMap.ts` | `src/lib/mindmap-template.ts` |
| **Media** | `src/app/(dashboard)/dashboard/preview/slides/` | `src/app/api/media/*` | | `src/agents/media/*` |
| **Student Web** | `src/app/(student)/student/*` | `src/app/api/student/*`, `src/app/api/auth/student-login` | `ProfileLink`, `PasswordPage` | `prisma/schema.prisma` |
| **Auth** | `src/app/(auth)/*` | `src/app/api/auth/*` | `StudentLayout` | `middleware.ts` |
| **Schedule** | | `src/app/api/cron/schedule-sweep` | | `src/agents/scheduler/assigner.ts`, `src/agents/scheduler/reminder.ts` |
| **Dashboard Admin** | `src/app/(dashboard)/dashboard/*` | `src/app/api/admin/*` | `StudentCard.tsx`, `StatsBar.tsx` | |
| **Guardian** | | `src/app/api/cron/guardian-report` | | `src/agents/guardian/*` |

## Shared Infrastructure Map

| Area | Path | Notes |
|------|------|-------|
| Prisma Client | `src/lib/prisma.ts` | Singleton with `@prisma/adapter-pg` + `pg.Pool` |
| LLM Client | `src/llm/client.ts` | 9Router with fallback chain |
| Queue Runner | `src/queue/runner.ts` | BullMQ + in-memory |
| Safety System | `src/bot/safety.ts` | Komunikasi aman |
| Guardian Notifier | `src/agents/guardian/notifier.ts` | Notifikasi ke parent |

## Cron Jobs (Hermes)

| Job | Schedule | Endpoint |
|-----|----------|----------|
| Schedule + Reminder Sweep | every 3m | `/api/reminders/check` + `/api/cron/schedule-sweep` |
