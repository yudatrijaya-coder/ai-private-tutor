# Modul: Tutor Agent

> **Path:** `src/bot/agent/`
> **Verifikasi:** 2026-10-25, commit `0207add`

---

## Fungsi

Otak percakapan bot. Guru maya yang dipersonalisasi per jenjang, dipanggil dari
`onMessage()` ketika pesan bukan slash command dan bukan intent yang bisa ditangani
secara deterministik.

Tutor **bukan** worker queue — ia berjalan inline di dalam request webhook.

## File

| File | Fungsi |
|------|--------|
| `tutor.ts` | `buildSystemPrompt()`, `handleMessage()`, `streamMessage()` |
| `capabilities.ts` | `CAPABILITIES` + `buildCapabilitiesPrompt()` — satu sumber kebenaran daftar kemampuan |
| `reminder.ts` | `handleReminderCommand()`, `processPendingReminders()` |
| `../personas.ts` | Definisi persona |
| `../safety.ts` | `scanResponse()` — filter keluaran |
| `../state-machine.ts` | `routeByState()` — routing saat kuis/onboarding berjalan |
| `../session.ts` | `BotSession`, `getSession()`, `setSession()` |

## Persona

| Enum | Display | Emoji | Gaya |
|---|---|---|---|
| `KAK_BUDI` | Kak Budi | 🦉 | Sederhana, sabar, memanggil "adik" |
| `KAK_DEWI` | Kak Dewi | 🌟 | Santai, hangat, memanggil "kamu" |
| `KAK_RAKA` | Kak Raka | 🔥 | Energik, memanggil "lu" sesekali |

Ketiganya punya instruksi eksplisit agar **menyesuaikan tingkat kesulitan dengan baris
`Grade:` di konteks**, bukan menebak dari nama persona. Siswa memilih persona sendiri saat
onboarding (`onboarding.ts`), tersimpan di `Student.persona`.

## Alur

```
Pesan masuk → POST /api/bot/webhook
    ├── verifikasi secret token + dedupe update_id
    └── onMessage()  [src/bot/handlers/message.ts]
         ├── routeByState()  → kuis/onboarding yang sedang berjalan
         ├── slash command   → handler deterministik
         ├── isQuizRequest() → kuis (tanpa LLM)
         └── handleMessage() → tutor.ts
              ├── buildSystemPrompt(student)
              │    ├── persona.prompt
              │    ├── buildCapabilitiesPrompt()  (daftar tag yang boleh dipakai)
              │    ├── konteks prosem + progres siswa
              │    └── subscription knowledge
              ├── callLLM(messages, "tutor")
              ├── scanResponse()      ← safety sebelum dikirim
              └── balas + log ke ChatLog
```

## Tag Intent

Model tidak memanggil fungsi; ia menulis tag di akhir jawaban, lalu `message.ts`
menangkapnya dan menjalankan handler nyata:

`[QUIZ]` · `[SCHEDULE]` · `[SCHEDULE:WEEK]` · `[SCHEDULE:SET:{json}]` · `[SCHEDULE:ASSIGN]` ·
`[SCHOOL_SCHEDULE]` · `[SCHOOL_SCHEDULE:NEXT:<mapel>]` · `[MATERIALS]` · `[YOUTUBE:<videoId>]` ·
`[VIDEOS:<topik>]` · `[DASHBOARD]` · `[REMINDER …]` · `[HOMEWORK …]` · `[PASSWORD …]` ·
`[EXTENSION:REQUEST]`

Daftar resmi tag ada di `capabilities.ts` — jangan menambah tag hanya di prompt.

## Catatan

- `streamMessage()` menerapkan `scanResponse()` per paragraf sebelum mengirim (buffer-and-scan).
- Jawaban kuis tidak lewat LLM sama sekali, tetapi tetap dicatat ke `ChatLog` lewat
  `runQuizFlow()` agar riwayat di dashboard lengkap.
- Tutor berbagi kuota harian dengan agent lain: `DAILY_TOKEN_CAP` 1.000.000 token/siswa/hari.
