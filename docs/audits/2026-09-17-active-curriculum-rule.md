# Kurikulum ganda: satu siswa, dua kurikulum penuh

Tanggal: 2026-09-17
Commit: `e8a0327`
Siswa acuan: **RAIHAN001** (SMP_1)

## Ringkasan

Raihan punya **dua kurikulum penuh**, bukan satu. Regenerasi kurikulum menyisipkan baris
dengan `version + 1` dan **meninggalkan baris lama di tempatnya**:

| Kurikulum | Dibuat | Material |
|---|---|---|
| v1 | 2026-07-12 | 264 |
| v3 | 2026-07-14 | 228 |

129 pelajaran ada di kedua baris.

Keduanya bukan separuh dari satu kurikulum — keduanya **pemetaan minggu yang berbeda**.
`Bilangan Bulat` adalah minggu 1 di v3 dan **minggu 999** di v1. Menggabungkan keduanya
karena itu bukan merge, melainkan sampah: `weekOrder` kehilangan makna.

Empat belas jalur baca menggabung semua kurikulum milik siswa. Dampak yang terlihat siswa:

| Jalur | Sebelum | Sesudah |
|---|---|---|
| Palet mapel (`/api/students/subjects`) | 15 mapel | **12 mapel** |
| Halaman mapel — Fisika | 36 baris | **18 baris** |
| Halaman mapel — IPA | 62 baris | **31 baris** |
| Halaman mapel — IPS | 28 baris | **14 baris** |
| Total material yang di-query | 492 | **228** |

`Biologi`, `Sejarah`, `Geografi` hanya ada di v1, jadi ketiganya muncul di palet Raihan
padahal ia tidak punya materi itu di kurikulum yang berlaku.

## Aturan

Kurikulum yang berlaku = **`version` tertinggi**.

Itu bukan aturan baru. Konvensi ini sudah dipakai jalur tulis dan **kedua** skrip audit
(`scripts/prosem-coverage.ts`, `scripts/sync-weekorder-prosem.ts`) maupun
`src/services/weekly-exam-generator.ts`. Tiga belas tempat lain tidak mengikutinya.

Modul baru `src/lib/curriculum-active.ts` (68 baris) membuat aturan ini punya **satu
definisi, bukan sembilan salinan**:

- `ACTIVE_CURRICULUM_ORDER` — `orderBy` Prisma, untuk jalur yang butuh barisnya utuh
- `getActiveCurriculumId(studentId)` — untuk jalur yang hanya butuh id

## Jalur yang diperbaiki

