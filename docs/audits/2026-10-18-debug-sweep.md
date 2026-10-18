# Debug Sweep — AI Private Tutor

**Tanggal**: 2026-10-18
**Commit awal**: `7605181`
**Metode**: systematic-debugging (prioritas berbasis bukti)
**Status**: 2 bug diperbaiki, tsc clean

## Ringkasan Eksekusi

| Fase | Fokus | Metode | Temuan |
|---|---|---|---|
| Fase 1 | UI React (`src/app`) | AST scan + verifikasi manual | 1 bug nyata |
| Fase 2 | Bot routing (`src/bot`) | Baca `onMessage`, `routeByState`, `vision.ts` | 1 bug nyata (dead code) |
| Fase 3 | LLM/service chain | Audit `client.ts`, fallback, vision models | 3 risiko operasional |
| Fase 4 | Prisma/DB | `tsc --noEmit`, scan query | 0 bug |

## Bug yang Diperbaiki

### BUG-1: Conditional `useState` di dalam IIFE — `StudentDetailView.tsx`

**Lokasi**: `src/app/(dashboard)/dashboard/students/[id]/StudentDetailView.tsx` (L641, L684)

**Masalah**: `useState` untuk `triggerLoading` dan `pipelineRunning` dipanggil di dalam IIFE yang hanya dieksekusi kalau `student.curriculums.length > 0`.

```tsx
{student.curriculums.length > 0 && (() => {
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState<string | null>(null);
  // ...
})()}
```

**Dampak**: React crash saat transisi dari 0 kurikulum → ≥1 kurikulum karena urutan hook berubah.

**Perbaikan**: Pindahkan kedua `useState` ke level atas komponen `StudentDetailView`.

```tsx
export function StudentDetailView({ student }: { student: StudentData }) {
  // ... hook lainnya ...
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState<string | null>(null);
  // ...
}
```

**Status**: ✅ Diperbaiki — `npx tsc --noEmit` exit 0.

### BUG-2: Dead code `vision_pending` di `routeByState`

**Lokasi**: `src/bot/state-machine.ts` (L66-70)

**Masalah**: Ada pemeriksaan `session.currentMode === "vision_pending"` yang mengembalikan `false`, tetapi state `vision_pending` tidak pernah di-set di mana pun di kode. Ini membuat branch tersebut **dead code** dan membingungkan pemahaman routing.

**Perbaikan**: Hapus branch `vision_pending` dari `routeByState`. Photo message tetap langsung di-route ke `handlePhoto`.

**Status**: ✅ Diperbaiki — `tsc --noEmit` clean.

## Risiko Operasional (bukan bug fatal)

| # | Lokasi | Temuan | Risiko | Rekomendasi |
|---|---|---|---|---|
| R1 | `src/llm/client.ts` L83-88 | `VISION_MODELS` masih pakai `sumopod/*` | Vision handler akan fallthrough ke model yang mungkin gagal | Ganti fallback vision ke `cbai/glm-5v-turbo` atau `cbai/kimi-k2.7` |
| R2 | `src/llm/client.ts` L98-123 | Semua role pakai fallback chain identik | Fine-tuning per role terbuang | Pertimbangkan model khusus untuk `content` / `assessment` |
| R3 | `src/llm/client.ts` L139-145 | Daily token cap 1M tanpa alert progresif | Siswa tiba-tiba terblok tanpa peringatan | Tampilkan sisa kuota di dashboard / bot |

## Hal yang Sehat

- `tsc --noEmit`: **0 error**
- Chat history dipaginasi ke 50 pesan — tidak ada context bloat dari riwayat
- Session state machine fail-closed (state tidak dikenal → fallthrough ke tutor)
- Budget check ada sebelum LLM call

## Temuan CodeBuddy (di luar app)

- `cbai/deepseek-v4.1-flash` masih 429/403 karena pembatasan akun/reset window
- `cbai/kimi-k2.7` stabil dan dapat dipakai
- Model baru `deepseek-flash` dikenali CodeBuddy tapi belum diaktifkan di API mereka

## File yang Diubah

```
src/app/(dashboard)/dashboard/students/[id]/StudentDetailView.tsx
src/bot/state-machine.ts
```

## Status Akhir

- 2 bug nyata diperbaiki
- 0 error TypeScript
- 0 kode diubah selain 2 file di atas
- Tidak ada perubahan model default (masih `ai_tutor_agent`, opsi `kimi-k2.7` siap jika perlu)
