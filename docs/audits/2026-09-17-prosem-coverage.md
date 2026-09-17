# Audit cakupan prosem — sesi mana yang belum punya material

Dibuat: 2026-09-17T05:03:45.778Z  
Sumber: 17 berkas `src/data/prosem/*.json` (prosem terbaru) vs tabel `Material`
di kurikulum **aktif** tiap siswa (versi tertinggi).

Cara reproduksi:

```bash
npx tsx scripts/prosem-coverage.ts          # cetak laporan + tulis JSON
python3 scripts/prosem-coverage-report.py   # tulis dokumen ini dari JSON
```

## Verdict

| Verdict | Arti | Tindakan |
|---|---|---|
| `COVERED` | fuzzy >= 0.84 — label prosem dan material jelas sama | tidak perlu apa-apa |
| `CONTAINED` | semua kata bermakna label pelajaran ada di teks sesi | **wajib diaudit** — mesin tidak boleh memutuskan sendiri |
| `CHAPTER` | bab ada di kurikulum, pelajaran spesifiknya tidak ketemu namanya | **wajib diaudit** — paling mungkin menyembunyikan celah |
| `NEAR` | fuzzy 0.6–0.84 — label beda, isi kemungkinan ada | tinjau manual |
| `MISSING` | fuzzy < 0.6 dan tidak ada bab yang cocok | **kemungkinan besar belum digenerate** |
| `ABSENT` | mapel sama sekali tidak ada di kurikulum aktif | belum ada kurikulumnya |

Sesi asesmen (sumatif, remedial, total, PTS/PAS) dikecualikan — memang tanpa material.

## Ringkasan

Total sesi konten: **213** — covered **151**, bab ada **18**, near **2**, missing **42**, absent **0**; asesmen dikecualikan **73**.

| Siswa | Grade | Mapel | Sem | Sesi | Covered | Bab ada | Near | Missing | Absent | Asesmen |
|---|---|---|---|---|---|---|---|---|---|---|
| RAIHAN001 | VII | Bahasa Indonesia **!** | ganjil | 21 | 16 | 3 | 1 | 1 | 0 | 5 |
| RAIHAN001 | VII | Bahasa Mandarin | ganjil | 11 | 11 | 0 | 0 | 0 | 0 | 2 |
| RAIHAN001 | VII | Biologi **!** | ganjil | 10 | 0 | 3 | 0 | 7 | 0 | 4 |
| RAIHAN001 | VII | Biologi **!** | genap | 8 | 1 | 1 | 0 | 6 | 0 | 2 |
| RAIHAN001 | VII | Fisika **!** | ganjil | 13 | 7 | 5 | 0 | 1 | 0 | 5 |
| RAIHAN001 | VII | Informatika **!** | ganjil | 8 | 1 | 0 | 0 | 7 | 0 | 3 |
| RAIHAN001 | VII | Pendidikan Pancasila | ganjil | 8 | 8 | 0 | 0 | 0 | 0 | 5 |
| RAIHAN001 | VII | Sejarah **!** | ganjil | 3 | 1 | 0 | 0 | 2 | 0 | 3 |
| SHOFI001 | XI | Bahasa Indonesia **!** | ganjil | 11 | 8 | 2 | 0 | 1 | 0 | 5 |
| SHOFI001 | XI | Bahasa Indonesia | genap | 8 | 7 | 1 | 0 | 0 | 0 | 5 |
| SHOFI001 | XI | Biologi **!** | ganjil | 35 | 29 | 2 | 1 | 3 | 0 | 5 |
| SHOFI001 | XI | Fisika | ganjil | 12 | 12 | 0 | 0 | 0 | 0 | 6 |
| SHOFI001 | XI | Kimia | ganjil | 15 | 15 | 0 | 0 | 0 | 0 | 5 |
| SHOFI001 | XI | Matematika Penalaran | ganjil | 12 | 12 | 0 | 0 | 0 | 0 | 4 |
| SHOFI001 | XI | Matematika Tingkat Lanjut **!** | ganjil | 14 | 0 | 0 | 0 | 14 | 0 | 5 |
| SHOFI001 | XI | Matematika | ganjil | 18 | 18 | 0 | 0 | 0 | 0 | 6 |
| SHOFI001 | XI | Sejarah | ganjil | 6 | 5 | 1 | 0 | 0 | 0 | 3 |

