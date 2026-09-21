#!/usr/bin/env node
/**
 * ADDITIVE insert of genuinely-new materials discovered on Moodle 2026-09-21.
 *
 * SAFETY: this script NEVER deletes or overwrites. It only inserts Material
 * rows whose (subject, topic, subTopic) does not already exist for the target
 * curriculum. Re-running is therefore idempotent.
 *
 * Source files live in public/moodle-files/ (downloaded 2026-09-21, 25 files).
 * Slide text is derived from the actual PDF/PPTX content, not invented.
 *
 * Target curricula:
 *   Raihan (SMP_1) -> e94cf3dd-3fae-4fae-b28f-e7aa899d11e7  (v3, active)
 *   SHOFI  (SMA_2) -> 98f0274e-4e39-45f5-9c79-3632c5717b27
 */
const { Pool } = require("pg");
const crypto = require("crypto");

const pool = new Pool({
  host: "localhost", port: 5432, database: "ai_private_tutor",
  user: "tutor", password: process.env.PGPASSWORD,
});

const uid = () => crypto.randomUUID();

const RAIHAN_ID = "e94cf3dd-3fae-4fae-b28f-e7aa899d11e7";
const SHOFI_ID  = "98f0274e-4e39-45f5-9c79-3632c5717b27";

// ── NEW materials: [subject, topic, subTopic, slideText, sourceFile] ──
const RAIHAN_NEW = [
  ["Biologi", "Klasifikasi Makhluk Hidup", "Sistem Tata Nama Ganda (Binomial Nomenklatur)",
   "Sistem tata nama ganda (binomial nomenklatur) diperkenalkan Carolus Linnaeus. Setiap organisme diberi nama ilmiah dua kata: genus (huruf depan kapital) + penunjuk spesies (huruf kecil), ditulis miring atau digarisbawahi. Contoh: Oryza sativa (padi), Homo sapiens (manusia). Bahasa Latin dipakai agar berlaku universal. Tujuan: menghindari kesamaan nama daerah, mempermudah komunikasi ilmiah global.",
   "4169_BAB_2_KLASIFIKASI_MAKHLUK_HIDUP_KELAS_7_INDO.pdf"],

  ["Biologi", "Klasifikasi Makhluk Hidup", "Takson Hewan dan Tumbuhan",
   "Taksonomi adalah ilmu pengelompokan makhluk hidup. Urutan takson dari umum ke khusus: Kingdom (Kerajaan) → Filum (hewan)/Divisi (tumbuhan) → Kelas → Ordo → Famili → Genus → Spesies. Semakin ke bawah, jumlah anggota makin sedikit tetapi persamaan ciri makin banyak. Contoh: manusia = Animalia, Chordata, Mammalia, Primata, Hominidae, Homo, Homo sapiens. Tumbuhan padi = Plantae, Angiospermae, Monokotil, Poales, Poaceae, Oryza, Oryza sativa.",
   "4169_BAB_2_KLASIFIKASI_MAKHLUK_HIDUP_KELAS_7_INDO.pdf"],

  ["Biologi", "Klasifikasi Makhluk Hidup", "Kunci Determinasi",
   "Kunci determinasi (kunci dikotom) adalah cara mengidentifikasi makhluk hidup berdasarkan ciri-ciri berpasangan (dikotomis): setiap langkah menyediakan dua pilihan ciri yang saling bertentangan (misal: 'berkaki dua' vs 'berkaki empat'). Dengan mengikuti pilihan yang sesuai ciri objek, kita sampai pada nama kelompok/spesiesnya. Berguna untuk mengidentifikasi tumbuhan/hewan yang belum dikenal. Dasar penyusunannya: ciri morfologi (bentuk daun, jumlah kaki, jenis sayap, ada tidaknya tulang belakang).",
   "4169_BAB_2_KLASIFIKASI_MAKHLUK_HIDUP_KELAS_7_INDO.pdf"],

  ["Kimia", "Hakikat Kimia", "Ilmu Kimia dan Peranannya",
   "Ilmu kimia adalah ilmu yang mempelajari komposisi, struktur, sifat, dan perubahan materi serta energi yang menyertainya. Ruang lingkupnya meliputi susunan zat, reaksi, dan penerapannya. Kimia berperan besar di kehidupan: obat-obatan (farmasi), pupuk dan pestisida (pertanian), bahan bakar, kosmetik, dan bahan bangunan. Peran negatif bila disalahgunakan: limbah pabrik mencemari air dan tanah, narkoba, racun.",
   "4174_1._Hakikat_Ilmu_Kimia.pdf"],

  ["Kimia", "Hakikat Kimia", "Tata Tertib dan Keselamatan Kerja di Laboratorium",
   "Bekerja di laboratorium memerlukan tata tertib demi keselamatan. Aturan utama: jangan makan/minum di lab, gunakan jas lab dan sarung tangan, ketahui letak alat pemadam api, jangan menganggap wadah itu bersih tanpa dipastikan, jangan mencampur bahan sembarangan. Simbol bahaya: mudah terbakar (flammable), korosif, beracun (toxic), oksidator, dan iritan. Pertolongan pertama: luka bakar (alirkan air), terkena bahan kimia (cuci air mengalir 15 menit), menghirup gas (bawa ke udara terbuka).",
   "4174_2._Keselamatan_Kerja_di_Laboratorium.pdf"],

  ["Kimia", "Unsur, Senyawa, dan Campuran", "Perbedaan Unsur, Senyawa, dan Campuran",
   "Unsur adalah zat tunggal yang tidak dapat diuraikan lagi secara kimia (contoh: H, O, Fe, Au). Senyawa adalah gabungan dua atau lebih unsur secara kimia dengan perbandingan tetap (contoh: H2O air, CO2 karbon dioksida, NaCl garam). Campuran adalah gabungan dua atau lebih zat tanpa reaksi kimia, perbandingannya sembarang: homogen (larutan — gula dalam air) dan heterogen (air + pasir). Perbedaan kunci: senyawa hasil reaksi kimia (sifat berbeda dari unsur penyusun), campuran hasil reaksi fisika (sifat asli masih tampak) dan dapat dipisahkan secara fisika.",
   "4174_3._Unsur__Senyawa_dan_Campuran.pdf"],

  ["Sejarah", "Zaman Praaksara", "Teori Asal-Usul Nenek Moyang Indonesia",
   "Ada beberapa teori tentang asal-usul nenek moyang bangsa Indonesia. Teori Yunnan menyatakan nenek moyang berasal dari Yunnan (China selatan), dibuktikan kemiripan kapak tua Nusantara dengan kapak tua Asia Tengah; didukung Mohammad Ali, R.H. Geldern, dan J.H.C. Kern. Teori Nusantara menyatakan bangsa Indonesia berasal dari Nusantara sendiri (tidak bermigrasi). Teori Out of Taiwan dan Teori Out of Africa adalah pandangan alternatif yang lebih baru. Bukti pendukung: persebaran bahasa Austronesia, artefak kapak, dan kesamaan budaya.",
   "4179_Teori_asal-usul_nenek_moyang_indonesia.pdf"],

  ["Sejarah", "Kerajaan Hindu-Buddha", "Proses Masuknya Hindu-Buddha ke Indonesia",
   "Agama dan kebudayaan Hindu-Buddha masuk ke Indonesia melalui jalur perdagangan laut antara India dan Nusantara. Ada beberapa teori: Teori Waisya (dibawa pedagang India), Teori Ksatria (dibawa prajurit/perluasan wilayah), Teori Brahmana (dibawa pendeta/kaum terpelajar), dan Teori Sudra (dibawa orang buangan). Bukti: prasasti berbahasa Sanskerta, arca, candi, serta sistem kerajaan. Prosesnya berjalan damai melalui akulturasi budaya, bukan penaklukan.",
   "4179_Kerajaan_-_kerajaan_Hindu_Buddha_di_Indonesia_7.pdf"],

  ["Bahasa Indonesia", "Teks Deskripsi", "Pengertian dan Struktur Teks Deskripsi",
   "Teks deskripsi adalah teks yang menggambarkan suatu objek (orang, tempat, benda, atau suasana) dengan kata-kata secara rinci sehingga pembaca seolah melihat, mendengar, mencium, atau merasakannya. Struktur: (1) Identifikasi — pengenalan objek; (2) Deskripsi bagian — perincian objek; (3) Simpulan/kesan — pendapat penulis. Ciri kebahasaan: kata sifat (cantik, besar, hangat), kata konkret, kalimat perincian, dan penggunaan pancaindra dalam penggambaran.",
   "4164_TEKS_DESKRIPSI__1_.pdf"],

  ["Bahasa Mandarin", "Angka dan Bilangan (数字 Shùzì)", "Membaca dan Menulis Angka dalam Hanzi",
   "Angka dasar Mandarin: 一 yī (1), 二 èr (2), 三 sān (3), 四 sì (4), 五 wǔ (5), 六 liù (6), 七 qī (7), 八 bā (8), 九 jiǔ (9), 十 shí (10). Belasan: 十一 shí yī (11), 十二 (12) ... 十九 (19). Puluhan: 二十 èr shí (20), 三十 (30), dst. Seratus 一百 yī bǎi. Pola: [kata puluhan] + 十 + [satuan]. Contoh umur: 我十一岁 wǒ shí yī suì (saya 11 tahun). Latihan: tulis 25 = 二十五 èr shí wǔ.",
   "4166_Angka_Kelas_7.pptx"],
];

