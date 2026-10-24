# Modul: Guardian Agent

> **Path:** `src/agents/guardian/`
> **Verifikasi:** 2026-10-25, commit `0207add`

---

## Fungsi

Menerima siswa baru (admission), menyusun laporan untuk orang tua, mendeteksi siswa
berisiko, dan mengirim notifikasi — dengan guardrail keselamatan yang keras.

## File

| File | Fungsi |
|------|--------|
| `index.ts` | Barrel export |
| `admission.ts` | `handleAdmission()`, `tryCopyFromTemplate()`, `createInitialSchedule()` |
| `report.ts` | `generateWeeklyReport()` |
| `early-warning.ts` | `checkEarlyWarnings()` |
| `safety.ts` | `scanEmergencyKeywords()`, `createEmergencyIntervention()`, `checkReportSafety()`, `sanitiseReport()`, `verifyStudentOwnership()`, `filterVisibleStudents()` |
| `notifier.ts` | `formatWeeklyReport()`, `sendWeeklyReportToParent()`, `sendEarlyWarningToParent()`, `sendEmergencyAlertToParent()` |
| `worker.ts` | `processGuardianReportJob()` |

## Queue

| Queue | Concurrency | Trigger |
|-------|------:|---------|
| `guardian-report` | 1 | Cron mingguan (`guardian-report-weekly`) |

## Guardrail Keselamatan (`safety.ts`)

- **Eskalasi darurat** — kata kunci menyakiti diri / bullying → notifikasi orang tua segera
  + `Intervention` severity `EMERGENCY`.
- **Tanpa perbandingan saudara** — laporan tidak boleh membandingkan anak dengan saudaranya.
- **Privasi antar keluarga** — `filterVisibleStudents()` + `verifyStudentOwnership()`
  memastikan data satu siswa tidak bocor ke orang tua lain.
- **Sanitisasi laporan** — `checkReportSafety()` + `sanitiseReport()` sebelum kirim.

## Data Flow

### Admission

```
POST /api/admission
    ├── handleAdmission(input)
    ├── tryCopyFromTemplate(gradeLevel)  → salin kurikulum dari template sejenjang
    │      (Syifa SD_5 · Raihan SMP_1 · SHOFI SMA_2)
    ├── createInitialSchedule()          → ScheduleSession awal
    └── status PENDING → approve lewat dashboard admin
```

### Laporan Mingguan

```
guardian-report queue (cron Minggu 18:00)
    └── generateWeeklyReport(studentId, period)
         ├── baca Attempt, StudentActivity, StudentSubjectMastery, ProgressSnap
         ├── checkReportSafety() → sanitiseReport()
         └── sendWeeklyReportToParent() → telegram parentTelegramId
```

### Early Warning

```
checkEarlyWarnings(studentId)
    ├── deteksi: tidak aktif, nilai turun, sesi terlewat berulang
    ├── buat Intervention (LOW / MEDIUM / HIGH / EMERGENCY)
    └── sendEarlyWarningToParent() / sendEmergencyAlertToParent()
```

## Endpoint Terkait

`POST /api/cron/guardian-report`, `POST /api/cron/guardian-monthly`,
`GET /api/student/guardian-link`, `POST /api/admission`.

## Known Issue

Job Hermes `guardian-monthly` selalu gagal karena `guardian-monthly-trigger.sh`
mewajibkan argumen yang tidak pernah dikirim job. Laporan **mingguan** tidak terpengaruh.
