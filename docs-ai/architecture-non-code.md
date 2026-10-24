# Arsitektur Non-Kode — ai-private-tutor (senangbelajar)

> ⚠️ **HISTORIS** — ditulis 31 Juli 2026. Jangan dibaca sebagai kondisi terkini.
> Untuk state sekarang lihat `dev-docs/ai/CURRENT_STATE.md` dan `dev-docs/ai/PROJECT_CONTEXT.md`.

> Dokumen sintesis. Sumber file yang TIDAK bisa diparse graphify (`.prisma`,
> `Caddyfile`, `.conf`, `.toml`, `.css`, `.env.example`) dikonsolidasi di sini
> supaya konsepnya masuk knowledge graph dan bisa di-query.
>
> Dibuat 2026-10-18. Regenerate bila `prisma/schema.prisma` berubah.

## 1. Skema Database (prisma/schema.prisma — 33 model)

**Hub utama: `Student`** — terhubung ke 20 model. Semua data belajar berpusat di siswa.

Pembelajaran:
- `Curriculum` → milik satu `Student`, berisi banyak `Material`
- `Material` → bagian dari `Curriculum`, punya banyak `Quiz`, bisa mereferensikan `Material` lain (hierarki), menghasilkan `StudentActivity`
- `Quiz` → milik satu `Material`, punya banyak `Attempt` dan `ReviewQueue`
- `Attempt` → jawaban siswa atas `Quiz`, milik `Student`

Ujian:
- `Exam` → berisi `ExamQuestion`, punya `ExamAttempt` dan `ExamSchedule`
- `ExamAttempt` → milik `Student` + `Exam`, dapat menghasilkan `ImprovementPlan`
- `ExamSchedule` → jadwal ujian untuk `Student`

Progres & mastery:
- `TopicMastery` → penguasaan per topik per `Student`
- `StudentSubjectMastery` → agregat per mata pelajaran
- `ProgressSnap` → snapshot perkembangan berkala
- `StudySession`, `ScheduleSession`, `SessionState` → sesi belajar & state
- `SpacedRepetition` (via `ReviewQueue`) → antrean ulang hafalan

Gamifikasi:
- `Badge` ← `StudentBadge` → `Student`
- `StudentActivity` → aktivitas siswa pada `Material`

Interaksi & operasional:
- `Persona` — persona tutor (Kak Budi / Kak Dewi / Kak Raka)
- `ChatLog` → log percakapan `Student`
- `Intervention` → intervensi tutor/guardian
- `Reminder`, `HomeworkTask` → pengingat & PR
- `ApiUsage` → pemakaian biaya LLM per `Student`
- `AgentLog` — log eksekusi agen (1 per job, terkait BullMQ)
- `CronClaim` — klaim idempoten untuk job cron
- `CharacterImage` — aset visual karakter

Auth (NextAuth):
- `User` ← `Account`, `Session`
- `VerificationToken`

## 2. Deployment & Infrastruktur (ops/)

- `ops/Caddyfile` — reverse proxy utama (TLS otomatis)
- `ops/Caddyfile-docs` — vhost terpisah untuk docs-site
- `ops/nginx-tutor.conf` — reverse proxy nginx alternatif: `server_name
  senangbelajar.web.id`, listen 80, `proxy_pass http://127.0.0.1:3000`,
  meneruskan `Upgrade`/`Connection` untuk WebSocket, set `X-Real-IP`,
  `X-Forwarded-For`, `X-Forwarded-Proto`
- `ops/migrations/2026-07-30-add-indexes.sql` — index DB manual
- PM2 menjalankan app (`ecosystem.config.cjs`), port 3000, prod membaca
  `.env.production` yang MENANG atas `.env`
- PostgreSQL + Redis (BullMQ) + 9Router LLM lokal `localhost:20128`
- Domain produksi: **senangbelajar.web.id**

## 3. Konfigurasi Aplikasi

- `.env.example` — daftar seluruh env var yang dibutuhkan
- `prisma/migrations/migration_lock.toml` — provider migrasi: **postgresql**
- `src/app/globals.css` — Tailwind v4 (`@import "tailwindcss"`) + design token CSS
  variable, dua palet: `--su-*` untuk Superuser Dashboard (tema gelap) dan
  `--st-*` untuk tampilan Student (tema terang)
- `next.config.ts` — konfigurasi Next.js 16

## 4. Struktur Runtime

- **Web app**: Next.js 16 App Router — `(auth)`, `(dashboard)`, `(student)`, `api/`
- **Bot Telegram**: Telegraf, `src/bot/` — `handlers/` (quiz, material, schedule,
  weekly-exam, speedmath, vision, youtube, onboarding), `agent/` (tutor, capabilities),
  `state-machine.ts` untuk routing callback, `personas.ts` untuk karakter tutor
- **Agen**: `src/agents/` — `assessment` (generator, grader, exam, worker),
  `content`, `curriculum`, `guardian`, `media`, `scheduler` (assigner)
- **Queue**: BullMQ + Redis — `src/queue/`, `attempts=0` default (retry manual)
- **Cron**: `src/app/api/cron/` + `src/lib/cron/` — job idempoten via `CronClaim`
- **LLM**: `src/llm/client.ts` — `callLLM()`, chain fallback per role, 9Router

## 5. Aturan Domain Penting

- **Satu kurikulum aktif** per siswa: `getActiveCurriculumId()` di
  `src/lib/curriculum-active.ts` — dipanggil hampir semua halaman siswa, bot,
  dan scheduler. Ini kunci global aplikasi.
- **Otorisasi**: `src/lib/auth/scope.ts` — `/api/students*` & `/api/exam*`
  boleh siswa ATAU admin; `studentId` di body hanya untuk admin, siswa
  di-pin ke session.
- **Bank konten** di-emit dari DB (`scripts/emit-content-bank.ts`,
  `scripts/emit-topic-bank.ts`); bank DB dibaca sebelum bank tangan.
- **Escaping Telegram**: `escapeMd()` di `src/lib/telegram-format.ts` — 52 edge,
  risiko nyata di produksi.
