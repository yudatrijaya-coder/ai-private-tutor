# SMP_1: mapel terpisah, buku SIBI, dan asal materi Geografi

Tanggal: 2026-09-17
Siswa acuan: `RAIHAN001` (Raihan, SMP_1)
Sumber: Moodle Kumbang (`moodle.kumbang.sch.id`) + SIBI (`buku.kemendikdasmen.go.id`)

## 1. Moodle memisahkan mapel — IPA/IPS tidak ada

`core_enrol_get_users_courses` untuk Raihan (userid 3020) mengembalikan **23 kursus**.
Untuk rumpun sains/sosial, kursusnya berdiri sendiri:

| Kursus | ID | Prosem | Modul |
|:-------|:---|:-------|:------|
| Biologi VII A | 4169 | ✅ Ganjil + Genap | 4 |
| Fisika VII A | 4171 | ✅ Formulir | ✅ Modul + PPT |
| **Geografi VII A** | 4172 | ❌ **kosong** | ❌ **kosong** |
| Sejarah VII A | 4179 | ✅ | ✅ 6 berkas |
| Kimia VII A | 4174 | ✅ XLSX | ✅ 4 berkas |
| Ekonomi VII A | 4170 | ❌ | ✅ 1 buku (IPS) |

**Tidak ada kursus "IPA" maupun "IPS"** di Moodle Raihan. Guru mengajar
Biologi/Fisika/Kimia/Geografi/Sejarah sebagai mapel terpisah.

Konsekuensi: palet app yang benar adalah yang terpisah. Baris `IPA` dan `IPS`
di kurikulum Raihan adalah sisa pendekatan Kurikulum Merdeka terpadu dan
**tidak punya backing Moodle sama sekali**.

## 2. Geografi: diambil dari buku IPS

Kursus `4172 Geografi VII A` ada tapi **isinya nol** — tidak ada prosem,
tidak ada modul. Satu-satunya jejak adalah link eksternal "Asesmen Diagnostik".

Sumber yang dipakai guru: kursus **Sejarah (4179)** memasang link SIBI

```
https://buku.kemendikdasmen.go.id/katalog/ilmu-pengetahuan-sosial-untuk-smp-mts-kelas-vii-edisi-revisi
```

dengan label **"Buku IPS Kelas VII"**. Kursus Ekonomi (4170) menyimpan PDF
bukunya langsung (`Buku Siswa Kurikulum Merdeka Kelas 7.pdf`, 11.7MB).

Buku IPS SMP/MTs kelas VII (Edisi Revisi), penulis Muhammad Nursa'ban & Supardi,
ISBN 978-623-118-437-5, kurikulum 2023, 280 halaman. Empat tema:

| Tema | Judul | Halaman | Isi Geografi |
|:-----|:------|:--------|:-------------|
| I | Kehidupan Sosial dan Kondisi Lingkungan Sekitar | 1 | |
| I-A | Mengenal Lokasi Tempat Tinggal | 4 | letak astronomis, garis lintang/bujur, peta |
| I-B | Konektivitas Antarruang | 11 | pergerakan barang/jasa, penduduk |
| I-C | Perubahan Iklim | 19 | cuaca vs iklim, musim, curah hujan, vegetasi |
| I-D | Potensi Bencana Alam di Indonesia | 24 | letak geologis, gempa, tsunami, gunung meletus, mitigasi |
| II | Keberagaman Lingkungan Sekitar | 61 | pelestarian lingkungan |
| II-A | Berkenalan dengan Lingkungan Sekitar | 65 | pemanfaatan ruang |
| III | Potensi Ekonomi Lingkungan | 103 | |
| III-A | Pemanfaatan dan Pelestarian Potensi SDA | 108 | sumber daya alam |

Pemetaan ke 10 materi Geografi Raihan:

| Materi | Bagian |
|:-------|:-------|
| Letak Geografis dan Astronomis Indonesia | I-A, hlm. 4 |
| Membaca Peta, Atlas, dan Globe | I-A, hlm. 4 |
| Wilayah Kepulauan dan Laut Indonesia | I-A, hlm. 4 |
| Dataran Tinggi, Rendah, dan Perairan | I-A, hlm. 4 |
| Jenis Iklim dan Persebaran Vegetasi | I-C, hlm. 19 |
| Jenis Bencana Alam dan Upaya Mitigasi | I-D, hlm. 24 |
| Pemanfaatan Ruang dan Lingkungan | II-A, hlm. 65 |
| Potensi dan Persebaran Sumber Daya Alam | III-A, hlm. 108 |
| Perpindahan Penduduk dan Dampaknya | I-B, hlm. 11 |
| Pergerakan Barang dan Jasa Antar Wilayah | I-B, hlm. 11 |

Diterapkan oleh `scripts/attach-geografi-sibi.ts` — hanya menulis `sourceUrls`,
kolom konten tidak disentuh. Idempoten (jalan kedua: `would tag: 0/10`).

## 3. Buku SIBI SMP_1: delapan rujukan menunjuk berkas yang tidak ada

`PDF_MAP.SMP_1` sudah lama memuat 8 nama berkas, tetapi `public/pdf-smp7/`
**tidak pernah ada**. Semua ikon "Buku SIBI" Raihan mengembalikan **404**:

```
pdf-smp7/IPS_SMP7_BS.pdf  -> 404
pdf-smp7/IPA_SMP7_BS.pdf  -> 404
```

Slug SIBI diresolusi lewat `getDetails`, bukan tebak-tebakan CDN. Tiga dari
sembilan tebakan CDN gagal meski bukunya ada (`IPA-BS-KLS-VII.pdf` 404,
`Ilmu-Pengetahuan-Alam-BS-KLS-VII.pdf` 404) — pola nama tidak seragam.

| Mapel | Slug SIBI | Berkas CDN |
|:------|:----------|:-----------|
| IPA | `ilmu-pengetahuan-alam-untuk-smp-mts-kelas-vii-edisi-revisi` | `IPA_BS_KLS_VII_Rev.pdf` |
| IPS | `ilmu-pengetahuan-sosial-untuk-smp-mts-kelas-vii-edisi-revisi` | `IPS_BS_KLS_VII_Rev.pdf` |
| PJOK | `pendidikan-jasmani-olahraga-dan-kesehatan-untuk-smp-mts-kelas-vii` | `PJOK_BS_KLS_VII.pdf` |
| Informatika | `informatika-untuk-smpmts-kelas-vii-edisi-revisi` | `BS_INFORMATIKA_VII.pdf` |
| Bahasa Indonesia | `bahasa-indonesia-untuk-smp-mts-kelas-vii-edisi-revisi` | `Bahasa_Indonesia_BS_KLS_VII_Rev.pdf` |
| Matematika | `matematika-untuk-smpmts-kelas-vii` | `Matematika-BS-KLS-VII.pdf` |
| Pendidikan Pancasila | `pendidikan-pancasila-untuk-smpmts-kelas-vii` | `Pendidikan-Pancasila-BS-KLS-VII.pdf` |
| Bahasa Inggris | — | `Bahasa-Inggris-BS-KLS-VII.pdf` |

Delapan berkas diunduh ke `public/pdf-smp7/` (168MB). Verifikasi: 26 rujukan
PDF_MAP di 3 berkas, **0 rusak**; 8 URL live balas **206**.

`Geografi` dipetakan ke berkas IPS yang sama — SMP tidak punya buku Geografi
sendiri.

## 4. Endpoint pencarian SIBI rusak

```
/api/catalogue/search?level=SMP/MTs&class=7&limit=200
/api/catalogue/search?search=ilmu+pengetahuan+alam&limit=50
/api/catalogue/search?q=IPA&limit=50
```

Ketiganya mengembalikan **daftar yang sama** — parameter diabaikan. Jangan
pakai untuk penemuan. Jalur yang bekerja: `getDetails?slug=` (presisi), atau
link SIBI yang dipasang guru di Moodle.

## 5. Yang belum tuntas

- `regenerate/route.ts:36` masih `curriculum.deleteMany({ studentId })` —
  menghapus **semua** baris kurikulum lalu generate dari sumber yang tidak
  memuat Biologi/Fisika/Geografi/Sejarah. Salinan 30 material bisa hilang lagi.
- Keputusan `IPA`/`IPS` belum diambil (Moodle tidak punya keduanya).
- Prosem Geografi tidak ada di Moodle — perlu sumber lain.
