# Modul: API Routes

> **Path:** `src/app/api/`
> **Fungsi:** Semua endpoint HTTP untuk backend.

---

## Ringkasan

Seluruh backend API menggunakan Next.js App Router convention — file-based routing di `src/app/api/`. Setiap folder dengan `route.ts` menjadi endpoint.

## Daftar Route Groups

| Prefix | Auth | Fungsi |
|--------|------|--------|
| `/api/bot/*` | Secret token | Telegram webhook |
| `/api/students/*` | Session | Student data & pipeline |
| `/api/exam/*` | Session | Exam generation |
| `/api/media/*` | Session | Media rendering |
| `/api/auth/*` | Varied | Auth (login, me, password) |
| `/api/admin/*` | Admin | Admin dashboard CRUD |
| `/api/cron/*` | Cron | Scheduled tasks |
| `/api/curriculum/*` | Session | Curriculum batch ops |
| `/api/youtube/*` | Session | YouTube transcript |
| `/api/reminders/*` | Cron | Reminder system |
| `/api/mindmap/*` | Session | Mindmap screenshot |

## Detail Routes

### `/api/bot/webhook/route.ts`
- **Method:** POST
- **Auth:** Secret token (header)
- **Fungsi:** Menerima update dari Telegram, dispatch ke bot handler
- **Body:** Telegram Update object

### `/api/students/route.ts`
- **Method:** GET, POST
- **Auth:** Session (admin/parent)
- **Fungsi:** GET = list students, POST = pipeline trigger
- **Body (POST):** `{ action: "trigger", stages: string[], studentIds?: string[] }`

### `/api/students/subjects/route.ts`
- **Method:** GET
- **Fungsi:** List subject per student

### `/api/students/topics/route.ts`
- **Method:** GET
- **Fungsi:** List topic per subject

### `/api/students/quizzes/[id]/route.ts`
- **Method:** GET
- **Fungsi:** Detail quiz + kirim jawaban

### `/api/students/material/[id]/route.ts`
- **Method:** GET
- **Fungsi:** Konten materi

### `/api/exam/route.ts`
- **Method:** POST
- **Fungsi:** Generate exam dari quiz bank

### `/api/exam/template/route.ts`
- **Method:** POST
- **Fungsi:** Generate exam dari template (weekly timeline)

### `/api/auth/me/route.ts`
- **Method:** GET
- **Fungsi:** Info user saat ini

### `/api/auth/student-login/route.ts`
- **Method:** POST
- **Auth:** Public
- **Fungsi:** Login student (verify bcrypt password)

### `/api/auth/student/set-password/route.ts`
- **Method:** POST
- **Auth:** Public
- **Fungsi:** Set password pertama kali

### `/api/auth/student/reset-password/route.ts`
- **Method:** POST
- **Auth:** Session
- **Fungsi:** Reset password

### `/api/admin/students/route.ts`
- **Method:** GET, POST
- **Auth:** Admin
- **Fungsi:** List semua student (GET), create student (POST)

### `/api/admin/students/[id]/route.ts`
- **Method:** GET, PUT, DELETE
- **Auth:** Admin
- **Fungsi:** CRUD student individual

### `/api/admin/students/[id]/set-password/route.ts`
- **Method:** POST
- **Auth:** Admin
- **Fungsi:** Set password student oleh admin

### `/api/admin/students/[id]/password-reset-link/route.ts`
- **Method:** POST
- **Auth:** Admin
- **Fungsi:** Generate link reset password

### `/api/admin/students/[id]/restore/route.ts`
- **Method:** POST
- **Auth:** Admin
- **Fungsi:** Restore student yang diarsipkan

### `/api/admin/students/restore/route.ts`
- **Method:** POST
- **Auth:** Admin
- **Fungsi:** Batch restore

### `/api/admin/curriculum/route.ts`
- **Method:** GET, POST
- **Auth:** Admin
- **Fungsi:** Manage curriculum (lihat, create)

### `/api/admin/curriculum/material/route.ts`
- **Method:** GET, POST
- **Auth:** Admin
- **Fungsi:** CRUD material

### `/api/admin/curriculum/material/[id]/route.ts`
- **Method:** GET, PUT, DELETE
- **Auth:** Admin
- **Fungsi:** CRUD material individual

### `/api/admin/curriculum/material/[id]/reorder/route.ts`
- **Method:** PUT
- **Auth:** Admin
- **Fungsi:** Urutkan material (drag & drop)

### `/api/admin/quizzes/route.ts`
- **Method:** GET, POST, DELETE
- **Auth:** Admin
- **Fungsi:** Manage quiz bank

### `/api/admin/quizzes/[id]/route.ts`
- **Method:** GET, PUT, DELETE
- **Auth:** Admin
- **Fungsi:** CRUD quiz individual

### `/api/admin/pending/route.ts`
- **Method:** GET
- **Auth:** Admin
- **Fungsi:** List student pending approval

### `/api/admin/approve/route.ts`
- **Method:** POST
- **Auth:** Admin
- **Fungsi:** Approve student

### `/api/cron/schedule-sweep/route.ts`
- **Method:** POST
- **Auth:** Cron (internal)
- **Fungsi:** Sweep jadwal (H-1, T-30, missed, daily brief, auto-assign)

### `/api/cron/guardian-report/route.ts`
- **Method:** POST
- **Auth:** Cron (internal)
- **Fungsi:** Trigger weekly report generation

### `/api/curriculum/batch-generate/route.ts`
- **Method:** POST
- **Fungsi:** Batch generate curriculum dari data statis

### `/api/curriculum/batch-mindmap/route.ts`
- **Method:** POST
- **Fungsi:** Batch generate mindmap dari slides

### `/api/youtube/transcript/route.ts`
- **Method:** POST
- **Fungsi:** Ambil transcript video YouTube

### `/api/reminders/check/route.ts`
- **Method:** POST
- **Auth:** Cron (internal)
- **Fungsi:** Cek & kirim reminder terjadwal

### `/api/mindmap/screenshot/route.ts`
- **Method:** POST
- **Fungsi:** Screenshot mindmap untuk preview