## Celah: 42 sesi

Diurutkan dari yang paling banyak. `best=` adalah kandidat terdekat yang ditemukan — kalau skornya kecil dan labelnya tidak berhubungan, artinya materi itu memang belum ada.

### SHOFI001 · Matematika Tingkat Lanjut · ganjil (14 sesi)

| Minggu | Topik / Subtopik prosem | Kandidat terdekat | Skor |
|---|---|---|---|
| w1 | Aljabar / Polinomial dan Fungsi Polinomial | Vektor / Perkalian Titik dan Silang | 0.145 |
| w11,12 | Aljabar / Aturan Cosinus | Matriks / Operasi Matriks | 0.166 |
| w12,13 | Aljabar / Fungsi Trigonometri | Matriks / Invers Matriks | 0.133 |
| w14,15 | Aljabar / Fungsi Rasional | Vektor / Perkalian Titik dan Silang | 0.13 |
| w15,16 | Aljabar / Fungsi Irasional | Vektor / Perkalian Titik dan Silang | 0.13 |
| w16,17 | Aljabar / Fungsi Nilai Mutlak | Matriks / Invers Matriks | 0.141 |
| w17,18 | Aljabar / Fungsi Tangga | Vektor / Perkalian Titik dan Silang | 0.13 |
| w18 | Aljabar / Fungsi Piecewise | Matriks / Operasi Matriks | 0.08 |
| w2 | Aljabar / Operasi Aljabar pada Polinomial | Matriks / Operasi Matriks | 0.254 |
| w3,4 | Aljabar / Pembagian Sintetik dan Kesamaan | Vektor / Perkalian Titik dan Silang | 0.321 |
| w5,6 | Aljabar / Teorema Sisa dan Teorema Faktor | Matriks / Operasi Matriks | 0.2 |
| w6,7 | Aljabar / Akar-Akar Persamaan Polinomial | Matriks / Operasi Matriks | 0.133 |
| w8,9 | Aljabar / Identitas Trigonometri | Matriks / Operasi Matriks | 0.171 |
| w9,10 | Aljabar / Aturan Sinus | Matriks / Operasi Matriks | 0.196 |

### RAIHAN001 · Biologi · ganjil (7 sesi)

| Minggu | Topik / Subtopik prosem | Kandidat terdekat | Skor |
|---|---|---|---|
| w10,11 | Pemahaman IPA dan Ketrampilan Proses / Klasifikasi Lima Kerajaan | IPA / Klasifikasi Makhluk Hidup / Klasifikasi Makhluk Hidup | 0.393 |
| w14 | Pemahaman IPA dan Ketrampilan Proses / Sel sebagai Unit Struktural dan Fungsional Kehidupan | IPA / Pengukuran / Besaran dan Pengukuran | 0.183 |
| w4 | Pemahaman IPA dan Ketrampilan Proses / Karakteristik Hewan dan Tumbuhan | IPA / Zat dan Perubahan / Pemisahan Campuran | 0.261 |
| w7 | Pemahaman IPA dan Ketrampilan Proses / Tujuan dan Dasar Klasifikasi | IPA / Zat dan Perubahan / Wujud Zat dan Partikel | 0.216 |
| w7 | Pemahaman IPA dan Ketrampilan Proses / Urutan Takson Hewan dan Tumbuhan | IPA / Zat dan Wujudnya / Unsur, Senyawa, dan Campuran | 0.279 |
| w8 | Pemahaman IPA dan Ketrampilan Proses / Tata Nama Ganda | IPA / Bumi dan Tata Surya / Tata Surya | 0.391 |
| w9 | Pemahaman IPA dan Ketrampilan Proses / Kunci Determinasi | IPA / Suhu dan Kalor / Kalor dan Perpindahannya | 0.191 |

### RAIHAN001 · Informatika · ganjil (7 sesi)

