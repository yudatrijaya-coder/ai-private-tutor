# Modul: Scheduler Agent

> **Path:** `src/agents/scheduler/`
> **Verifikasi:** 2026-10-25, commit `0207add`

---

## Fungsi

Menentukan topik apa yang dipelajari minggu ini, membuat sesi belajar, mengirim pengingat
(H-1 dan T-30), menandai sesi terlewat, serta menjadwalkan ulang.

## File

| File | Fungsi |
|------|--------|
| `index.ts` | Barrel export |
| `assigner.ts` | `assignWeeklyTopics()`, `selectWeakAreaTopics()`, `computeWeeklySlots()` |
| `reminder.ts` | `runReminderSweep()` — H-1, T-30, deteksi missed |
| `reschedule.ts` | `handleReschedule()`, `bulkReschedule()` |
| `motivation.ts` | `checkMilestones()`, `markMotivationSent()` |
| `worker.ts` | `processSchedulerAssign`, `processSchedulerReminder` |

## Queue

| Queue | Concurrency | Trigger |
|-------|------:|---------|
| `scheduler-assign` | 1 | Siswa baru / awal minggu |
| `scheduler-reminder` | 3 | Cron 3 menit (`schedule-sweep`) |

## Algoritma 60/30/10

Dari `assigner.ts` (komposisi topik per minggu):

| Porsi | Isi |
|---|---|
| **60%** | Topik kurikulum baru (materi berstatus READY / PROCESSED / VIDEO_READY) |
| **30%** | Review area lemah (mapel dengan mastery < 50%) |
| **10%** | Permintaan siswa / acak |

Durasi default sesi: 30 menit (`DEFAULT_DURATION`), dapat diubah lewat `scheduleConfig`.

## Jenis Sesi

`enum SessionType` di Prisma: `DAILY` dan `INTENSIVE`. Preferensi jadwal siswa disimpan
di `Student.scheduleConfig` (JSON) — default 1×/hari pukul 16:00, Minggu dikecualikan.

## Pipeline Cron

Satu-satunya pintu masuk terjadwal adalah `GET /api/cron/schedule-sweep`
(job Hermes `schedule-reminder-sweep`, setiap 3 menit):

```
schedule-sweep
    ├── runReminderSweep()
    │    ├── H-1 → "Besok ada sesi belajar"
    │    ├── T-30 → "30 menit lagi"
    │    └── missed → tandai sesi lewat → reschedule
    ├── Daily brief (jendela pagi, dedup per hari)
    └── Auto-assign → assignWeeklyTopics() saat siswa belum punya sesi
```

`/api/reminders/check` (reminder personal dari tabel `Reminder`) **tidak** dijadwalkan
dan bukan bagian dari sweep ini.

## Perintah Bot Terkait

Ditangani `src/bot/handlers/schedule.ts` dan `school-schedule.ts`:

| Tag / perintah | Fungsi |
|---|---|
| `[SCHEDULE]` | Jadwal hari ini |
| `[SCHEDULE:WEEK]` | Jadwal minggu ini |
| `[SCHEDULE:SET:{json}]` | Atur preferensi jadwal |
| `[SCHEDULE:ASSIGN]` | Assign jadwal otomatis |
| `[SCHOOL_SCHEDULE]`, `[SCHOOL_SCHEDULE:NEXT:<mapel>]` | Jadwal sekolah asli (SIKumbang) |
| `/jadwal`, `/jadwal_sekolah` | Versi slash command |
