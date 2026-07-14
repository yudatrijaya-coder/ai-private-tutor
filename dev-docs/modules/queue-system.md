# Modul: Queue System

> **Path:** `src/queue/`
> **File Utama:** `definitions.ts`, `runner.ts`

---

## Fungsi

Abstraksi queue processing — BullMQ jika Redis tersedia, in-memory fallback jika tidak. Menangani semua komunikasi asynchronous antar agent.

## File Structure

| File | Fungsi |
|------|--------|
| `definitions.ts` | Queue names, concurrency, job payload types, helpers |
| `runner.ts` | BullMQ runner + worker factory |
| `local.ts` | In-memory fallback (tanpa Redis) |

## Queue Definitions (9 queues)

| Queue Name | Concurrency | Worker | Deskripsi |
|-----------|-------------|--------|-----------|
| `content-scrape` | 2 | Content Agent | Scrape materi dari internet |
| `curriculum-review` | 2 | Curriculum Agent | Review hasil scrape |
| `media-render` | 1 | Media Agent | Render video pembelajaran |
| `media-yt-fallback` | 2 | Media Agent | Cari YouTube reference |
| `assessment-generate` | 3 | Assessment Agent | Generate quiz dari materi |
| `assessment-evaluate` | 2 | Assessment Agent | Koreksi jawaban siswa |
| `guardian-report` | 1 | Guardian Agent | Generate weekly report |
| `scheduler-assign` | 1 | Scheduler Agent | Assign jadwal mingguan |
| `scheduler-reminder` | 3 | Scheduler Agent | Kirim reminder |

## Job Payload Types

```typescript
ScrapeJobPayload         → { materialId, topic, subTopic?, gradeLevel, sources[] }
CurriculumReviewJobPayload → { materialId, topic, gradeLevel, subTopic? }
RenderJobPayload          → { materialId, characterPreference, script }
YtFallbackJobPayload      → { materialId, topic, gradeLevel }
AssessmentGenerateJobPayload → { studentId, materialId?, topic, gradeLevel, questionCount? }
AssessmentEvaluateJobPayload → { studentId, assessmentId, answers }
GuardianReportJobPayload  → { studentId, periodStart, periodEnd }
SchedulerAssignJobPayload → { studentId, weekStart }
SchedulerReminderJobPayload → { studentId, sessionId }
```

## Worker Factory (`runner.ts`)

Worker factory pattern:
1. Daftar queue + handler function
2. Auto-create BullMQ queue + worker
3. Kalau Redis tidak tersedia → in-memory fallback
4. Auto-retry (max 3x) → Dead Letter Queue
5. Auto-logging ke AgentLog

## In-Memory Fallback (`local.ts`)

Jika `REDIS_URL` tidak di-set:
- Queue tetap berfungsi (dalam proses yang sama)
- Tidak ada persistence antar restart
- Cocok untuk development
