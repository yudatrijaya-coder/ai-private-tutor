const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost", port: 5432, database: "ai_private_tutor",
  user: "tutor", password: "tutor123",
});

const SLIDES_MD = {
  "Teks Deskripsi": [
    "## Pengertian Teks Deskripsi\n\nTeks deskripsi adalah teks yang menggambarkan suatu objek, tempat, atau peristiwa secara rinci sehingga pembaca seolah-olah melihat, mendengar, atau merasakannya.",
    "## Ciri-Ciri Teks Deskripsi\n\n- Menggambarkan sesuatu secara detail\n- Menggunakan kata sifat (besar, cantik, indah)\n- Kalimat terperinci dan jelas\n- Membaca seolah melihat/mendengar objeknya",
    "## Struktur Teks Deskripsi\n\n1. **Identifikasi** — pengenalan objek\n2. **Deskripsi Bagian** — rincian detail\n3. **Simpulan/Kesan** — penutup",
    "## Kaidah Kebahasaan\n\n- Kata sifat: besar, kecil, indah\n- Kata kerja: ada, tampak, terlihat\n- Kalimat rinci: menggunakan kata depan\n- Imbuhan me-, di-, ter-",
    "## Langkah Menulis\n\n1. Tentukan objek yang akan dideskripsikan\n2. Kumpulkan detail pengamatan\n3. Urutkan dari umum ke khusus\n4. Gunakan kata sifat yang tepat\n5. Beri kesan penutup",
  ],
  "Puisi Rakyat": [
    "## Pengertian Puisi Rakyat\n\nPuisi rakyat adalah kesusastraan lisan warisan leluhur yang diwariskan secara turun-temurun.",
    "## Jenis Puisi Rakyat\n\n- **Pantun**: 4 baris, sajak a-b-a-b\n- **Syair**: 4 baris, sajak a-a-a-a\n- **Gurindam**: 2 baris, berisi nasihat",
    "## Ciri Pantun\n\n1. 4 baris (2 sampiran + 2 isi)\n2. Bait 1-2 sampiran, 3-4 isi\n3. Sajak a-b-a-b\n4. Setiap baris 8-12 suku kata",
    "## Ciri Syair\n\n1. 4 baris semuanya isi\n2. Sajak a-a-a-a\n3. Berisi cerita atau nasihat\n4. Setiap baris 8-14 suku kata",
    "## Nilai dalam Puisi Rakyat\n\n- Nilai moral: ajaran baik/buruk\n- Nilai agama: petuah keagamaan\n- Nilai sosial: hubungan masyarakat\n- Nilai budaya: tradisi leluhur",
  ],
  "Bilangan Bulat": [
    "## Pengertian Bilangan Bulat\n\nBilangan bulat adalah bilangan yang terdiri dari bilangan positif, nol, dan negatif. Contoh: ..., -3, -2, -1, 0, 1, 2, 3, ...",
    "## Operasi Bilangan Bulat\n\n1. **Penjumlahan**: beda tanda → kurangi, ambil tanda terbesar\n2. **Pengurangan**: a-b = a+(-b)\n3. **Perkalian**: positif × positif = positif, negatif × positif = negatif\n4. **Pembagian**: aturan tanda sama dengan perkalian",
    "## Sifat Operasi\n\n- **Komutatif**: a+b = b+a, a×b = b×a\n- **Asosiatif**: (a+b)+c = a+(b+c)\n- **Distributif**: a(b+c) = ab+ac\n- Urutan operasi: kurung → pangkat → ×÷ → +-",
    "## Aplikasi Bilangan Bulat\n\nSuhu di bawah nol, kedalaman laut, keuntungan-kerugian, posisi lantai gedung (basement), skor pertandingan."
  ],
  "Bentuk Aljabar": [
    "## Pengertian Aljabar\n\nAljabar menggunakan huruf (variabel) untuk mewakili bilangan yang belum diketahui.",
    "## Unsur Aljabar\n\n1. **Variabel**: huruf (x, y, a)\n2. **Koefisien**: angka di depan variabel\n3. **Konstanta**: bilangan tanpa variabel\n4. **Suku**: bagian yang dipisah + atau -",
    "## Operasi Aljabar\n\n1. Suku sejenis (variabel sama) boleh dijumlah/dikurang\n2. Perkalian: distributif a(b+c) = ab+ac\n3. Pemfaktoran: mencari FPB, selisih kuadrat",
    "## Aplikasi Aljabar\n\nMenghitung umur, harga barang, jarak tempuh dengan informasi yang belum lengkap."
  ],
  "Sepak Bola": [
    "## Pengertian Sepak Bola\n\nSepak bola adalah permainan beregu yang dimainkan 11 pemain per tim dengan tujuan memasukkan bola ke gawang lawan.",
    "## Teknik Dasar\n\n1. Menendang (kaki dalam, punggung, luar)\n2. Mengontrol/menghentikan bola\n3. Menggiring (dribbling)\n4. Menyundul (heading)\n5. Lemparan ke dalam (throw-in)",
    "## Aturan Permainan\n\n- 11 pemain + kiper per tim\n- 2 babak × 45 menit\n- Pelanggaran: handball, offside, tekel keras\n- Kartu kuning (peringatan), merah (keluar)",
    "## Manfaat Olahraga\n\n1. Kebugaran: melatih jantung, paru-paru\n2. Kerjasama tim\n3. Strategi dan taktik\n4. Sportivitas dan fair play",
  ],
};

async function main() {
  const sres = await pool.query(`SELECT id FROM "Student" WHERE "studentId" = 'STU_MRHLH4LX'`);
  const studentId = sres.rows[0].id;

  // Get materials from latest curriculum
  const mats = await pool.query(
    `SELECT m.id, m."subTopic", m.topic, m.subject
     FROM "Material" m
     JOIN "Curriculum" c ON c.id = m."curriculumId" AND c.version = (SELECT max(version) FROM "Curriculum" WHERE "studentId" = $1)
     WHERE c."studentId" = $1
     ORDER BY m.subject, m."weekOrder"`,
    [studentId]
  );
  
  let updated = 0;
  for (const m of mats.rows) {
    const slides = SLIDES_MD[m.subTopic] || null;
    if (!slides) continue;
    
    const md = slides.join("\n\n---\n\n");
    await pool.query(
      `UPDATE "Material" SET "rawContent" = $1, "processedContent" = $2 WHERE id = $3`,
      [md, md, m.id]
    );
    updated++;
  }

  console.log(`✅ Updated ${updated} materials with markdown content`);
  
  // Show summary
  const result = await pool.query(
    `SELECT m.subject, count(*) as n FROM "Material" m
     JOIN "Curriculum" c ON c.id = m."curriculumId" AND c.version = (SELECT max(version) FROM "Curriculum" WHERE "studentId" = $1)
     WHERE c."studentId" = $1 AND length(m."rawContent") > 50
     GROUP BY m.subject ORDER BY m.subject`,
    [studentId]
  );
  console.log("\nMaterials with rich content:");
  for (const r of result.rows) {
    console.log(`  ${r.subject}: ${r.n} ✅`);
  }
  
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
