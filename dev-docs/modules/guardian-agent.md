# Modul: Guardian Agent

> **Path:** `src/agents/guardian/`
> **File Utama:** `admission.ts`, `report.ts`, `early-warning.ts`, `notifier.ts`

---

## Fungsi

Admission siswa baru, generate weekly report untuk orang tua, early warning system, monitoring multiple students.

## File Structure

| File | Fungsi |
|------|--------|
| `index.ts` | Barrel exports (handleAdmission, generateWeeklyReport, checkEarlyWarnings, dll) |
| `admission.ts` | Student admission flow — daftar via parent |
| `report.ts` | Weekly report generator — progress, weak areas, partisipasi |
| `early-warning.ts` | Early warning detection — tidak belajar, nilai turun, dll |
| `safety.ts` | Report safety check — emergency keywords, forbidden phrases |
| `notifier.ts` | Kirim notifikasi ke parent via Telegram |
| `worker.ts` | Queue consumer untuk `guardian-report` |

## Queue

| Queue | Concurrency | Trigger |
|-------|-------------|---------|
| `guardian-report` | 1 | Cron (setiap minggu) |

## Data Flow

```
Admission:
Parent daftar di bot → admission.ts
    ├── Buat Student record (status PENDING)
    ├── Set persona sesuai grade
    └── Notifikasi admin via dashboard

Weekly Report:
guardian-report queue (cron mingguan)
    │
    ▼
report.ts → Ambil data dari ProgressSnap, Attempt, ScheduleSession
    ├── Hitung progress per subject
    ├── Identifikasi weak areas
    ├── Safety check → scan emergency keywords
    └── Kirim ke parent via notifier.ts

Early Warning:
early-warning.ts (dipanggil setelah assessment)
    ├── Deteksi: tidak belajar >3 hari, nilai turun, dll
    ├── Buat Intervention record
    └── Notifikasi parent
```

## Key Logic

- **Safety** — scan report untuk kata-kata darurat, cegah informasi tidak pantas
- **Multiple students per parent** — satu parent bisa monitor beberapa anak
- **Intervention severity** — LOW, MEDIUM, HIGH, EMERGENCY