| Minggu | Topik / Subtopik prosem | Kandidat terdekat | Skor |
|---|---|---|---|
| w10,11,12,13,14,15,16,17 | Literasi Digital / Membuat presentasi digital | Pemrograman / Pengantar Pemrograman Visual | 0.162 |
| w2 | Literasi Digital / Spesifikasi perangkat keras | Hardware / Pengenalan Perangkat Keras Komputer | 0.281 |
| w3,4 | Literasi Digital / Pengenalan perangkat lunak | Hardware / Pengenalan Perangkat Keras Komputer | 0.554 |
| w5 | Literasi Digital / Pengenalan antar muka pengguna | Hardware / Pengenalan Perangkat Keras Komputer | 0.343 |
| w6 | Literasi Digital / Folder dan file | Keamanan / Keamanan Data dan Privasi | 0.136 |
| w7 | Literasi Digital / Pencarian informasi | Pengantar Informatika / Definisi dan Ruang Lingkup Informatika | 0.391 |
| w8 | Literasi Digital / Surat elektronik | Internet / Jaringan Internet dan Keamanan | 0.156 |

### RAIHAN001 · Biologi · genap (6 sesi)

| Minggu | Topik / Subtopik prosem | Kandidat terdekat | Skor |
|---|---|---|---|
| w1 | Pemahaman IPA dan Ketrampilan Proses / Tingkat Organisasi Kehidupan | IPA / Ilmu Sains / Pelaporan Hasil Percobaan | 0.231 |
| w10 | Pemahaman IPA dan Ketrampilan Proses / Rantai Makanan dan Jaring-Jaring Makanan | IPA / Pengukuran / Besaran dan Pengukuran | 0.189 |
| w2 | Pemahaman IPA dan Ketrampilan Proses / Jaringan Pada Hewan dan Tumbuhan | IPA / Zat dan Wujudnya / Unsur, Senyawa, dan Campuran | 0.236 |
| w3 | Pemahaman IPA dan Ketrampilan Proses / Organ Pada Tumbuhan dan Hewan | IPA / Gerak dan Gaya / Gaya dan Hukum Newton | 0.216 |
| w4 | Pemahaman IPA dan Ketrampilan Proses / Sistem Organ Pada Hewan dan Tumbuhan | IPA / Zat dan Wujudnya / Unsur, Senyawa, dan Campuran | 0.252 |
| w9 | Pemahaman IPA dan Ketrampilan Proses / Praktikum: Pengamatan Komponen Biotik dan Abiotik di Lingkungan Sekolah | IPA / Ekologi / Pelestarian Lingkungan | 0.165 |

### SHOFI001 · Biologi · ganjil (3 sesi)

| Minggu | Topik / Subtopik prosem | Kandidat terdekat | Skor |
|---|---|---|---|
| w13 | Pemahaman biologi mengamati, menyelidiki dan menjelaskan fenomena sesuai kaidah kerja ilmiah dalam materi sistem lokomosi / Hubungan antar tulang | Jaringan / Jaringan Tumbuhan | 0.303 |
| w14 | Pemahaman biologi mengamati, menyelidiki dan menjelaskan fenomena sesuai kaidah kerja ilmiah dalam materi sistem lokomosi / Macam-macam gerakan anatagonis dan sinergis | Sistem Gerak / Gerak Antagonis dan Sinergis | 0.395 |
| w15 | Pemahaman biologi mengamati, menyelidiki dan menjelaskan fenomena sesuai kaidah kerja ilmiah dalam materi sistem lokomosi / Penyakit-penyakit terkait dengan sistem lokomosi | Sistem Sirkulasi / Penyakit Sistem Sirkulasi | 0.285 |

### RAIHAN001 · Sejarah · ganjil (2 sesi)

| Minggu | Topik / Subtopik prosem | Kandidat terdekat | Skor |
|---|---|---|---|
| w1,2,3 | Pemahaman / Periodisasi masa praaksara | IPS / Sejarah Keluarga / Kehidupan Masyarakat Praaksara | 0.394 |
| w4 | Pemahaman / Asal usul leluhur bangsa Indonesia dan kehidupan masa praaksa | IPS / Keragaman Budaya / Keragaman Suku dan Budaya | 0.192 |

