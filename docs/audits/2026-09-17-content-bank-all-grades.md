# Bank konten semua kelas: SD_5, SMP_1, SMA_2

Tanggal: 2026-09-17
Prasyarat: `docs/audits/2026-09-17-smp1-content-bank.md`

## Masalah

`generateCurriculumDraft` mengisi setiap materi dari `curriculum-content.ts` dan
menempelkan kuis dari `quiz-bank-*.ts`, tapi bank itu ditulis untuk palet
Kurikulum Merdeka terpadu (IPA/IPS) sementara kurikulum hidup memakai mapel
terpisah yang diajarkan sekolah. Cakupannya:

| Kelas | Topik hidup | Bank konten | Bank kuis |
|---|---|---|---|
| SD_5 (SYIFA001) | 130 | 4/130 | 108/130 |
| SMP_1 (RAIHAN001) | 218 | 1/218 | 54/218 |
| SMA_2 (SHOFI001) | 403 | 8/403 | 121/403 |

Bank topik juga usang untuk SMA_2: `curriculum-topics-sma11.ts` memuat 172 entri
sementara kurikulum hidup punya 403. Karena `GRADE_TOPICS` yang diiterasi
generator, regenerate SMA_2 akan menghasilkan 172 materi saja — 231 topik hilang
tanpa error.

Akibatnya regenerate = kurikulum berbentuk benar tapi kosong. Ini bukan teori:
sebelum pekerjaan ini ketiga kelas berada di keadaan itu.

## Perubahan

Emitter dibuat generik dan dijalankan untuk ketiga kelas.

| Berkas | Perubahan |
|---|---|
| `scripts/emit-content-bank.ts` | baru (generalisasi `emit-smp7-content-bank.ts`); `GRADES` per kelas |
| `scripts/emit-topic-bank.ts` | baru (generalisasi `emit-smp7-bank.ts`); mode `--to <dir>` untuk diff tanpa menulis |
| `scripts/emit-smp7-content-bank.ts` | dihapus (digantikan) |
| `scripts/emit-smp7-bank.ts` | dihapus (digantikan) |
| `src/data/curriculum-content-sd5.ts` | baru — 130 konten |
| `src/data/curriculum-content-sma11.ts` | baru — 402 konten |
| `src/data/quiz-bank-sd5-db.ts` | baru — 130 kuis / 1123 soal |
| `src/data/quiz-bank-sma11-db.ts` | baru — 401 kuis / 2691 soal |
| `src/data/curriculum-topics-sma11.ts` | ditulis ulang — 172 → 402 entri |
| `src/data/curriculum-content.ts` | `getContent(..., grade?)` sadar-kelas |
| `src/data/quiz-bank-sd5.ts` | `getQuiz` gabung bank DB + bank tangan |
| `src/data/quiz-bank-sma11.ts` | idem |
| `src/agents/curriculum/service.ts` | meneruskan `student.gradeLevel` ke `getContent` |

### Kunci harus sadar-kelas

`contentKey` dan `quizKey` memakai `subject||topic||subTopic`. Kunci itu
bertabrakan antar kelas — SD_5∩SMP_1 = 4 kunci, SMP_1∩SMA_2 = 5 kunci (mis.
`Fisika||Suhu dan Kalor||...` ada di SMP_1 dan SMA_2 dengan kedalaman berbeda).
Karena itu `getContent` menerima `grade` dan memilih peta kelas yang benar dulu,
baru jatuh ke peta tangan. Tanpa ini, materi SMA_2 bisa terisi teks SMP_1.

### Bank DB menang, bank tangan tetap ada

Sama seperti SMP_1: bank hasil emit dibaca lebih dulu, bank tangan tetap sebagai
fallback. Tidak ada data lama yang ditimpa.

## Empat cacat data yang ditemukan saat mengerjakan

1. **Bank topik SMA_2 usang** (172 vs 403). Emitter topik menurunkan urutan mapel
   dari kurikulum hidup, bukan daftar tangan, supaya tidak bisa menyimpang lagi.
2. **Escape rusak.** Emitter topik lama meng-escape manual; data hidup memuat
   newline tertanam (`"masa akhir pemerintah Belanda di Indonesia\n…"`) sehingga
   berkas keluar multi-baris dan gagal di-parse. Diganti `JSON.stringify`, yang
   menangani newline, kontrol, kutip, dan CJK sekaligus.
3. **`subTopic` `null` vs `""`.** 19 baris SMA_2 menyimpan `subTopic` sebagai
   `null`; kunci terbentuk `...||null` sementara bank topik menulis `""`, jadi 19
   topik kehilangan konten. Dinormalisasi ke `""` di emitter.
