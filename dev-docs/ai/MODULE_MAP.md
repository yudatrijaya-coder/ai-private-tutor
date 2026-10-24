# MODULE_MAP

> **Status:** DATA FILE — perbarui saat modul baru muncul atau path berubah.
> **Verifikasi terakhir:** 2026-10-25, commit `0207add`.

---

## Modul Bisnis → Kode

| Modul | Halaman | API | Logika | Data |
|-------|---------|-----|--------|------|
| **Bot Telegram** | — | `POST /api/bot/webhook` | `src/bot/handlers/message.ts` (router utama), `src/bot/commands.ts` (slash command), `src/bot/state-machine.ts` (callback & state) | `ChatLog`, `SessionState` |
| **Tutor LLM** | — | (lewat webhook) | `src/bot/agent/tutor.ts`, `src/bot/agent/capabilities.ts`, `src/bot/safety.ts`, `src/llm/client.ts` | `ChatLog`, `ApiUsage` |
| **Quiz** | `(student)/student/quiz` | `/api/students/quizzes`, `/api/students/quizzes/[id]/grade`, `/api/students/activity` | `src/bot/handlers/quiz.ts`, `src/lib/quiz-grading.ts` | `Quiz`, `Attempt` |
| **Drill & Speedmath** | — | (lewat webhook) | `src/bot/handlers/quiz.ts` (`handleDrillStart`), `src/bot/handlers/speedmath.ts`, `src/data/math-enhancement-smp7.ts` | `Attempt` |
| **Review (SM-2)** | `(student)/student/review` | `/api/students/review` | `src/lib/spaced-repetition.ts` | `ReviewQueue` |
| **Exam** | `(student)/student/exam`, `(dashboard)/dashboard/quizzes/exam/*` | `/api/exam`, `/api/exam/weekly`, `/api/exam/template`, `/api/exam/attempt`, `/api/exam/analyze`, `/api/exam/apply-plan` | `src/services/weekly-exam-generator.ts`, `src/lib/quiz-grading.ts` | `Exam`, `ExamQuestion`, `ExamAttempt`, `ExamSchedule`, `ImprovementPlan` |
| **Kurikulum & Materi** | `(dashboard)/dashboard/curriculum`, `(student)/student/subject/[subject]` | `/api/admin/curriculum`, `/api/curriculum/batch-generate`, `/api/curriculum/regenerate`, `/api/students/material/[id]` | `src/agents/curriculum/*`, `src/lib/prosem*.ts`, `src/lib/curriculum-active.ts` | `Curriculum`, `Material` |
| **Prosem** | — | — | `src/lib/prosem.ts`, `src/lib/student-prosem-context.ts`, `src/data/prosem/` | `Material` (+ `metadata`) |
| **Mindmap** | `(student)/student/mindmap/[subject]`, `/big-mindmap`, `/mindmap-sample` | `/api/mindmap/screenshot`, `/api/curriculum/batch-mindmap` | `src/components/mindmap/*` (6 file), `src/lib/mindmap-template.ts`, `src/lib/mindmap-renderer.ts` | `Material.metadata` |
| **Slides & Video** | `(student)/student/slides/[id]`, `(dashboard)/dashboard/preview/slides/[id]` | `/api/media/render`, `/api/media/tts` | `src/agents/media/*`, `src/lib/slide-html.ts`, `src/lib/video-url.ts` | `Material.rawContent`, `metadata` |
| **YouTube** | `(student)/student/videos` | `/api/youtube/transcript` | `src/bot/handlers/youtube.ts` | `src/data/youtube-*.ts`, `Material.videoUrl` |
| **Gamifikasi** | `(student)/student/achievement`, `/leaderboard` | `/api/students/gamification`, `/api/students/achievement-extra`, `/api/students/leaderboard` | `src/lib/gamification.ts` | `Badge`, `StudentBadge`, `Student.xp/currentStreak` |
| **Progress & Mastery** | `(student)/student/progress` | `/api/students/mastery`, `/api/students/weak-topics`, `/api/students/self-compare`, `/api/student/progress` | `src/lib/student-snapshot.ts`, `src/lib/intervention-health.ts` | `StudentSubjectMastery`, `TopicMastery`, `ProgressSnap`, `StudentActivity` |
| **Jadwal Belajar** | `(student)/student` (interaktif) | `/api/cron/schedule-sweep` | `src/agents/scheduler/{assigner,reminder,worker}.ts`, `src/lib/schedule/*` | `ScheduleSession`, `Student.scheduleConfig` |
| **Jadwal Sekolah** | — | (lewat webhook) | `src/bot/handlers/school-schedule.ts`, `src/data/school-schedule.ts` | SIKumbang (eksternal) |
| **Auth Siswa** | `(auth)/login/student`, `(student)/student/password` | `/api/auth/student-login`, `/api/auth/student/set-password`, `/api/auth/student/reset-password`, `/api/student/password` | `src/middleware.ts`, `src/lib/auth/*` | `Student.passwordHash` |
| **Auth Admin/Parent** | `(auth)/login` | `/api/auth/[...nextauth]`, `/api/auth/me` | `src/lib/auth/*`, NextAuth v5 | `User`, `Account`, `Session` |
| **Admin Dashboard** | `(dashboard)/dashboard/*` | `/api/admin/*` (18 route) | — | semua tabel |
| **Guardian** | — | `/api/cron/guardian-report`, `/api/cron/guardian-monthly`, `/api/student/guardian-link` | `src/agents/guardian/*` | `Student.parentTelegramId`, `Intervention` |
| **Admission** | `(dashboard)/dashboard/students/new` | `/api/admission`, `/api/admin/students/approve` | `src/agents/guardian/*` | `Student` |
| **Landing Page** | `/` | — | `src/app/sections/landing/*` (10 komponen) | `src/data/quotes.ts`, `subscription.ts` |

