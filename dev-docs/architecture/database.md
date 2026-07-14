# Database — Arsitektur Database

> **Status:** DATA FILE — Update saat ada perubahan schema atau migration.

---

## Teknologi Database

| Environment | Database | Driver |
|-------------|----------|--------|
| Production | PostgreSQL 16 | `@prisma/adapter-pg` + `pg.Pool` |
| Development | SQLite (file lokal) | Default Prisma SQLite |

## Konfigurasi Prisma

- **ORM:** Prisma 7
- **Config File:** `prisma.config.ts` (bukan inline di schema.prisma)
- **Schema:** `prisma/schema.prisma`
- **Migrations:** `prisma/migrations/`
- **Generated Client:** `src/generated/prisma/` (auto-generated, jangan diedit manual)
- **Client Singleton:** `src/lib/prisma.ts`

## Entity Relationship Diagram

```
Student ──╫──┐
   │        │  has
   │        ├── Curriculum ──╫── Material
   │        │                    │
   │        │               has  │
   │        │                    ▼
   │        │                  Quiz ──╫── Attempt
   │        │                             │
   │  takes ┘                             │
   │                                      │
   ├────────────────── makes ─────────────┘
   │
   ├── SessionState (1-to-1)
   ├── ProgressSnap (tracks progress historis)
   ├── Intervention (monitoring & early warning)
   ├── ScheduleSession (jadwal belajar)
   ├── HomeworkTask (tugas dari tutor)
   ├── ChatLog (riwayat percakapan)
   ├── ApiUsage (tracking biaya LLM)
   ├── Reminder (reminder individual)
   └── Persona (konfigurasi 3 persona bot)
```

## Daftar Model (18 model)

| No | Model | Key Fields | Relasi |
|----|-------|-----------|--------|
| 1 | **Student** | `studentId`, `name`, `telegramId`, `gradeLevel`, `persona`, `status`, `passwordHash` | → Curriculum, Quiz, Attempt, ProgressSnap, ScheduleSession, SessionState, Intervention, ChatLog, ApiUsage, HomeworkTask, Reminder |
| 2 | **Curriculum** | `studentId`, `gradeLevel`, `version`, `status` | → Student, → Material |
| 3 | **Material** | `curriculumId`, `topic`, `subTopic`, `subject`, `weekOrder`, `status`, `metadata` (JSON) | → Curriculum, → Quiz, → Material (prerequisite) |
| 4 | **Quiz** | `materialId`, `studentId`, `type`, `questions` (JSON) | → Material, → Student, → Attempt |
| 5 | **Attempt** | `quizId`, `studentId`, `answers` (JSON), `score`, `masteryAfter` | → Quiz, → Student |
| 6 | **ProgressSnap** | `studentId`, `subject`, `masteryLevel`, `quizCount`, `snapshotAt` | → Student |
| 7 | **ScheduleSession** | `studentId`, `type`, `topic`, `scheduledAt`, `status`, `duration` | → Student |
| 8 | **SessionState** | `studentId` (unique), `currentMode`, `context` (JSON), `step` | → Student |
| 9 | **Intervention** | `studentId`, `issueType`, `severity`, `status`, `resolvedAt` | → Student |
| 10 | **ChatLog** | `studentId`, `role`, `content`, `source`, `createdAt` | → Student |
| 11 | **ApiUsage** | `studentId`, `model`, `tokens`, `cost`, `requestedAt` | → Student |
| 12 | **HomeworkTask** | `studentId`, `title`, `description`, `dueDate`, `completed` | → Student |
| 13 | **Reminder** | `studentId`, `type`, `message`, `scheduledFor`, `sent` | → Student |
| 14 | **Persona** | `type` (unique: KAK_BUDI/KAK_DEWI/KAK_RAKA), `name`, `toneRules`, `displayName` | Independent |
| 15 | **AgentLog** | `agentType`, `action`, `status`, `traceId`, `duration` | Independent |
| 16 | **User** | `name`, `email`, `role` (ADMIN/PARENT) | NextAuth — Account, Session |
| 17 | **Account** | `userId`, `provider`, `providerAccountId` | NextAuth — User |
| 18 | **Session** (NextAuth) | `sessionToken`, `userId`, `expires` | NextAuth — User |

## Key Enums

| Enum | Values |
|------|--------|
| **GradeLevel** | `SD_5`, `SMP_1`, `SMA_2` |
| **MaterialStatus** | `DRAFT`, `RAW`, `PROCESSED`, `VIDEO_READY`, `READY`, `ARCHIVED` |
| **DeliveryType** | `VIDEO`, `TEXT`, `TEXT_AND_VIDEO` |
| **AttemptType** | `QUIZ`, `EXAM` |
| **SessionType** | `DAILY`, `INTENSIVE` |
| **StudentStatus** | `ACTIVE`, `PAUSED`, `ARCHIVED` |
| **PersonaType** | `KAK_BUDI`, `KAK_DEWI`, `KAK_RAKA` |
| **InterventionSeverity** | `LOW`, `MEDIUM`, `HIGH`, `EMERGENCY` |
| **AgentType** | `CURRICULUM`, `CONTENT`, `MEDIA`, `ASSESSMENT`, `TUTOR`, `GUARDIAN`, `SCHEDULER` |
| **ReminderType** | `H_MINUS_1`, `T_MINUS_30`, `MISSED`, `DAILY_BRIEF`, `MOTIVATION` |

## Catatan Penting

1. **Student punya password** — di-hash dengan bcrypt, login via web dashboard
2. **Material punya metadata** — JSON field menyimpan `slides`, `mindmap`, `youtubeUrl`, dll
3. **Quiz** — questions disimpan sebagai JSON array, bukan tabel terpisah
4. **SessionState** — untuk state machine bot (onboarding, belajar, quiz, dll)
5. **ApiUsage** — auto-logging dari LLM client, penting untuk monitoring biaya