4. **Slide tipis menang.** `slide_sibi` bisa berupa stub (77 dan 81 char) padahal
   `slide` memuat pelajaran asli ~900 char. Aturan lama "ambil yang pertama tidak
   kosong" diam-diam mengirim slide hampir kosong. `pickSlide` sekarang menelusuri
   urutan yang sama dengan `resolveSlideMarkdown`
   (`slide_sibi → slide → slides → slide_moodle`) dan **melewati** kandidat yang
   ditolak validator aplikasi sendiri (`isUsableSlideText`, `!isLlmReasoningDump`).

   Percobaan pertama memilih kandidat terpanjang; itu salah dan dibuang. Ambang
   "terpanjang" membuat bank dan halaman siswa menunjuk teks berbeda untuk baris
   yang sama — bank memilih `slide` (LLM) sementara aplikasi menampilkan
   `slide_sibi`. Setelah disamakan, diff konten SMP_1 turun dari 15062/6527 baris
   menjadi 9/6, artinya hanya 3 entri berubah: justru entri yang `slide_sibi`-nya
   memang tak layak. Bank harus mengirim apa yang dirender, bukan teks terbaik
   menurut ukuran sendiri.

Tambahan: 1 kunci duplikat SMA_2
(`Matematika Penalaran||Logika Matematika||Penarikan Kesimpulan` — satu baris
`weekOrder 999` duplikat baris terjadwal) di-dedupe; baris terjadwal yang menang.

### Baris `weekOrder: 999` BUKAN sampah

83 baris SMA_2 ber-`weekOrder 999` punya konten nyata sampai 3530 char — hanya
belum dijadwalkan. Jangan disaring dari bank; menyaringnya akan membuang 83 topik
berisi.

## Hasil

| Kelas | Topik | Mapel | Konten | Kuis | Soal |
|---|---|---|---|---|---|
| SD_5 | 130 | 7 | 130/130 | 130/130 | 1123 |
| SMP_1 | 218 | 15 | 218/218 | 217/218 | 1103 |
| SMA_2 | 402 | 16 | 402/402 | 401/402 | 2691 |

## Verifikasi

| Uji | Hasil |
|---|---|
| `scripts/verify-content-bank.ts` | **PASS** — 750 topik, 0 konten hilang, 0 kuis hilang tak terjelaskan, 0 slide tak layak, 0 reasoning dump, 0 soal rusak, 4917 soal |
| `scripts/verify-regenerate-all.ts` | **PASS** — ketiga kelas `regen=replaced`, 750/750 materi berisi, slide terpendek 198 char, 0 siswa probe tersisa |
| `scripts/verify-live-http.ts` | **PASS** — HTTP nyata ke produksi: cookie admin sah, regenerate 200 `mode=replaced materialCount=402`, `slides` terbaca 10284/1041/1601 char, anonim 401 |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 |
| `/`, `/login`, `/login/student` | 200 / 200 / 200 |

Siswa nyata tidak tersentuh: RAIHAN001 (218 materi, 15 mapel), SHOFI001 (403),
SYIFA001 (130), TIUMU001 (402) — semuanya utuh.

## Gap yang didokumentasikan, bukan ditutup

Dua topik tidak punya kuis karena **data sumbernya** memang tidak punya. Bank
tidak bisa mengarang kuis yang tidak pernah ada:

1. `SMP_1 / Sejarah / Perubahan Sosial / Dampak Kedatangan Eropa pada Masyarakat
   Indonesia` — 5 soal tersimpan terpotong: hanya `explanation`, `correctIndex`,
   `questionIndex`, tanpa `question`/`options`. Emitter membuang kelimanya.
2. `SMA_2 / Matematika Tingkat Lanjut / Polinomial / Polinomial dan Fungsi
   Polinomial` — baris uji yatim (`weekOrder 1`, `processedContent` kosong,
   `slide_sibi` 3014 char, nol kuis).

Keduanya masuk allowlist eksplisit di `verify-content-bank.ts` dan
`verify-regenerate-all.ts`, supaya gap sah terbedakan dari regresi.

## Sisa pekerjaan

- Perbaiki 23 soal stub di DB (temuan `scripts/audit-quiz-integrity.ts`, 5 materi,
  termasuk 1 milik Syifa) — akar gap #1 di atas.
- Putuskan baris uji `#29` `13c766a1-bf40-493c-aa38-659cf90a8dc5` — akar gap #2.