| Berkas | Sebelum | Sesudah |
|---|---|---|
| `src/lib/prosem-context.ts` | `flatMap` semua kurikulum | kurikulum aktif |
| `src/lib/student-prosem-context.ts` | idem | idem |
| `src/agents/scheduler/assigner.ts` | material + weak subject lintas kurikulum | kurikulum aktif |
| `src/app/api/students/subjects/route.ts` | palet mapel union | kurikulum aktif |
| `src/app/api/students/topics/route.ts` | `createdAt desc` | kurikulum aktif |
| `src/app/api/students/quizzes/route.ts` | `curricula[0]` | kurikulum aktif |
| `src/app/api/students/quizzes/[id]/route.ts` | cek kepemilikan lintas kurikulum | kurikulum aktif |
| `src/app/api/students/route.ts` | queue content + assessment | kurikulum aktif |
| `src/app/api/students/[id]/route.ts` | — | tidak diubah (hapus harus semua) |
| `src/app/api/cron/progress-snap/route.ts` | snapshot lintas kurikulum | kurikulum aktif |
| `src/app/api/exam/template/route.ts` | `createdAt desc` | `version desc` |
| `src/app/api/admin/curriculum/route.ts` | `createdAt desc` | `version desc` |
| `src/app/api/mindmap/screenshot/route.ts` | `createdAt desc` | `ACTIVE_CURRICULUM_ORDER` |
| `src/app/api/curriculum/regenerate/route.ts` | `createdAt desc` | idem |
| `src/app/api/curriculum/batch-generate/route.ts` | `createdAt desc` (2 tempat) | idem |
| `src/app/api/curriculum/batch-mindmap/route.ts` | `createdAt desc` (2 tempat) | idem |
| `src/app/(student)/student/page.tsx` | material sesi hari ini lintas kurikulum | kurikulum aktif |
| `src/app/(student)/student/subject/[subject]/page.tsx` | union v1+v3 | kurikulum aktif |
| `src/app/(student)/student/topic-tree/[subject]/page.tsx` | idem | idem |
| `src/app/(student)/student/videos/page.tsx` | idem | idem |
| `src/app/(student)/student/big-mindmap/page.tsx` | idem | idem |
| `src/app/(student)/student/big-mindmap/[subject]/page.tsx` | idem | idem |
| `src/app/(dashboard)/dashboard/students/[id]/page.tsx` | `createdAt desc` (2 tempat) | `version desc` |
| `src/bot/handlers/material.ts` | `/materi` lintas kurikulum | kurikulum aktif |
| `src/agents/assessment/worker.ts` | fallback cari material lintas kurikulum | kurikulum aktif |
| `src/services/exam-generator.ts` | `curriculums[0]` **tanpa `orderBy`** | kurikulum aktif |
| `src/services/weekly-exam-generator.ts` | `createdAt desc` | `version desc` |
| `src/scripts/attach-quizzes.ts` | `createdAt desc` | `version desc` |

Dua bug terpisah ikut ketahuan:

1. `src/services/exam-generator.ts` memakai `include: { curriculums: true }` **tanpa
   `orderBy`** — ia mengambil baris mana pun yang dikembalikan Postgres lebih dulu.
   Urutannya tak tentu, bukan "yang terbaru".
2. `src/services/weekly-exam-generator.ts` memakai `createdAt desc` sementara seluruh
   skrip audit memakai `version desc`. Dua aturan untuk satu pertanyaan.

## Sengaja TIDAK diubah

| Berkas | Alasan |
|---|---|
| `src/app/api/admin/students/[id]/route.ts` | hard delete — **wajib** menghapus semua kurikulum |
| `src/app/api/students/[id]/route.ts` | hard delete siswa — idem |
| `src/app/api/admin/students/route.ts` | `_count.curriculums` — sekadar menghitung |
| `src/app/api/admin/students/approve/route.ts` | membaca kurikulum siswa *template* |
| `src/agents/guardian/admission.ts` | idem |
| `src/bot/handlers/register.ts` | cek `length > 0`, bukan memilih satu |
| `src/app/(dashboard)/dashboard/students/[id]/StudentDetailView.tsx` | menerima `curriculums` hasil `take: 1` dari page-nya |
| `src/agents/scheduler/assigner.ts:325` | `student.curriculums[0]` untuk cek keberadaan saja |
| `scripts/prosem-coverage.ts`, `scripts/sync-weekorder-prosem.ts` | sudah benar |
| `src/services/weekly-exam-generator.ts:425` | memang sengaja lintas kurikulum (`gradeLevel`, per-kelas) |

**Baris v1 TIDAK dihapus.** Instruksi: "biarkan dan perbaiki querynya saja". Perbaikan ini
murni query.

## Bukti

| Uji | Hasil |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run build` | **sukses** |
| `scripts/check-active-curriculum.ts` | **10/10 PASS** |
| `scripts/audit-raihan-visible.ts` | palet 15→12, Fisika 36→18, IPA 62→31, IPS 28→14, material 492→228 |
| `pm2 restart ai-private-tutor` | online, `Ready in 133ms`, queue 10 initialised |
| `https://senangbelajar.web.id/` | **200** |
| `/login` | **200** |
| `/login/student` | **200** |
| `/api/students/subjects` tanpa auth | **401** |
| Log pm2 pasca-restart | bersih (error hanya pra-restart 16:10, dari server-action ID build lama) |

