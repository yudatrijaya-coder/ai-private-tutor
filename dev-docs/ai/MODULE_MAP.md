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
| **Student** | `src/app/(student)/student/*` | `src/app/api/students/*` | | `prisma/schema.prisma` |
| **Dashboard** | `src/app/(dashboard)/dashboard/*` | | `StudentCard.tsx` | |
| **Auth** | `src/app/(auth)/*` | `src/middleware.ts` | | |

## Shared Infrastructure Map

| Area | Path | Notes |
|------|------|-------|
| Prisma Client | `src/lib/prisma.ts` | Singleton with `@prisma/adapter-pg` |
| LLM Client | `src/llm/client.ts` | 9Router with fallback chain |
| Queue Runner | `src/queue/runner.ts` | BullMQ + in-memory |
| Safety System | `src/bot/safety.ts` | Komunikasi aman |
| Guardian Notifier | `src/agents/guardian/notifier.ts` | Notifikasi ke parent |
