# SMP_1: bank konten, sumber generate, dan tombol regenerate

Tanggal: 2026-09-17
Siswa acuan: `RAIHAN001` (SMP_1)
Prasyarat: `docs/audits/2026-09-17-smp1-sibi-geografi.md`

## Masalah

Tiga cacat terpisah, semuanya di jalur yang sama: apa yang terjadi kalau
kurikulum siswa di-generate ulang.

1. **Bank topik memakai palet yang salah.** `src/data/curriculum-topics-smp7.ts`
   berisi 99 entri untuk 8 mapel Kurikulum Merdeka terpadu — ada `IPA` dan
   `IPS`, tidak ada Biologi/Fisika/Kimia/Geografi/Sejarah. Sekolah menjalankan
   kelimanya sebagai kursus Moodle terpisah dan tidak punya kursus IPA/IPS
   sama sekali. Jadi kurikulum hasil generate tidak akan pernah memuat mapel
   wajib.

2. **Bank konten dan kuis hampir tidak menutup.** Terhadap 218 topik SMP_1
   sekarang: `curriculum-content.ts` cocok **1**, `quiz-bank-smp7.ts` cocok
   **54**. `generateCurriculumDraft` mengisi materi dari bank ini, jadi
   regenerate akan menghasilkan 218 baris yang bentuknya benar tapi **kosong**.

3. **Tombol regenerate mati, bukan berbahaya.** `regenerate/route.ts:36`
   memanggil `curriculum.deleteMany({ where: { studentId } })`. Setiap FK di
   rantai itu RESTRICT, jadi panggilan itu bukan menghapus — dia melempar
   P2003 dan membalas 500.

## Bukti cacat 3

Diuji pada siswa sekali pakai (`ZZTEST_REGEN`), memanggil `deleteMany` yang
persis sama dengan yang dipakai route:

```
regenerate's deleteMany -> PrismaClientKnownRequestError code=P2003
curricula still present: 1
```

Konsekuensinya dua arah: fitur tidak pernah berfungsi, **dan** tidak pernah
menghapus apa pun. Catatan lama yang menyebut `deleteMany` sebagai "penyebab
salinan manual hilang" tidak akurat — yang menghapus 30 material dulu adalah
skrip ad-hoc, bukan route ini.

## Perbaikan

### 1. Palet topik (`e0a9931`)

Bank dibangun ulang dari kurikulum yang sudah bekerja. Lima baris IPA/IPS yang
memang mendeskripsikan satu mapel dipindah; sisanya sisa tak terpetakan.

| Aksi | Jumlah | Contoh |
|---|---|---|
| Dipindah | 5 | IPA *Suhu dan Kalor* ×2 → **Fisika**; IPS *Kegiatan Ekonomi* ×2 → **Ekonomi**; IPS *Sosialisasi dan Lembaga Sosial* → **Sosiologi** |
| Dihapus | 40 | sisa `weekOrder: 999`, atau sudah terwakili mapel pecahannya |
| Kuis dihapus | 40 | ikut materi |
| Attempt tersentuh | **0** | — |

99 entri / 8 mapel → **218 entri / 15 mapel**.

### 2. Bank konten + kuis (`876e2c2`)

Di-emit dari kurikulum hidup ke berkas terpisah, dan **dibaca lebih dulu**
daripada bank lama yang dibiarkan utuh sebagai fallback:

| Berkas | Isi |
|---|---|
| `src/data/curriculum-content-smp7.ts` | 218 entri, slide markdown asli (394 KB) |
| `src/data/quiz-bank-smp7-db.ts` | 217 entri, 1103 soal (401 KB) |

Dua hal yang harus ditangani saat emit:

- **Soal stub.** Baris kuis dari pipeline lama bisa terpotong: hanya
  `explanation` + `correctIndex` + `questionIndex`, tanpa `question` atau
  `options`. Itu tidak memenuhi `QuestionData` dan akan menggagalkan `tsc`.
  Emitter memproyeksikan tiap soal ke tipe dan **membuang** yang tidak bisa
  dibuktikan bisa dirender (10 dari 1113), bukan memaksakannya.