### RAIHAN001 · Bahasa Indonesia · ganjil (1 sesi)

| Minggu | Topik / Subtopik prosem | Kandidat terdekat | Skor |
|---|---|---|---|
| w14 | Menyimak / Menyimak informasi dan memahami instruksi dari teks lisan dengan menjawab pertanyaan pada bacaan. | Menyajikan Teks Deskripsi / Menyunting Teks | 0.192 |

### RAIHAN001 · Fisika · ganjil (1 sesi)

| Minggu | Topik / Subtopik prosem | Kandidat terdekat | Skor |
|---|---|---|---|
| w1 | Pemahaman IPA / .Besaran baku dan besaran tak baku | IPA / Pengukuran / Besaran dan Pengukuran | 0.315 |

### SHOFI001 · Bahasa Indonesia · ganjil (1 sesi)

| Minggu | Topik / Subtopik prosem | Kandidat terdekat | Skor |
|---|---|---|---|
| w15 | Membaca dan memirsa / Memahami poster sebagai jenis persuasi | Poster sebagai Teks Persuasi / - | 0.448 |

## Bab ada, pelajaran spesifik tidak ketemu: 18 sesi

Verdict `CHAPTER`: nama babnya ada di kurikulum, tapi tidak ada satu pun pelajaran di dalamnya yang namanya cocok dengan sesi prosem. Sebagian besar kemungkinan sudah tercakup pelajaran yang ada dengan nama berbeda — tapi karena satu bab bisa memuat beberapa sesi, ini yang paling mungkin menyembunyikan celah asli.

- **RAIHAN001 · Bahasa Indonesia (ganjil) · w2**
  - sesi: Membaca dan Memirsa / Menganalisis teks deskripsi dan visual dalam pamflet dengan kritis.
  - bab: `Teks Deskripsi`
  - isi bab: Menulis Teks Deskripsi | Informasi Eksplisit | Mengidentifikasi Ciri Teks Deskripsi | Analisis Teks dan Visual | Kata Jarang Muncul | Mengenal Teks Deskripsi | Gaya Penulisan
- **RAIHAN001 · Bahasa Indonesia (ganjil) · w14**
  - sesi: Membaca dan Memirsa / Mengenali ragam teks prosedur dengan menjawab pertanyaan pada kutipan teks prosedur pada karya fiksi.
  - bab: `Teks Prosedur`
  - isi bab: Ciri Kebahasaan | Infografik | Menyajikan Prosedur | Struktur Prosedur
- **RAIHAN001 · Bahasa Indonesia (ganjil) · w17,18**
  - sesi: Menulis / Menulis teks prosedur sederhana secara runut dan sistematis untuk beragam konteks dan tujuan secara tepat dan kreatif.
  - bab: `Teks Prosedur`
  - isi bab: Ciri Kebahasaan | Infografik | Menyajikan Prosedur | Struktur Prosedur
- **RAIHAN001 · Biologi (ganjil) · w1**
  - sesi: Pemahaman IPA dan Ketrampilan Proses / Konsep Dasar Makhluk Hidup dan Benda Mati
  - bab: `IPA / Makhluk Hidup`
  - isi bab: Klasifikasi Makhluk Hidup | Keanekaragaman Hayati | Ciri-Ciri Makhluk Hidup
- **RAIHAN001 · Biologi (ganjil) · w1**
  - sesi: Pemahaman IPA dan Ketrampilan Proses / Perbedaan Makhluk Hidup dan Benda Mati
  - bab: `IPA / Makhluk Hidup`
  - isi bab: Klasifikasi Makhluk Hidup | Keanekaragaman Hayati | Ciri-Ciri Makhluk Hidup
- **RAIHAN001 · Biologi (ganjil) · w2,3**
  - sesi: Pemahaman IPA dan Ketrampilan Proses / Karakteristik Makhluk Hidup
  - bab: `IPA / Makhluk Hidup`
  - isi bab: Klasifikasi Makhluk Hidup | Keanekaragaman Hayati | Ciri-Ciri Makhluk Hidup
