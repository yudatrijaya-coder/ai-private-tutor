# Bot Enhancements

> Terakhir update: 31 Juli 2026

## 1. `src/bot/agent/capabilities.ts` — Single Source of Truth

**Problem:** blok capability 130-line diduplikasi antara `handleMessage()` dan `streamMessage()` di `tutor.ts`. Kalau salah satu diedit, yang lain drift.

**Fix:** array `CAPABILITIES` + `buildCapabilitiesPrompt()`.

```typescript
export const CAPABILITIES = [
  { tag: "QUIZ", description: "...", trigger: "..." },
  { tag: "SCHEDULE", description: "...", subCommands: [...], trigger: "..." },
  // ...
];

export function buildCapabilitiesPrompt(): string { /* renders numbered list */ }
```

`tutor.ts` → `buildSystemPrompt(student)` memanggil `buildCapabilitiesPrompt()`. Kedua handler pakai `buildMessages()` yang sama, jadi tidak mungkin drift.

### Capability tags

| Tag | Purpose |
|-----|---------|
| `QUIZ` | Generate/start quiz |
| `SCHEDULE` / `:WEEK` / `:SET` / `:ASSIGN` | Jadwal belajar |
| `MATERIALS` | List materi |
| `SCHOOL_SCHEDULE` / `:WEEK` / `:NEXT:X` | Jadwal sekolah asli |
| `REMINDER:CREATE` / `:LIST` / `:DELETE` | Reminder |
| `HOMEWORK:CREATE` / `:LIST` / `:SUBMIT` | PR |
| `PASSWORD:SET` | Ganti password web |
| `VIDEOS:topic` | Rekomendasi YouTube |
| `YOUTUBE:VIDEO_ID` | Jelaskan video |
| `DASHBOARD` | Link dashboard |
| `ACHIEVEMENT` | XP, streak, badge |
| `REVIEW` | Spaced repetition |

`ACHIEVEMENT` dan `REVIEW` capability baru — hooked ke gamification & SM-2.

## 2. `src/bot/commands.ts` — Command Router

6 command baru: `/badge` `/review` `/nilai` `/pr` `/help` (+ alias).

| Command | Alias | Handler | Data source |
|---------|-------|---------|-------------|
| `/help` | — | `sendHelp` | static |
| `/badge` | `/badges`, `/xp` | `sendBadges` | `Student.xp`, `currentStreak`, `StudentBadge` |
| `/review` | `/ulang` | `sendReview` | `getDueReviews()` |
| `/nilai` | — | `sendProgress` | `Attempt`, `ReviewQueue` |
| `/pr` | `/tugas` | `sendHomework` | `HomeworkTask` |

### Telegram command menu

`COMMAND_MENU` (11 entries) di-push ke Telegram via `registerCommandMenu(bot)` → `bot.telegram.setMyCommands()`. Muncul di menu "/" client.

## 3. Command Routing di Webhook Mode

**Kritis:** di webhook mode (`src/app/api/bot/webhook/route.ts`), app membangun Telegraf `Context` manual dan memanggil `onMessage` langsung. Middleware `bot.command()` Telegraf **TIDAK PERNAH** dieksekusi.

```
POST /api/bot/webhook
  → dedupe by update_id
  → ack 200 immediately
  → processUpdate() async
      → new Context(update, bot.telegram, bot.botInfo)
      → callback_query? → routeCallback()
      → else → onMessage(ctx)
```

Jadi command harus dirouting eksplisit dari `handlers/message.ts`:

```typescript
// src/bot/handlers/message.ts
if ("text" in msg && msg.text?.startsWith("/")) {
  const routed = await routeCommand(ctx as any, student, msg.text);
  if (routed) return;
}

// Fall through to LLM-powered tutor
const response = await handleMessage(ctx, session, student);
```

Urutan di `onMessage`: registration → parent commands → student lookup → `routeByState` → hardcoded (`/quiz`, `/start`, `/help`, `/web`) → **`routeCommand`** → LLM tutor.

`routeCommand` mengembalikan `true` kalau handled — caller harus stop.

## 4. Safety Fix: `streamMessage()` Buffer-and-Scan

**Problem:** streaming mengirim token raw ke anak sebelum di-scan safety. Konten tidak aman bisa lolos ke user sebelum filter jalan.

**Fix:** buffer token sampai batas paragraf/kalimat, scan setiap chunk **sebelum** yield.

```typescript
const FLUSH_BOUNDARY = /(\n\n|[.!?…]\s|\n)$/;
const MAX_BUFFER_CHARS = 400;

async function* flush(chunk: string): AsyncGenerator<string> {
  if (!chunk) return;
  const verdict = await scanResponse(student.id, chunk);
  if (verdict) {
    blocked = true;
    emitted = verdict;
    yield verdict;   // safe fallback, bukan chunk asli
    return;
  }
  emitted += chunk;
  yield chunk;
}

for await (const token of callLLMStream("tutor", messages, { studentId: student.id })) {
  buffer += token;
  if (FLUSH_BOUNDARY.test(buffer) || buffer.length >= MAX_BUFFER_CHARS) {
    yield* flush(buffer);
    buffer = "";
    if (blocked) break;    // stop stream immediately
  }
}
```

| Guarantee | Mechanism |
|-----------|-----------|
| No unscanned token reaches user | semua yield lewat `flush()` |
| Run-on response tetap ter-flush | `MAX_BUFFER_CHARS = 400` hard cap |
| Blocked → stop immediately | `blocked` flag + `break` |
| Tail tidak hilang | flush residual buffer setelah loop |
| History tetap tersimpan | `persistHistory()` pakai `emitted` (bukan raw) |