## Infrastruktur Bersama

| Area | Path | Catatan |
|------|------|---------|
| Prisma client | `src/lib/prisma.ts` | Singleton `PrismaClient` + `PrismaPg` + `pg.Pool`; baca `PG*`, bukan `DATABASE_URL` |
| Pilih kurikulum aktif | `src/lib/curriculum-active.ts` | `ACTIVE_CURRICULUM_ORDER` = `version desc, createdAt desc` |
| LLM client | `src/llm/client.ts` | Routing + fallback + budget + pricing |
| Cron guard | `src/lib/cron/guard.ts` | `checkCronSecret()` fail-closed + `logCronRun()` ke `AgentLog` |
| Queue | `src/queue/{defs,runner,local}.ts` | BullMQ → fallback in-memory |
| Registrasi worker | `src/instrumentation.ts` | 10 queue processor |
| Safety | `src/bot/safety.ts` | Filter komunikasi; dipakai `streamMessage()` |
| Logger / monitoring | `src/lib/logger.ts`, `src/lib/monitoring.ts` | — |
| Rate limit | `src/lib/rate-limit.ts` | — |

## Endpoint per Prefix (73 route)

| Prefix | Jumlah | Auth |
|--------|-------:|------|
| `/api/admin/*` | 18 | Admin dashboard (8 sub-prefix) |
| `/api/students/*` | 18 | Session siswa (cookie JWT) |
| `/api/student/*` | 5 | Session siswa |
| `/api/auth/*` | 5 | Varied |
| `/api/cron/*` | 7 | `checkCronSecret()` (semua) |
| `/api/exam/*` | 6 | Session |
| `/api/curriculum/*` | 3 | Session |
| `/api/media/*` | 2 | Session |
| `/api/bot/*` | 3 | `/webhook` (secret token), `/diag`, `/diag/prompt` (admin) |
| `/api/reminders/check` | 1 | Bearer `CRON_SECRET` (bukan `checkCronSecret`) |
| `/api/mindmap/screenshot` | 1 | Session siswa |
| lainnya | 4 | `/admission`, `/queues`, `/study`, `/youtube/transcript` |

Daftar lengkap per path ada di [`../modules/api-routes.md`](../modules/api-routes.md).

## Catatan Koreksi

Dokumen versi lama menyebut `/api/exam/route.ts` sebagai API modul Quiz dan `PipelineTrigger.tsx` sebagai satu-satunya komponen pipeline. Yang benar: modul Quiz memakai `/api/students/quizzes/*`, dan pipeline dipicu dari `POST /api/students` dengan body `{ action: "trigger", studentId, stages? }` (`src/app/api/students/route.ts`), dengan UI di `src/app/(dashboard)/dashboard/agents/PipelineTrigger.tsx`.
