# Modul: Queue System

> **Path:** `src/queue/`
> **Verifikasi:** 2026-10-25, commit `0207add`

---

## Fungsi

Abstraksi antrean pekerjaan: BullMQ + Redis bila tersedia, fallback **in-memory** dalam
proses yang sama bila Redis mati. Semua worker didaftarkan sekali saat startup lewat
`src/instrumentation.ts`.

## File

| File | Fungsi |
|------|--------|
| `definitions.ts` | `QUEUES`, `MAX_RETRIES`, tipe payload, `defaultConcurrency()`, `queueNameToAgentType()` |
| `runner.ts` | `initQueues()` — factory worker BullMQ + logging `AgentLog` |
| `local.ts` | `registerProcessor()` — fallback in-memory |
| `redis.ts` | Koneksi ioredis |
| `worker.ts` | Helper worker |
| `dlq.ts` | Dead Letter Queue (setelah `MAX_RETRIES` = 3) |

## Definisi Queue (10)

Dari `QUEUES` di `definitions.ts`:

| Queue | Concurrency | Agent (`AgentType`) |
|-------|------:|------|
| `content-scrape` | 2 | CONTENT |
| `curriculum-review` | 2 | CURRICULUM |
| `media-render` | 1 | MEDIA |
| `media-yt-fallback` | 2 | MEDIA |
| `assessment-generate` | 3 | ASSESSMENT |
| `assessment-evaluate` | 2 | ASSESSMENT |
| `guardian-report` | 1 | GUARDIAN |
| `scheduler-assign` | 1 | SCHEDULER |
| `scheduler-reminder` | 3 | SCHEDULER |
| `improvement-analysis` | 1 | ASSESSMENT |

## Payload

| Tipe | Field |
|---|---|
| `ScrapeJobPayload` | `materialId, topic, subTopic?, gradeLevel, sources[]` |
| `CurriculumReviewJobPayload` | `materialId, topic, gradeLevel, subTopic?` |
| `RenderJobPayload` | `materialId, characterPreference, script` |
| `YtFallbackJobPayload` | `materialId, topic, gradeLevel` |
| `AssessmentGenerateJobPayload` | `studentId, materialId?, topic, gradeLevel, questionCount?` |
| `AssessmentEvaluateJobPayload` | `studentId, assessmentId, answers` |
| `GuardianReportJobPayload` | `studentId, periodStart, periodEnd` |
| `SchedulerAssignJobPayload` | `studentId, weekStart` |
| `SchedulerReminderJobPayload` | `studentId, sessionId` |
| `ImprovementAnalysisJobPayload` | `attemptId` |

## Bootstrap (`src/instrumentation.ts`)

```
register()
    └── initQueues({ ...10 processor })
         ├── ok    → BullMQ worker aktif, log "[instrumentation] Queues: OK"
         └── gagal → log "DISABLED" + daftarkan 10 processor ke src/queue/local.ts
```

Artinya: Redis mati **bukan** alasan pipeline berhenti — pekerjaan tetap jalan,
hanya kehilangan persistensi antar restart.

## Retry & Observabilitas

- `MAX_RETRIES = 3` → job gagal permanen dipindah ke DLQ (`dlq.ts`).
- Setiap job menulis `AgentLog` (`queueNameToAgentType()` memberi label agent).
- Status antrean bisa dilihat di `GET /api/queues` (admin).
