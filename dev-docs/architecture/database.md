# Database Architecture

> **Status:** DATA FILE — Update saat ada perubahan schema atau migration.

---

## Database Technology

| Environment | Database | Driver |
|-------------|----------|--------|
| Production | PostgreSQL 16 | `@prisma/adapter-pg` + `pg.Pool` |
| Development | SQLite (file) | Default Prisma SQLite |

## Prisma Configuration

- **ORM:** Prisma 7
- **Config File:** `prisma.config.ts` (bukan inline di schema.prisma)
- **Schema:** `prisma/schema.prisma`
- **Migrations:** `prisma/migrations/`
- **Generated Client:** `src/generated/prisma/`

## Entity Relationship

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
   ├── ProgressSnap (tracks progress)
   ├── Intervention (monitors flags)
   ├── ScheduleSession (schedules)
   ├── ChatLog (conversation history)
   └── ApiUsage (LLM cost tracking)
```

## Model List (14 models)

| No | Model | Key Fields | Relations |
|----|-------|-----------|-----------|
| 1 | Student | studentId, name, telegramId, gradeLevel, persona | → Curriculum, Quiz, Attempt, ProgressSnap, ScheduleSession, SessionState, Intervention, ChatLog, ApiUsage |
| 2 | Curriculum | studentId, gradeLevel, version | → Student, → Material |
| 3 | Material | curriculumId, topic, subTopic, subject, weekOrder, status | → Curriculum, → Quiz, → Material (prerequisite) |
| 4 | Quiz | materialId, studentId, type, questions (JSON) | → Material, → Student, → Attempt |
| 5 | Attempt | quizId, studentId, answers (JSON), score, masteryAfter | → Quiz, → Student |
| 6 | ProgressSnap | studentId, subject, mastery, quizCount | → Student |
| 7 | ScheduleSession | studentId, type, topic, scheduledAt, status | → Student |
| 8 | SessionState | studentId (unique), currentMode, context (JSON) | → Student |
| 9 | Intervention | studentId, issueType, severity, status | → Student |
| 10 | ChatLog | studentId, role, content, source | → Student |
| 11 | ApiUsage | studentId, model, tokens, cost | → Student |
| 12 | Persona | type (unique), name, toneRules | Independent |
| 13 | AgentLog | agentType, action, status, traceId | Independent |
| 14 | User | name, email, role | NextAuth — Account, Session |

## Key Enums

| Enum | Values |
|------|--------|
| GradeLevel | SD_5, SMP_1, SMA_2 |
| MaterialStatus | DRAFT, RAW, PROCESSED, VIDEO_READY, READY, ARCHIVED |
| DeliveryType | VIDEO, TEXT, TEXT_AND_VIDEO |
| AttemptType | QUIZ, EXAM |
| SessionType | DAILY, INTENSIVE |
| StudentStatus | ACTIVE, PAUSED, ARCHIVED |
| PersonaType | KAK_BUDI, KAK_DEWI, KAK_RAKA |
| InterventionSeverity | LOW, MEDIUM, HIGH, EMERGENCY |
| AgentType | CURRICULUM, CONTENT, MEDIA, ASSESSMENT, TUTOR, GUARDIAN, SCHEDULER |
