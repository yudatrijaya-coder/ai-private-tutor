# Modul: Bot Handlers

> **Path:** `src/bot/handlers/`
> **Verifikasi:** 2026-10-25, commit `0207add`

---

## Fungsi

Router dan handler untuk semua pesan Telegram. Di webhook mode, `bot.command()` Telegraf
tidak pernah jalan — semuanya dirutekan eksplisit dari `message.ts`.

## File

| File | Menangani |
|------|-----------|
| `message.ts` | **Router utama** — urutan: deep-link → registrasi → parent → state machine → slash command → intent quiz → LLM |
| `start.ts` | `/start`, sambutan + cek registrasi |
| `register.ts` | `/daftar`, `/parent_daftar` |
| `onboarding.ts` | Alur pendaftaran trial (nama, kelas, persona, hari belajar) |
| `quiz.ts` | Kuis: pilih mapel, soal, jawaban, `handleDrillStart()` |
| `speedmath.ts` | Drill hitung cepat berwaktu (`handleSpeedMathStart/Answer/Exit`) |
| `vision.ts` | Foto soal → `VISION_MODELS` chain |
| `material.ts` | Daftar & isi materi |
| `schedule.ts` | `[SCHEDULE*]` — jadwal belajar |
| `school-schedule.ts` | `[SCHOOL_SCHEDULE*]` — jadwal sekolah (SIKumbang) |
| `weekly-exam.ts` | `/weeklyexam` |
| `parent.ts` | `/progres`, `/laporan`, `/peringatan` |
| `progress.ts` | Ringkasan progres |
| `extension.ts` | `/perpanjang`, `/extend`, trial habis |
| `youtube.ts` | `[YOUTUBE]` ringkasan, `[VIDEOS]` rekomendasi |
| `generic.ts` | Fallback teks umum |
| `__tests__/` | `quiz-hard-mode.test.ts`, `quiz-hard-e2e.ts` |

## Mode Sesi (`src/bot/session.ts`)

Tipe `BotSessionState`: `chat`, `quiz_active`, `choosing_topic`, `vision_answer`,
`vision_pending`, `waiting_quiz_answer`, `registering_name`, `registering_grade`,
`registering_character`, `registering_days`, `registering_confirm`.

`routeByState()` hanya menangani dua kondisi secara aktif: kuis berjalan
(`quiz_active` / `waiting_quiz_answer`, dengan speedmath diprioritaskan) dan onboarding.
Sisanya jatuh ke rantai slash command di `message.ts`.

## Urutan Routing (`message.ts`)

```
1. /start trial                → onboarding.handleTrialStart
2. /daftar, /parent_daftar     → register / parent
3. Perintah orang tua          → parent.ts
4. Siswa terdaftar:
   a. /extend, /perpanjang     → extension.ts
   b. routeByState()           → kuis / onboarding berjalan
   c. /quiz /drill /speedmath /speedmath_stop /start /help /web /weeklyexam
   d. routeCommand()           → /badge /review /nilai /prosem /pr
   e. isQuizRequest()          → kuis dari kalimat bebas
   f. handleMessage()          → tutor LLM + tag intent
5. Belum terdaftar            → instruksi /daftar
```

## Menambah Command Baru

1. Tambah cabang di `message.ts` (atau `routeCommand()` di `src/bot/commands.ts`).
2. Tambah entri di `COMMAND_MENU` (`commands.ts`) agar muncul di menu "/" Telegram.
3. Tambah baris di `sendHelp()`.
4. Kalau command perlu dipicu dari percakapan bebas, daftarkan tag-nya di
   `src/bot/agent/capabilities.ts`.

## Catatan

`message.ts.bak-*` dan `start.ts.bak-*` adalah file cadangan lokal (gitignored lewat
pola `*.bak-*`) — bukan bagian dari build.