const SHOFI_NEW = [
  ["Matematika Tingkat Lanjut", "Polinomial", "Suku Banyak: Pengertian dan Bentuk Umum",
   "Suku banyak (polinomial) dalam x berderajat n berbentuk: aₙxⁿ + aₙ₋₁xⁿ⁻¹ + ... + a₂x² + a₁x + a₀, dengan n bilangan cacah (pangkat tertinggi) dan aₙ ≠ 0. aₙ, aₙ₋₁, ..., a₀ disebut koefisien, dan a₀ adalah suku tetap (konstanta). Derajat polinomial = pangkat tertinggi variabelnya. Contoh: 3x⁴ − 2x² + 5x − 7 adalah polinomial berderajat 4 dengan koefisien 3, −2, 5 dan konstanta −7.",
   "3674_01_sukubanyak_unlocked.pdf"],

  ["Matematika Tingkat Lanjut", "Polinomial", "Hasil Bagi dan Sisa: Metode Horner-Kino",
   "Untuk membagi suku banyak oleh (x − k) atau (ax + b), digunakan metode Horner (skema sintetik) — versi lanjutannya disebut Horner-Kino. Jika P(x) dibagi (x − k), maka P(x) = (x − k)·H(x) + S, dengan S = P(k) (Teorema Sisa). Langkah Horner: susun koefisien, kalikan dan jumlahkan bertahap; baris terakhir menghasilkan hasil bagi dan sisa. Contoh: x³ − 4x² + 5x − 2 dibagi (x − 2) memberi sisa P(2) = 0, artinya (x − 2) adalah faktor.",
   "3674_Hasil_bagi_dan_sisa_metode_horner_kino.pdf"],

  ["Matematika Tingkat Lanjut", "Trigonometri", "Aturan Sinus",
   "Aturan Sinus berlaku pada segitiga sembarang: a/sin A = b/sin B = c/sin C, dengan a, b, c adalah panjang sisi di hadapan sudut A, B, C. Berguna bila diketahui dua sudut dan satu sisi (ss-sd-sd) atau dua sisi dan satu sudut di hadapan salah satunya. Contoh: segitiga ABC dengan AB = 12 cm, ∠A = 60°, ∠B = 75°, maka sudut C = 45°, dan BC = AB·sin A / sin C = 12·sin 60°/sin 45° = 6√6 cm.",
   "3674_aturan_sinus_kosinus__1_.pdf"],

  ["Matematika Tingkat Lanjut", "Trigonometri", "Aturan Cosinus",
   "Aturan Cosinus menghubungkan ketiga sisi segitiga dengan salah satu sudutnya: a² = b² + c² − 2bc·cos A (dan rumus serupa untuk B dan C). Dipakai bila diketahui tiga sisi (ss-ss-ss) atau dua sisi dan sudut apitnya (ss-sd-ss). Contoh: b = 5, c = 8, ∠A = 60° → a² = 25 + 64 − 2·5·8·cos60° = 89 − 40 = 49, jadi a = 7. Aturan Cosinus juga berguna menentukan besar sudut bila ketiga sisi diketahui: cos A = (b² + c² − a²)/(2bc).",
   "3674_latihan-aturan-sinus-dan-aturan-cosinus.pdf"],

  ["Matematika Tingkat Lanjut", "Trigonometri", "Identitas Trigonometri",
   "Identitas trigonometri adalah persamaan yang selalu benar untuk semua nilai sudut yang terdefinisi. Identitas dasar: sin²θ + cos²θ = 1, tan θ = sin θ/cos θ, 1 + tan²θ = sec²θ, 1 + cot²θ = cosec²θ. Untuk membuktikan identitas, ubah satu ruas menjadi bentuk ruas lain dengan substitusi identitas dasar (biasanya mulai dari ruas yang lebih kompleks). Contoh: buktikan (1 − cos²θ)/sin θ = sin θ → 1 − cos²θ = sin²θ, maka sin²θ/sin θ = sin θ ✓.",
   "3674_latihan_Buktikan_identitas_Trigonometri.docx.pdf"],

  ["Matematika Tingkat Lanjut", "Matriks", "Menyelesaikan SPLDV/SPLTV dengan Matriks",
   "Sistem persamaan linear dua/tiga variabel dapat diselesaikan dengan matriks, khususnya metode invers: AX = B → X = A⁻¹B, dengan A = matriks koefisien, X = vektor variabel, B = vektor konstanta. Syarat: det(A) ≠ 0. Contoh SPLDV: 2x + y = 7 dan x − y = 2 → A = [[2,1],[1,−1]], det = −3, A⁻¹ = (1/−3)[[−1,−1],[−1,2]], sehingga X = A⁻¹B = (2, 3). Metode ini juga bisa diselesaikan dengan determinan (aturan Cramer).",
   "3675__latihan_soal__menyelesaikan_SPLDV_menggunakan_matriks.pdf"],

  ["Informatika", "Pemrograman", "Struktur Kontrol: Percabangan (Kondisi If)",
   "Percabangan (kondisi if) membuat program memilih jalur berbeda berdasarkan syarat. Bentuk: if (kondisi) { aksi } else { aksi lain }. Jika kondisi bernilai benar (true), blok if dijalankan; jika salah (false), blok else dijalankan. Contoh: menerima bilangan bulat, jika habis dibagi 2 tampilkan \"Bilangan Genap\", jika tidak tampilkan \"Bilangan Ganjil\": if (n % 2 == 0) { print(\"Genap\") } else { print(\"Ganjil\") }. Operator pembanding: ==, !=, <, >, <=, >=. Bisa dirantai dengan else if untuk banyak kondisi.",
   "3667_Kelas_XI__3_.pdf"],

  ["Matematika Penalaran", "Geometri: Garis dan Sudut", "Hubungan Antarsudut",
   "Dua garis sejajar yang dipotong garis transversal membentuk sudut-sudut dengan hubungan khusus: (1) sudut sehadap — sama besar; (2) sudut dalam berseberangan — sama besar; (3) sudut luar berseberangan — sama besar; (4) sudut dalam sepihak — berjumlah 180°; (5) sudut luar sepihak — berjumlah 180°; (6) sudut bertolak belakang — sama besar. Jenis sudut menurut besar: lancip (<90°), siku-siku (=90°), tumpul (>90° tetapi <180°), lurus (=180°).",
   "3673_Bahasa_Indonesia_Garis_dan_Sudut.pdf"],

  ["Matematika Penalaran", "Geometri: Kekongruenan Segitiga", "Syarat Dua Segitiga Kongruen",
   "Dua segitiga dikatakan kongruen (sama bentuk dan ukuran) jika memenuhi salah satu: (1) SSS — ketiga pasang sisi bersesuaian sama panjang; (2) SAS — dua pasang sisi bersesuaian sama panjang dan sudut apitnya sama besar; (3) ASA — dua pasang sudut bersesuaian sama besar dan satu sisi bersesuaian sama panjang; (4) AAS — dua sudut dan satu sisi di hadapan salah satu sudut sama. Kongruen disimbolkan ≅. Sudut-sudut dan sisi yang bersesuaian pada segitiga kongruen memiliki besar/panjang yang sama.",
   "3673_Kekongruenan_Segitiga.pdf"],

  ["Bahasa Inggris", "Tenses", "Simple Past Tense",
   "Simple Past Tense menyatakan tindakan yang sudah selesai di masa lampau. Rumus: (+) Subject + V2 + object; (−) Subject + did not + V1 + object; (?) Did + subject + V1 + object? Contoh: (+) I watched a movie last night. (−) She did not come to school. (?) Did you finish your homework? Kata kerja beraturan (regular) dibentuk dengan -ed (play → played); kata kerja tak beraturan (irregular) berubah bentuk (go → went, eat → ate). Penanda waktu: yesterday, last week, ago, in 2020. Digunakan dalam recount dan narrative text.",
   "4506_past_tenses.pptx"],

  ["Bahasa Inggris", "Narrative Text", "Struktur dan Ciri Narrative Text",
   "Narrative text adalah teks yang menceritakan rangkaian peristiwa secara kronologis dengan tujuan menghibur (to entertain) pembaca. Struktur: (1) Orientation — pengenalan tokoh, waktu, tempat; (2) Complication — munculnya konflik/masalah; (3) Resolution — penyelesaian konflik; (opsional Coda/Re-orientation — pesan moral). Ciri kebahasaan: past tense, kata sambung waktu (then, after that, finally), action verbs, dan sering memakai kata keterangan waktu. Contoh: fables, fairy tales, legends, dan cerita rakyat.",
   "4506_narrative_text_ppt.pptx"],
];