- **RAIHAN001 · Biologi (genap) · w8**
  - sesi: Pemahaman IPA dan Ketrampilan Proses / Satuan dalam Ekosistem
  - bab: `IPA / Ekosistem`
  - isi bab: Komponen Ekosistem dan Interaksi
- **RAIHAN001 · Fisika (ganjil) · w5**
  - sesi: Pemahaman IPA / .Pengukuran panjang, massa, luas, volume dan massa jenis
  - bab: `IPA / Pengukuran`
  - isi bab: Besaran dan Pengukuran
- **RAIHAN001 · Fisika (ganjil) · w6**
  - sesi: Pemahaman IPA / . Praktikum Pengukuran Panjang
  - bab: `IPA / Pengukuran`
  - isi bab: Besaran dan Pengukuran
- **RAIHAN001 · Fisika (ganjil) · w6**
  - sesi: Pemahaman IPA / . Praktikum Pengukuran Massa Jenis
  - bab: `IPA / Pengukuran`
  - isi bab: Besaran dan Pengukuran
- **RAIHAN001 · Fisika (ganjil) · w13**
  - sesi: Pemahaman IPA dan Keterampilan Proses / . Kalor menyebabkan perubahan wujud zat
  - bab: `IPA / Zat dan Wujudnya`
  - isi bab: Unsur, Senyawa, dan Campuran
- **RAIHAN001 · Fisika (ganjil) · w14,15**
  - sesi: Pemahaman IPA dan Keterampilan Proses / . Kalor menyebabkan perubahan suhu
  - bab: `IPA / Suhu dan Kalor`
  - isi bab: Kalor dan Perpindahannya | Suhu dan Pemuaian | Pemuaian | Suhu dan Termometer
- **SHOFI001 · Bahasa Indonesia (ganjil) · w4,5**
  - sesi: Berbicara dan mempresentasikan / Mempersiapkan pertunjukan drama dengan tema tertentu
  - bab: `Drama`
  - isi bab: Menampilkan Pertunjukan Drama | Persiapan Pertunjukan Drama | Menulis Naskah Drama | Pementasan Drama | Naskah Drama | Perbedaan Puisi, Prosa, dan Drama | Unsur Pembangun Drama
- **SHOFI001 · Bahasa Indonesia (ganjil) · w16,17,18**
  - sesi: Menulis / Membuat poster dengan tema ketahanan pangan lokal
  - bab: `Membuat Poster`
  - isi bab: - | Membuat Poster Tema Bersosial Media | Mempromosikan Ketahanan Pangan Lokal
- **SHOFI001 · Bahasa Indonesia (genap) · w2**
  - sesi: Membaca dan memirsa / Memahami struktur karya ilmiah
  - bab: `Karya Ilmiah`
  - isi bab: Menulis Karya Ilmiah | Ragam Karya Ilmiah | Menyajikan Karya Ilmiah | Identifikasi Jurnal Karya Ilmiah | Sistematika Karya Ilmiah | Penulisan Karya Ilmiah | Sistematika Penulisan | Kutipan dan Daftar Pustaka
- **SHOFI001 · Biologi (ganjil) · w3**
  - sesi: Pemahaman biologi mengamati, menyelidiki dan menjelaskan fenomena sesuai kaidah kerja ilmiah dalam materi sistem digesti / Ganguan sistem pencernaan makanan
  - bab: `Sistem Pencernaan`
  - isi bab: Makanan dan Zat Makanan | Gangguan Sistem Pencernaan | Organ Pencernaan | Mekanisme Pencernaan | - | Praktikum Uji Zat Makanan | Enzim dan Nutrisi | Air dan Zat Aditif | Struktur Organ Pencernaan
