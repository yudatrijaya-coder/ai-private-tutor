# Modul: API Routes

> **Path:** `src/app/api/`
> **Status:** DATA FILE — perbarui saat endpoint berubah.
> **Verifikasi terakhir:** 2026-10-25 terhadap commit `0207add` — 73 `route.ts`.

---

## Konvensi

Setiap folder dengan `route.ts` menjadi endpoint (App Router). Ringkasan arsitektur
dan alur request ada di [`../architecture/api-flow.md`](../architecture/api-flow.md);
peta modul → endpoint ada di [`../ai/MODULE_MAP.md`](../ai/MODULE_MAP.md).

Auth yang dipakai:

| Label | Mekanisme |
|---|---|
| **Publik** | tanpa auth |
| **Siswa** | cookie `student_session` (JWT), dicek `src/middleware.ts` |
| **Admin** | session NextAuth + `isAdmin(scope)` |
| **Cron** | `checkCronSecret()` — header `x-cron-secret` atau `?token=`, fail-closed |
| **Bot** | header `x-telegram-bot-api-secret-token` |
| **Bearer** | `Authorization: Bearer $CRON_SECRET` (khusus `/api/reminders/check`) |

## Jumlah per Prefix

| Prefix | Route | Auth |
|---|---:|---|
| `/api/admin/*` | 18 | Admin |
| `/api/students/*` | 18 | Siswa |
| `/api/student/*` | 5 | Siswa |
| `/api/auth/*` | 5 | Publik/Sesi |
| `/api/cron/*` | 7 | Cron |
| `/api/exam/*` | 6 | Siswa |
| `/api/curriculum/*` | 3 | Admin |
| `/api/bot/*` | 3 | Bot/Admin |
| `/api/media/*` | 2 | Siswa |
| `/api/reminders/check`, `/api/mindmap/screenshot` | 2 | Bearer / Siswa |
| `/api/admission`, `/api/queues`, `/api/study`, `/api/youtube/transcript` | 4 | Campuran |
| **Total** | **73** | |

## Method per Route

Dihasilkan dari source; format `path [METHOD,...]`.

### Bot, Cron, Reminder, Queue

```
/api/bot/webhook                 [POST, GET]   secret token + dedupe update_id
/api/bot/diag                    [GET]         admin
/api/bot/diag/prompt             [GET]         admin
/api/cron/daily-nudge            [GET]         cron
/api/cron/exam-scheduler         [POST]        cron
/api/cron/guardian-monthly       [POST]        cron
/api/cron/guardian-report        [POST]        cron
/api/cron/motivation-nudge       [POST, GET]   cron
/api/cron/progress-snap          [GET]         cron
/api/cron/schedule-sweep         [GET]         cron (?token=)
/api/reminders/check             [GET]         Bearer CRON_SECRET
/api/queues                      [GET]         admin
```

### Siswa

```
/api/students                    [GET, POST]           POST {action:"trigger"} = pipeline
/api/students/[id]               [DELETE]
/api/students/subjects           [GET]
/api/students/topics             [GET]
/api/students/material/[id]      [GET, PATCH]
/api/students/quizzes            [GET]
/api/students/quizzes/[id]       [GET]
/api/students/quizzes/[id]/grade [POST]
/api/students/activity           [GET, POST]   XP/streak/badge
/api/students/review             [GET, POST]   antrean SM-2
/api/students/mastery            [GET]
/api/students/weak-topics        [GET]
/api/students/self-compare       [GET]
/api/students/gamification       [GET]
/api/students/achievement-extra  [GET]
/api/students/leaderboard        [GET]
/api/students/exams              [GET]
/api/students/exams/[id]         [GET]
/api/student/me                  [GET]
/api/student/progress            [GET]
/api/student/missions            [GET, POST]
/api/student/guardian-link       [GET]
/api/student/password            [PUT]
```

### Exam & Media

```
/api/exam                        [POST]
/api/exam/weekly                 [POST]
/api/exam/template               [POST, GET]
/api/exam/attempt                [POST]
/api/exam/analyze                [POST]
/api/exam/apply-plan             [POST, GET]
/api/media/render                [POST]
/api/media/tts                   [POST]
/api/mindmap/screenshot          [GET]
/api/youtube/transcript          [POST]
/api/study                       [POST, GET]
/api/admission                   [POST]
```

### Auth

```
/api/auth/[...nextauth]          [POST]   NextAuth (admin/orang tua)
/api/auth/me                     [GET]
/api/auth/student-login          [POST]   publik — bcrypt
/api/auth/student/set-password   [POST]   publik — password pertama
/api/auth/student/reset-password [POST]   reset
```

### Admin

```
/api/admin/students                            [GET, POST, DELETE]
/api/admin/students/[id]                       [PATCH, DELETE]
/api/admin/students/[id]/set-password          [POST]
/api/admin/students/[id]/password-reset-link   [GET]
/api/admin/students/[id]/restore               [POST]
/api/admin/students/approve                    [POST]
/api/admin/students/restore                    [POST]
/api/admin/curriculum                          [GET, POST]
/api/admin/curriculum/material                 [POST]
/api/admin/curriculum/material/[id]            [PATCH, DELETE]
/api/admin/curriculum/material/[id]/reorder    [POST]
/api/admin/quizzes                             [GET, POST]
/api/admin/quizzes/[id]                        [PATCH, DELETE]
/api/admin/pending                             [GET]
/api/admin/approve                             [POST]
/api/admin/bot-status                          [GET]
/api/admin/set-webhook                         [POST]
/api/admin/system-info                         [GET]
```

### Curriculum Batch

```
/api/curriculum/batch-generate   [POST, GET]
/api/curriculum/batch-mindmap    [POST, GET]
/api/curriculum/regenerate       [POST]
```

---

## Koreksi dari Versi Sebelumnya

| Klaim lama | Fakta |
|---|---|
| `/api/students` POST = pipeline dengan `stages: string[]`, `studentIds?: string[]` | Body: `{ action: "trigger", studentId: string, stages?: string[] }` — satu siswa per panggilan |
| `/api/reminders/check` method POST | **GET**, auth `Authorization: Bearer` |
| `/api/cron/schedule-sweep` method POST | **GET** dengan `?token=` |
| `/api/mindmap/screenshot` method POST | **GET** |
| `/api/admin/students/[id]` methods GET/PUT | **PATCH, DELETE** |
| `/api/admin/curriculum/material` GET/POST | **POST** saja; detail di `[id]` memakai **PATCH/DELETE** |
| `/api/admin/curriculum/material/[id]/reorder` PUT | **POST** |
| `/api/admin/quizzes` GET/POST/DELETE | **GET, POST**; hapus lewat `[id]` |
| `/api/auth/student/reset-password` Auth Session | publik |