- **`metadata.slide`.** Viewer slide membaca markdown dari `metadata` saja;
  `processedContent` hanya fallback yang dipecah pada baris kosong
  (`lib/content/slide-content.ts`, `slideCandidates`). Bank text dicerminkan
  ke `metadata.slide` supaya materi hasil generate tampil sama seperti materi
  hasil scrape, termasuk pemisah `---`.

### 3. Regenerate (`155219b`)

Mengganti kurikulum adalah dua operasi berbeda, tergantung apakah kuisnya
sudah dijawab. `replaceCurriculumForStudent` memilih salah satu:

| Kondisi | Mode | Perilaku |
|---|---|---|
| Belum ada attempt | `replaced` | Hapus berurutan (reviewQueue → attempt → quiz → material → curriculum); nomor versi mulai ulang di **v1** |
| Ada attempt | `blocked` | **Ditolak** — 409, sebutkan jumlah attempt |
| Ada attempt + `force: true` | `superseded` | Versi lama disimpan untuk riwayat, versi baru `v(max+1)` |

Alasan `blocked` jadi default: supersede membangun kurikulum baru lalu
menjadikannya aktif. Selama kurikulum baru belum diisi, siswa dilayani materi
kosong. Guard ini yang mencegah kurikulum kaya Raihan ditimpa hasil generate.

## Verifikasi

| Uji | Hasil |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | sukses |
| `verify-smp7-bank.ts` | **PASS** — 218/218 konten, 217/218 kuis, 0 slide tak layak, 0 reasoning dump, 0 soal rusak, 218 kunci unik |
| `verify-regenerate-smp7.ts` | **PASS** — 15 mapel, IPA/IPS 0, **218/218 materi ≥120 char** (rata-rata 1726), 218/218 `metadata.slide`, idempoten, `blocked`/`superseded` benar, riwayat attempt utuh |
| `audit-quiz-integrity.ts` | 23/8987 soal tak bisa dirender, di 5 materi |
| Raihan sesudah semua perubahan | 218 baris, 15 mapel, tanpa IPA/IPS |
| `/`, `/login`, `/login/student` | 200 / 200 / 200 |

Sebelum: regenerate → 218 materi, **1 berisi**.
Sesudah: regenerate → 218 materi, **218 berisi**.

## Cacat tersisa

1. **Satu topik tanpa kuis.** `Sejarah / Perubahan Sosial / Dampak Kedatangan
   Eropa pada Masyarakat Indonesia` tersimpan dengan lima soal stub (hanya
   `explanation`+`correctIndex`+`questionIndex`), semuanya dibuang emitter.
   Bank tidak bisa mengarang soal. Dicatat sebagai celah yang diketahui di
   `verify-smp7-bank.ts`, bukan ditutupi diam-diam. Perbaikan baris DB-nya
   pekerjaan terpisah.

2. **22 soal rusak lain di luar SMP_1.** Total 23; 10 ada di 4 materi lain
   milik Raihan, 4 di materi `IPAS` milik SYIFA001 (`SD_5`). Lihat
   `scripts/audit-quiz-integrity.ts`. Perlu keputusan: perbaiki, atau buang
   soalnya.

3. **Bank hanya untuk SMP_1 — dan SD_5 / SMA_2 kena cacat yang sama.** Diukur
   terhadap `GRADE_TOPICS`:

   | Kelas | Topik | Mapel | Bank konten | Bank kuis |
   |---|---|---|---|---|
   | SMP_1 | 218 | 15 | 218/218 ✅ | 217/218 ✅ |
   | SD_5 | 130 | 7 | **4/130 (3%)** ❌ | 108/130 (83%) |
   | SMA_2 | 172 | 15 | **8/172 (5%)** ❌ | 121/172 (70%) |

   Jadi regenerate pada kurikulum Syifa atau Shofi akan menghasilkan materi
   kosong, persis seperti SMP_1 sebelum perbaikan ini. Guard `blocked` mencegah
   kerusakan, tapi bank-nya belum diperkaya. Kurikulum hidup keempat siswa
   semuanya kaya (402/402, 403/402, 218/204, 130/130 materi berisi), jadi
   tidak ada yang sedang rusak — hanya belum tahan regenerate.

   Perbaikannya sama polanya: jalankan
   `emit-smp7-content-bank.ts` untuk SD_5 dan SMA_2 setelah parameternya
   digeneralisasi (sekarang nama berkas dan kuncinya di-hardcode ke SMP_1).