- **SHOFI001 · Biologi (ganjil) · w18**
  - sesi: Murid memahami keterkaitan struktur organ pada sistem eksresi dan fungsinya dalam merespons stimulus internal dan eksternal / Penyakit-penyakit terkait sistem eksresi
  - bab: `Sistem Eksresi`
  - isi bab: Mekanisme Pembentukan Urine | Struktur dan Fungsi Kulit | Struktur dan Fungsi Hati | Praktikum Uji Urin | Organ Eksresi | Faktor yang Memengaruhi Urine
- **SHOFI001 · Sejarah (ganjil) · w4**
  - sesi: Pemahaman Konsep / 1. Kebangkitan bangsa-bangsa Asia  (India, Cina, dan Filipina) dan awal   munculnya embrio kebangkitan nasional
  - bab: `Kebangkitan bangsa-bangsa Asia  (India, Cina, dan Filipina) dan awal   munculnya`
  - isi bab: faktor-faktor munculnya pergerakan nasional, menganalisis munculnya Organisasi Modern Pergerakan Nas | masa akhir pemerintah Belanda di Indonesia
(terjadi PD II, detik-detik Belanda menyerah kepada Jepan

## Ter-cover lewat pencocokan kata: 28 sesi

Verdict `CONTAINED` diambil mesin, bukan skor fuzzy. Semua kata bermakna dari label pelajaran muncul di teks sesi. Daftar ini ada supaya bisa diperiksa mata — satu verdict yang salah di sini akan menyembunyikan celah nyata.

- **RAIHAN001 · Bahasa Indonesia (ganjil) · w2** — Membaca dan Memirsa / Memahami kata yang jarang muncul dengan menemukan arti, kalimat perincian, dan majas personifikasi.
  - cocok: Teks Deskripsi / Kata Jarang Muncul (contain=1, fuzzy=0.19)
- **RAIHAN001 · Bahasa Indonesia (ganjil) · w3** — Berbicara dan Mempresentasikan / Memaparkan gagasan dengan menyajikan deskripsi terhadap gambar secara lisan dengan menggunakan kalimat perincian yang memikat.
  - cocok: Menyajikan Teks Deskripsi / Deskripsi Lisan (contain=1, fuzzy=0.154)
- **RAIHAN001 · Bahasa Indonesia (ganjil) · w4** — Menulis / Menyajikan teks deskripsi dengan baik melalui latihan menyunting penggunaan huruf kapital, tanda titik, tanda koma, serta kata depan dalam kalimat dengan tepat.
  - cocok: Menyajikan Teks Deskripsi / Menyunting Teks (contain=1, fuzzy=0.765)
- **RAIHAN001 · Bahasa Indonesia (ganjil) · w7** — Membaca dan Memirsa / Mengidentifikasi elemen dalam teks naratif berupa alur, penokohan, dan kaidah kebahasaan.
  - cocok: Teks Naratif / Alur dan Penokohan (contain=1, fuzzy=0.765)
- **RAIHAN001 · Bahasa Indonesia (ganjil) · w13** — Membaca dan Memirsa / Memahami ciri teks prosedur dengan menemukenali strukturnya agar dapat menyajikannya dengan baik.
  - cocok: Teks Prosedur / Struktur Prosedur (contain=1, fuzzy=0.765)
- **RAIHAN001 · Bahasa Indonesia (ganjil) · w16** — Berbicara dan Mempresentasikan / Menyajikan teks prosedur secara lisan, visual, atau audiovisual dengan menarik dan efektif
  - cocok: Teks Prosedur / Menyajikan Prosedur (contain=1, fuzzy=0.765)
- **RAIHAN001 · Biologi (genap) · w8** — Pemahaman IPA dan Ketrampilan Proses / Komponen Penyusun Ekosistem
  - cocok: IPA / Ekologi / Komponen Ekosistem (contain=1, fuzzy=0.765)
- **RAIHAN001 · Fisika (ganjil) · w10** — Pemahaman IPA dan Keterampilan Proses / . Konversi skala suhu termometer
  - cocok: IPA / Suhu dan Kalor / Suhu dan Termometer (contain=1, fuzzy=0.267)
- **RAIHAN001 · Fisika (ganjil) · w11** — Pemahaman IPA dan Keterampilan Proses / . Praktikum (Mengukur Suhu Air Menggunakan Termometer)
  - cocok: IPA / Suhu dan Kalor / Suhu dan Termometer (contain=1, fuzzy=0.299)
- **RAIHAN001 · Fisika (ganjil) · w16** — Pemahaman IPA dan Keterampilan Proses / . Perpindahan kalor
  - cocok: IPA / Suhu dan Kalor / Kalor dan Perpindahannya (contain=1, fuzzy=0.345)
- **SHOFI001 · Bahasa Indonesia (ganjil) · w1** — Membaca dan memirsa / Menemukan perbedaan antara karya puisi, prosa, dan drama
  - cocok: Drama / Perbedaan Puisi, Prosa, dan Drama (contain=1, fuzzy=0.765)
- **SHOFI001 · Biologi (ganjil) · w2** — Pemahaman biologi mengamati, menyelidiki dan menjelaskan fenomena sesuai kaidah kerja ilmiah dalam materi sistem digesti / Praktikum uji kandungan zat makanan
  - cocok: Sistem Pencernaan / Praktikum Uji Zat Makanan (contain=1, fuzzy=0.535)
- **SHOFI001 · Biologi (ganjil) · w2** — Pemahaman biologi mengamati, menyelidiki dan menjelaskan fenomena sesuai kaidah kerja ilmiah dalam materi sistem digesti / Struktur dan fungsi organ pembentuk sistem pencernaan
  - cocok: Sistem Pencernaan / Struktur Organ Pencernaan (contain=1, fuzzy=0.765)
- **SHOFI001 · Biologi (ganjil) · w5** — Pemahaman biologi mengamati, menyelidiki dan menjelaskan fenomena sesuai kaidah kerja ilmiah dalam materi sistem sikurlasi murid dapat menganalisis struktur dan fungsi organ pembentuk sistem sirkulasi / Struktur dan fungsi organ pembentuk sistem sirkulasi
  - cocok: Sistem Sirkulasi / Fungsi Sistem Sirkulasi (contain=1, fuzzy=0.765)
- **SHOFI001 · Biologi (ganjil) · w6** — Pemahaman biologi mengamati, menyelidiki dan menjelaskan fenomena sesuai kaidah kerja ilmiah dalam materi sistem sikurlasi murid dapat menganalisis struktur dan fungsi organ pembentuk sistem sirkulasi / Peredaran darah pulmonalis dan peredaran darah sistemik
  - cocok: Sistem Sirkulasi / Peredaran Darah Pulmonalis dan Sistemik (contain=1, fuzzy=0.68)
- **SHOFI001 · Biologi (ganjil) · w7** — Pemahaman biologi mengamati, menyelidiki dan menjelaskan fenomena sesuai kaidah kerja ilmiah dalam materi sistem sikurlasi murid dapat menganalisis struktur dan fungsi organ pembentuk sistem sirkulasi / Struktur dan fungsi berbagai macam sel darah
  - cocok: Sel / Struktur dan Fungsi Sel (contain=1, fuzzy=0.765)
- **SHOFI001 · Biologi (ganjil) · w8** — Pemahaman biologi mengamati, menyelidiki dan menjelaskan fenomena sesuai kaidah kerja ilmiah dalam materi sistem sikurlasi murid dapat menganalisis struktur dan fungsi organ pembentuk sistem sirkulasi / Penyakit-penyakit terkait dengan sistem sirkulasi
  - cocok: Sistem Sirkulasi / Penyakit Sistem Sirkulasi (contain=1, fuzzy=0.765)
- **SHOFI001 · Biologi (ganjil) · w9** — Pemahaman biologi mengamati, menyelidiki dan menjelaskan fenomena sesuai kaidah kerja ilmiah dalam materi sistem respirasi / Struktur dan fungsi organ pembentuk sistem respirasi
  - cocok: Sistem Respirasi / Fungsi Sistem Respirasi (contain=1, fuzzy=0.765)
- **SHOFI001 · Biologi (ganjil) · w10** — Pemahaman biologi mengamati, menyelidiki dan menjelaskan fenomena sesuai kaidah kerja ilmiah dalam materi sistem respirasi / Penyakit-penyakit terkait dengan sistem respirasi
  - cocok: Sistem Respirasi / Penyakit Sistem Respirasi (contain=1, fuzzy=0.765)
- **SHOFI001 · Biologi (ganjil) · w15** — Murid memahami keterkaitan struktur organ pada sistem eksresi dan fungsinya dalam merespons stimulus internal dan eksternal / Struktur dan Fungsi organ penyusun sistem eksresi
  - cocok: Sistem Eksresi / Organ Eksresi (contain=1, fuzzy=0.765)
- **SHOFI001 · Biologi (ganjil) · w16** — Murid memahami keterkaitan struktur organ pada sistem eksresi dan fungsinya dalam merespons stimulus internal dan eksternal / Faktor yang memengaruhi jumlah urine
  - cocok: Sistem Eksresi / Faktor yang Memengaruhi Urine (contain=1, fuzzy=0.688)
- **SHOFI001 · Fisika (ganjil) · w10** — Pemahaman Konsep / 2. Gaya Ke atas
  - cocok: Fluida / Gaya ke Atas (Archimedes) (contain=1, fuzzy=0.27)
- **SHOFI001 · Fisika (ganjil) · w11** — Pemahaman Konsep / 3. Tegangan Permukaan
  - cocok: Fluida / Tegangan Permukaan dan Kapilaritas (contain=1, fuzzy=0.31)
- **SHOFI001 · Fisika (ganjil) · w15,16** — Pemahaman Konsep / 1. Kalor
  - cocok: Kalor / Perpindahan Kalor (contain=1, fuzzy=0.765)
- **SHOFI001 · Matematika (ganjil) · w1,2** — Aljabar / Kesamaan Dua Matriks
  - cocok: Matriks / Kesamaan Matriks (contain=1, fuzzy=0.765)
- **SHOFI001 · Matematika (ganjil) · w2,3** — Aljabar / Operasi pada Matriks
  - cocok: Matriks / Operasi Matriks (contain=1, fuzzy=0.765)
- **SHOFI001 · Matematika Penalaran (ganjil) · w5** — Geometri / Pengertian garis dan Jenis-jenisnya
  - cocok: Hubungan Garis dan Sudut / Garis dan Jenisnya (contain=1, fuzzy=0.31)
- **SHOFI001 · Matematika Penalaran (ganjil) · w5** — Geometri / Pengertian sudut dan Jenis-jenisnya
  - cocok: Hubungan Garis dan Sudut / Sudut dan Jenisnya (contain=1, fuzzy=0.31)

## Batasan yang diketahui

- **Bukti bisa salah tunjuk.** Kalau beberapa material sama-sama memenuhi syarat "semua kata ada", yang dipilih adalah skor fuzzy tertinggi — dan skor rasio kadang memenangkan label generik. Contoh: sesi *"Struktur dan fungsi berbagai macam sel darah"* dibuktikan dengan `Sel / Struktur dan Fungsi Sel`, padahal material `Sel Darah dan Golongan Darah` juga ada. Verdict-nya tetap benar (materinya ada), tapi jangan pakai kolom bukti sebagai rujukan pasti.
- **Mapel terpisah vs terintegrasi.** Prosem VII menulis "Biologi"/"Fisika"/"Sejarah"; kurikulum menyimpannya sebagai `IPA`/`IPS`. Script menggabungkan keduanya (`Fisika + IPA`), jadi satu material IPA bisa terhitung di beberapa mapel prosem.
- **Bentuk kolom prosem berbeda antar angkatan.** XI: `topic` = bab, `subtopic` = pelajaran. VII: `topic` = strand kompetensi, `subtopic` = bab.
- **Siswa tanpa prosem dilewati.** Syifa (SD_5) tidak punya berkas prosem, jadi tidak muncul di laporan ini — bukan berarti cakupannya lengkap.
- **Verdict menilai kecocokan nama, bukan kualitas isi.** Materi yang ada tapi isinya stub/rusak tetap terhitung `COVERED`. Untuk itu pakai audit konten terpisah.
