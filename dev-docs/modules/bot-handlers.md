# Modul: Bot Handlers

> **Path:** `src/bot/handlers/`
> **File Utama:** `message.ts` (router utama)

---

## Fungsi

Router dan handler untuk semua tipe pesan yang masuk dari Telegram via webhook. Setiap handler menangani tipe pesan atau command spesifik.

## File Structure

| File | Menangani | Fungsi |
|------|-----------|--------|
| `message.ts` | Semua text message | Router utama — state machine → dispatch ke handler sesuai state |
| `start.ts` | `/start` command | Cek registrasi, sambutan sesuai persona |
| `register.ts` | `/register` command | Registrasi parent baru |
| `onboarding.ts` | Teks selama onboarding | Proses data registrasi student (nama, kelas, dll) |
| `quiz.ts` | Quiz callback | Quiz interaktif — kirim soal, terima jawaban |
| `vision.ts` | Photo/image | Analisis gambar (foto soal) via LLM vision |
| `schedule.ts` | Schedule callback | Konfirmasi/ubah jadwal |
| `material.ts` | Material command | Lihat materi pembelajaran |
| `youtube.ts` | YouTube command | Ringkasan video YouTube, rekomendasi |
| `parent.ts` | Parent commands | Report, progress, warning untuk parent |
| `progress.ts` | Progress command | Lihat progress belajar |
| `generic.ts` | Unknown commands | Fallback untuk command tidak dikenal |

## State Machine Routing

```
message.ts menerima teks
    │
    ▼
getSession(studentId) → ambil session state dari DB
    │
    ▼
routeByState(state) → dispatch ke handler yang sesuai:
    ├── ONBOARDING       → onboarding.ts
    ├── STUDY            → tutor.ts (LLM chat)
    ├── QUIZ             → quiz.ts
    ├── SCHEDULE_CONFIRM → schedule.ts
    ├── VISION_RESULT    → vision.ts
    ├── REGISTER_PARENT  → register.ts
    └── default          → message.ts → cek command routing
```

## Command Routing (di message.ts)

Urutan pengecekan:
1. `/start` → start handler
2. `/register` → register handler
3. State-based → routeByState
4. Command dalam teks → extract command → execute
5. Default → LLM chat via tutor agent
