# Modul: Scheduler Agent

> **Path:** `src/agents/scheduler/`
> **File Utama:** `assigner.ts`, `reminder.ts`, `motivation.ts`

---

## Fungsi

Atur jadwal belajar harian & intensif, kirim reminder otomatis via Telegram, auto-reschedule jika student miss sesi, motivasi mingguan.

## File Structure

| File | Fungsi |
|------|--------|
| `index.ts` | Barrel exports |
| `assigner.ts` | Schedule assigner (60/30/10 rule) |
| `reminder.ts` | Reminder logic (H-1, T-30, missed) |
| `motivation.ts` | Weekly motivation generator |
| `reschedule.ts` | Auto-reschedule logic |
| `worker.ts` | Queue consumer untuk `scheduler-assign` dan `scheduler-reminder` |

## Queue

| Queue | Concurrency | Trigger |
|-------|-------------|---------|
| `scheduler-assign` | 1 | Student baru / minggu baru |
| `scheduler-reminder` | 3 | Cron (setiap 3 menit) |

## Jadwal Types

| Type | Durasi | Frekuensi | Tujuan |
|------|--------|-----------|--------|
| **Daily** | 15 menit | 1x per hari (default 16:00) | Belajar konsisten |
| **Intensive** | 3-4 jam | Terjadwal | Persiapan ujian |

## 60/30/10 Rule

Ketika assign jadwal untuk seminggu:
- **60%** — topik yang sudah dipelajari (review)
- **30%** — topik baru (lanjutan)
- **10%** — topik lemah (remedial)

## Cron Pipeline (setiap 3 menit)

```
/api/reminders/check + /api/cron/schedule-sweep
    │
    ├── H-1 reminders → Kirim pengingat H-1 sebelum sesi
    ├── T-30 reminders → Kirim pengingat 30 menit sebelum sesi
    ├── Missed detection → Deteksi sesi terlewat → reschedule
    ├── Daily brief → Kirim ringkasan jadwal hari ini (6-10 AM)
    └── Auto-assign → Assign jadwal mingguan (60/30/10)
```

## Bot Commands

Tutor Agent bisa trigger scheduler via command:
- `[SCHEDULE]` — lihat jadwal hari ini
- `[SCHEDULE:WEEK]` — lihat jadwal minggu ini
- `[SCHEDULE:SET]` — atur preferensi jadwal
- `[SCHEDULE:ASSIGN]` — assign jadwal otomatis