Keluaran `scripts/audit-raihan-visible.ts`:

```
══ RAIHAN001 (SMP_1) — 2 curriculum(s) ══

  v3  2026-07-14  228 materials
  v1  2026-07-12  264 materials

  ACTIVE (v3) = e94cf3dd-3fae-4fae-b28f-e7aa899d11e7
  matches highest version: true

── palet mapel (/api/students/subjects) ──
  SEBELUM (union semua) : 15 mapel
  SESUDAH (aktif saja)  : 12 mapel
  mapel v1 yang kini tidak lagi tampil: Biologi, Geografi, Sejarah

── jumlah material (halaman mapel) ──
  SEBELUM (union semua) : 492
  SESUDAH (aktif saja)  : 228
  Fisika   SEBELUM  36 → SESUDAH  18
  IPA      SEBELUM  62 → SESUDAH  31
  IPS      SEBELUM  28 → SESUDAH  14
```

`scripts/check-active-curriculum.ts`:

```
RAIHAN001 (SMP_1) — 2 curriculum(s)
  [PASS] resolves to highest version (v3)
  [PASS] orderBy[0] is the active row
  [PASS] active-only differs from union (the guarded bug is real) — subjects 12 vs 15, materials 228 vs 492
  [PASS] active-only is a strict subset
SHOFI001 (SMA_2) — 1 curriculum(s)
  [PASS] resolves to highest version (v1)
  [PASS] orderBy[0] is the active row
SYIFA001 (SD_5) — 1 curriculum(s)
  [PASS] resolves to highest version (v1)
  [PASS] orderBy[0] is the active row
TIUMU001 (SMA_2) — 1 curriculum(s)
  [PASS] resolves to highest version (v1)
  [PASS] orderBy[0] is the active row

ALL PASS
```

## Catatan tooling: `scripts/run-ts.mjs`

Skrip guard **gagal dijalankan** lewat `npx --no-install jiti <file>`:

```
Error: Cannot find module '@/lib/prisma'
Require stack:
- /home/ubuntu/ai-private-tutor/src/lib/curriculum-active.ts
```

Sebabnya: CLI jiti memanggil `createJiti(pwd)` **tanpa opsi** (lihat
`node_modules/jiti/lib/jiti-cli.mjs`), jadi ia tidak membaca `tsconfig.json` dan tidak
tahu alias `@/`. Setiap modul `src/lib` yang mengimpor lewat alias akan gagal — bukan
hanya `curriculum-active.ts`.

`node_modules/.bin` tidak punya `tsx`, `ts-node`, maupun `esbuild`. `scripts/run-ts.mjs`
(25 baris) mendaftarkan alias ke jiti secara eksplisit:

```js
const jiti = createJiti(root, { alias: { "@": resolve(root, "src") } });
```

Pakai ini untuk semua skrip TS yang menyentuh `src/`:

```
node scripts/run-ts.mjs scripts/<nama>.ts
```

Skrip yang hanya mengimpor sesama `scripts/` dan `src/` lewat jalur relatif tetap bisa
pakai jiti CLI biasa (`scripts/check-subject-identity.ts`, `scripts/prosem-coverage.ts`).

## Sisa pekerjaan

1. **Push.** `6ca47bb`, `15fec1e`, `46ec7d3`, `e8a0327` belum di-push ke `origin/master`.
   Menunggu konfirmasi.
2. **Baris v1 Raihan masih di DB** (264 material, 129 duplikat). Sesuai instruksi, tidak
   dihapus. Bila nanti dihapus, tidak ada jalur baca yang akan terpengaruh — semua sudah
   memilih v3.
3. Empat siswa lain hanya punya satu kurikulum, jadi aturan ini tidak mengubah apa pun
   bagi mereka (terverifikasi di `check-active-curriculum.ts`).