async function insertNew(curriculumId, gradeLevel, rows, label) {
  console.log(`\n=== ${label} (${curriculumId}) ===`);
  let inserted = 0, skipped = 0;
  for (const [subject, topic, subTopic, slide, src] of rows) {
    const dup = await pool.query(
      `SELECT id FROM "Material" WHERE "curriculumId"=$1 AND subject=$2 AND topic=$3 AND "subTopic"=$4 LIMIT 1`,
      [curriculumId, subject, topic, subTopic]);
    if (dup.rows.length) {
      console.log(`  ⏭️  sudah ada: ${subject} / ${topic} / ${subTopic}`);
      skipped++;
      continue;
    }
    await pool.query(
      `INSERT INTO "Material"
         (id, "curriculumId", subject, topic, "subTopic", "rawContent", "processedContent",
          "gradeLevel", "weekOrder", priority, delivery, status, metadata, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'TEXT','READY',$11,NOW(),NOW())`,
      [uid(), curriculumId, subject, topic, subTopic, slide, slide,
       gradeLevel, 12, 5, JSON.stringify({ sourceFile: src, addedBy: "moodle-2026-09-21" })]);
    console.log(`  ✅ + ${subject} / ${topic} / ${subTopic}`);
    inserted++;
  }
  console.log(`  → ${inserted} ditambahkan, ${skipped} dilewati (sudah ada)`);
  return inserted;
}

async function main() {
  const a = await insertNew(RAIHAN_ID, "SMP_1", RAIHAN_NEW, "RAIHAN");
  const b = await insertNew(SHOFI_ID, "SMA_2", SHOFI_NEW, "SHOFI");
  console.log(`\n✅ TOTAL materi baru: ${a + b} (Raihan ${a}, Shofi ${b})`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
