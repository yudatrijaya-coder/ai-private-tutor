# Modul: Tutor Agent

> **Path:** `src/bot/agent/tutor.ts`
> **File Utama:** `tutor.ts`

---

## Fungsi

Interface utama antara student dan sistem — chat interaktif via Telegram dengan 3 persona berbeda. LLM-driven, menerima text, quiz interaktif, dan foto soal (vision).

## File Structure

| File | Fungsi |
|------|--------|
| `src/bot/agent/tutor.ts` | Tutor agent — LLM-driven chat |
| `src/bot/agent/reminder.ts` | Reminder agent — kirim reminder terjadwal |
| `src/bot/personas.ts` | Definisi 3 persona (Kak Budi, Kak Dewi, Kak Raka) |
| `src/bot/state-machine.ts` | State machine routing (onboarding, belajar, quiz) |
| `src/bot/session.ts` | Session management (DB-backed) |
| `src/bot/safety.ts` | Content safety filter |

## Persona

| Persona | Jenjang | Gaya | Display Name |
|---------|---------|------|-------------|
| **KAK_BUDI** | SD | Playful, semangat, pake bahasa anak-anak | Kak Budi 🦁 |
| **KAK_DEWI** | SMP | Santai, suportif, pake bahasa gaul | Kak Dewi 🌸 |
| **KAK_RAKA** | SMA | Formal, akademis, pake bahasa baku | Kak Raka 📚 |

## Data Flow

```
User kirim pesan ke bot
    │
    ▼
Telegram → POST /api/bot/webhook
    │
    ▼
Telegraf.js router (message.ts)
    │
    ├── State = belajar → tutor.ts
    │   │   ├── Ambil persona → LLM prompt
    │   │   ├── 9Router call → response
    │   │   └── Kirim balasan ke Telegram + log ke ChatLog
    │   │
    │   ├── State = quiz → quiz.ts
    │   │
    │   ├── State = onboarding → onboarding.ts
    │   │
    │   └── State = schedule → schedule.ts
    │
    └── Vision (foto) → vision.ts → LLM analysis
```

## Key Logic

- **3 persona** — tone & display name berubah sesuai grade student
- **State machine** — `session.ts` + `state-machine.ts` untuk routing sesuai konteks
- **Chat logging** — semua chat disimpan ke ChatLog untuk analytics
- **Safety filter** — filter konten tidak pantas di `safety.ts`
- **LLM commands** — Tutor Agent bisa trigger aksi via command format: `[QUIZ]`, `[SCHEDULE]`, `[PASSWORD]`, dll
