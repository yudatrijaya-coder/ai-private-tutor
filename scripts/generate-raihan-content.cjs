const { Pool } = require("pg");
const crypto = require("crypto");

const pool = new Pool({
  host: "localhost", port: 5432, database: "ai_private_tutor",
  user: "tutor", password: "tutor123",
});

function uid() { return crypto.randomUUID(); }

const S = {
  "Bahasa Indonesia": [
    ["Teks Deskripsi", "Mengenal Teks Deskripsi", 4],
    ["Teks Deskripsi", "Mengidentifikasi Ciri Teks Deskripsi", 4],
    ["Teks Deskripsi", "Menulis Teks Deskripsi", 4],
    ["Puisi Rakyat", "Mengenal Puisi Rakyat", 4],
    ["Puisi Rakyat", "Unsur dan Jenis Puisi Rakyat", 4],
    ["Teks Naratif", "Mengenal Teks Naratif", 4],
    ["Teks Naratif", "Alur dan Penokohan", 4],
    ["Teks Berita", "Unsur-Unsur Berita", 4],
    ["Teks Berita", "Menulis Teks Berita", 4],
    ["Buku Fiksi dan Nonfiksi", "Mengenal Buku Fiksi dan Nonfiksi", 4],
  ],
  "Bahasa Inggris": [
    ["Greetings", "Expression of Greeting and Self-Introduction", 4],
    ["Family", "Describing Family Members", 4],
    ["School Life", "Daily Activities at School", 4],
    ["Hobbies", "Talking about Hobbies and Interests", 4],
    ["Animals", "Describing Animals", 4],
    ["Time", "Telling Time and Daily Routine", 4],
    ["Food and Drink", "Expressing Likes and Dislikes", 4],
  ],
  Matematika: [
    ["Bilangan", "Bilangan Bulat dan Operasinya", 6],
    ["Bilangan", "Bilangan Pecahan", 6],
    ["Aljabar", "Bentuk Aljabar", 6],
    ["Aljabar", "Persamaan Linear Satu Variabel", 6],
    ["Geometri", "Garis dan Sudut", 6],
    ["Geometri", "Segitiga dan Segiempat", 6],
    ["Statistika", "Penyajian Data", 6],
    ["Statistika", "Ukuran Pemusatan Data", 4],
  ],
  IPA: [
    ["Pengukuran", "Besaran dan Pengukuran", 4],
    ["Klasifikasi Makhluk Hidup", "Ciri-Ciri Makhluk Hidup", 4],
    ["Klasifikasi Makhluk Hidup", "Klasifikasi Makhluk Hidup", 4],
    ["Zat dan Wujudnya", "Unsur, Senyawa, dan Campuran", 4],
    ["Suhu dan Kalor", "Suhu dan Pemuaian", 4],
    ["Suhu dan Kalor", "Kalor dan Perpindahannya", 4],
    ["Gerak", "Gerak Lurus dan Gaya", 4],
    ["Ekosistem", "Komponen Ekosistem dan Interaksi", 4],
  ],
  IPS: [
    ["Keadaan Alam", "Letak dan Kondisi Geografis Indonesia", 4],
    ["Keadaan Alam", "Potensi Sumber Daya Alam", 4],
    ["Sejarah Keluarga", "Kehidupan Masyarakat Praaksara", 4],
    ["Sejarah Keluarga", "Kerajaan Hindu-Buddha di Indonesia", 4],
    ["Sejarah Keluarga", "Kerajaan Islam di Indonesia", 4],
    ["Kegiatan Ekonomi", "Produksi, Distribusi, dan Konsumsi", 4],
    ["Kegiatan Ekonomi", "Pasar dan Permintaan-Penawaran", 4],
    ["Interaksi Sosial", "Sosialisasi dan Lembaga Sosial", 4],
  ],
  Fisika: [
    ["Besaran dan Pengukuran", "Besaran Pokok dan Turunan", 4],
    ["Gerak Lurus", "Jarak dan Perpindahan", 4],
    ["Gerak Lurus", "Kelajuan, Kecepatan, dan Percepatan", 4],
    ["Gaya", "Hukum Newton", 4],
    ["Usaha dan Energi", "Energi Kinetik dan Potensial", 4],
    ["Tekanan", "Tekanan Zat Padat, Cair, dan Gas", 4],
    ["Getaran dan Gelombang", "Getaran dan Gelombang", 4],
  ],
  Kimia: [
    ["Hakikat Kimia", "Metode Ilmiah dan Laboratorium", 4],
    ["Unsur", "Lambang Unsur dan Tabel Periodik", 4],
    ["Senyawa", "Rumus Kimia dan Tata Nama", 4],
    ["Campuran", "Larutan dan Konsentrasi", 4],
    ["Reaksi Kimia", "Reaksi Kimia Sederhana", 4],
    ["Asam Basa", "Sifat Asam dan Basa", 4],
  ],
  Informatika: [
    ["Pengantar Informatika", "Definisi dan Ruang Lingkup Informatika", 2],
    ["Hardware", "Pengenalan Perangkat Keras Komputer", 4],
    ["Software", "Perangkat Lunak Aplikasi", 4],
    ["Algoritma", "Dasar-Dasar Algoritma dan Flowchart", 6],
    ["Pemrograman", "Pengantar Pemrograman Visual", 6],
    ["Internet", "Jaringan Internet dan Keamanan", 4],
    ["Analisis Data", "Pengolahan Data Sederhana", 4],
  ],
  "Pendidikan Pancasila": [
    ["Pancasila", "Nilai-Nilai Pancasila dalam Kehidupan", 4],
    ["Pancasila", "Penerapan Pancasila di Lingkungan Sekolah", 4],
    ["Norma", "Norma dan Keadilan", 4],
    ["Hak dan Kewajiban", "Hak dan Kewajiban Warga Negara", 4],
    ["Bhinneka Tunggal Ika", "Keberagaman Suku, Agama, dan Budaya", 4],
    ["Bhinneka Tunggal Ika", "Toleransi dan Kerukunan", 2],
    ["NKRI", "Wilayah dan Pemerintahan NKRI", 4],
  ],
  PJOK: [
    ["Permainan Bola Besar", "Sepak Bola", 4],
    ["Permainan Bola Besar", "Bola Basket", 4],
    ["Permainan Bola Kecil", "Bulu Tangkis", 4],
    ["Atletik", "Lari Jarak Pendek", 4],
    ["Atletik", "Lompat dan Lempar", 4],
    ["Kebugaran Jasmani", "Latihan Kebugaran", 4],
    ["Senam", "Senam Lantai", 2],
    ["Renang", "Pengenalan Renang", 2],
  ],
};

const SLIDES = {
  "Mengenal Teks Deskripsi": "Teks deskripsi adalah teks yang menggambarkan suatu objek, tempat, atau peristiwa secara rinci sehingga pembaca seolah-olah melihat, mendengar, atau merasakannya. Ciri: menggambarkan sesuatu, menggunakan kata sifat, dan kalimat terperinci.",
  "Mengidentifikasi Ciri Teks Deskripsi": "Ciri kebahasaan teks deskripsi: menggunakan kata sifat (besar, cantik, indah), kata kerja (ada, tampak), dan kalimat perinci. Struktur: identifikasi, deskripsi bagian, dan simpulan/kesan.",
  "Menulis Teks Deskripsi": "Langkah menulis teks deskripsi: 1) tentukan objek, 2) kumpulkan detail, 3) urutkan dari umum ke khusus, 4) gunakan kata sifat yang tepat, 5) beri kesan penutup.",
  "Mengenal Puisi Rakyat": "Puisi rakyat adalah sastra lisan warisan leluhur. Jenis: pantun (bersajak a-b-a-b), syair (a-a-a-a), gurindam (dua baris berisi nasihat). Setiap jenis punya aturan jumlah baris dan rima.",
  "Unsur dan Jenis Puisi Rakyat": "Pantun: 4 baris, sampiran (baris 1-2), isi (baris 3-4). Syair: 4 baris, semua baris isi. Gurindam: 2 baris, baris 1 sebab, baris 2 akibat. Semua mengandung nilai moral.",
  "Mengenal Teks Naratif": "Teks naratif menceritakan rangkaian peristiwa secara kronologis. Unsur: tema, tokoh, alur, latar, amanat. Contoh: cerita rakyat, fabel, legenda.",
  "Alur dan Penokohan": "Alur: pengenalan → konflik → klimaks → resolusi → penyelesaian. Penokohan: protagonis (tokoh baik), antagonis (tokoh jahat), tritagonis (penengah).",
  "Unsur-Unsur Berita": "Unsur berita 5W+1H: What (apa), Who (siapa), When (kapan), Where (di mana), Why (mengapa), How (bagaimana). Berita harus faktual, aktual, dan objektif.",
  "Menulis Teks Berita": "Struktur berita: judul, teras berita (lead), tubuh berita (isi detail), ekor (kesimpulan). Gunakan bahasa baku, kalimat efektif, dan fakta.",
  "Mengenal Buku Fiksi dan Nonfiksi": "Buku fiksi: cerita imajinatif (novel, cerpen, dongeng). Buku nonfiksi: berdasarkan fakta (buku pelajaran, biografi, ensiklopedia). Perbedaan: fiksi bersifat imajinasi, nonfiksi bersifat informatif.",
  "Expression of Greeting and Self-Introduction": "Greetings: Good morning/afternoon/evening. Self-introduction: Let me introduce myself. My name is ... I am from ... Nice to meet you.",
  "Describing Family Members": "Vocabulary: father, mother, brother, sister, grandfather, grandmother. Structure: This is my ... He/She is ... My father is tall and kind.",
  "Daily Activities at School": "Vocabulary: go to school, study, read, write, play, have lunch. Present tense: I go to school every day. She reads a book in the library.",
  "Talking about Hobbies and Interests": "Vocabulary: swimming, reading, singing, dancing, playing football. Structure: I like ... My hobby is ... He enjoys ... Do you like ...?",
  "Describing Animals": "Vocabulary: elephant (big), giraffe (tall), tiger (fierce), rabbit (cute). Structure: An elephant has big ears. It lives in the jungle. It eats grass.",
  "Telling Time and Daily Routine": "What time is it? It is seven o'clock. Half past seven. Quarter to eight. Daily routine: I wake up at 5 o'clock. I have breakfast at 6.",
  "Expressing Likes and Dislikes": "I like ... I love ... I enjoy ... I don't like ... I hate ... Would you like to ...? Yes, I would. No, thank you.",
  "Bilangan Bulat dan Operasinya": "Bilangan bulat: ..., -3, -2, -1, 0, 1, 2, 3, ... Operasi: +, -, ×, ÷. Sifat: komutatif (a+b=b+a), asosiatif, distributif. Urutan operasi: kurung → pangkat → ×÷ → +-.",
  "Bilangan Pecahan": "Pecahan = a/b dengan b≠0. Jenis: biasa, campuran, desimal, persen. Operasi: menyamakan penyebut untuk +/-, pembilang × pembilang untuk ×. Pecahan senilai: a/b = c/d jika ad = bc.",
  "Bentuk Aljabar": "Variabel (x, y), koefisien, konstanta, suku. Operasi: suku sejenis dijumlah/dikurang. Perkalian: distributif a(b+c) = ab+ac. Pemfaktoran: FPB, selisih kuadrat.",
  "Persamaan Linear Satu Variabel": "Bentuk ax + b = c. Penyelesaian: tambah/kurang/kali/bagi kedua ruas. Contoh: 2x + 3 = 7 → 2x = 4 → x = 2. Penerapan: soal cerita.",
  "Garis dan Sudut": "Garis: sejajar (//), berpotongan, tegak lurus. Sudut: lancip (<90°), siku-siku (90°), tumpul (>90°). Hubungan sudut: bertolak belakang, berseberangan, sepihak.",
  "Segitiga dan Segiempat": "Segitiga: siku-siku, sama kaki, sama sisi. Luas = ½×a×t, Keliling = a+b+c. Segiempat: persegi, persegi panjang, jajargenjang. Luas dan keliling masing-masing.",
  "Penyajian Data": "Cara menyajikan data: tabel, diagram batang, diagram lingkaran, diagram garis. Data tunggal: frekuensi, modus (nilai paling sering muncul).",
  "Ukuran Pemusatan Data": "Mean (rata-rata) = jumlah data / banyak data. Median = nilai tengah data terurut. Modus = nilai paling sering muncul. Contoh: data 2,3,5,5,7 → mean=4.4, median=5, modus=5.",
  "Besaran dan Pengukuran": "Besaran pokok: panjang (m), massa (kg), waktu (s). Besaran turunan: kecepatan (m/s), luas (m²). Pengukuran: mistar, jangka sorong, mikrometer. Ketelitian dan satuan baku.",
  "Ciri-Ciri Makhluk Hidup": "Ciri: bernapas, bergerak, makan, tumbuh, berkembang biak, iritabilita, ekskresi. Sel sebagai unit terkecil kehidupan. Makhluk hidup bersel satu dan banyak.",
  "Klasifikasi Makhluk Hidup": "Sistem 5 kingdom: Monera (bakteri), Protista, Fungi (jamur), Plantae (tumbuhan), Animalia (hewan). Dasar: ada tidaknya inti sel, jumlah sel, dan cara makan.",
  "Unsur, Senyawa, dan Campuran": "Unsur: zat tunggal (H, O, Fe). Senyawa: gabungan unsur (H₂O, CO₂). Campuran: homogen (larutan) dan heterogen. Perbedaan: senyawa reaksi kimia, campuran reaksi fisika.",
  "Suhu dan Pemuaian": "Suhu = derajat panas. Alat: termometer (Celsius, Reamur, Fahrenheit). Konversi: C:R:F = 5:4:9. Pemuaian: panjang, luas, volume pada zat padat, cair, gas.",
  "Kalor dan Perpindahannya": "Kalor = energi panas. Q = m×c×ΔT. Perpindahan: konduksi (padat), konveksi (cair/gas), radiasi (tanpa medium). Contoh: setrika (konduksi), AC (konveksi), matahari (radiasi).",
  "Gerak Lurus dan Gaya": "Gerak lurus beraturan (GLB): v = s/t. Gerak lurus berubah beraturan (GLBB): vt = vo + at. Gaya: dorongan/tarikan. Hukum Newton I: benda diam tetap diam jika resultan gaya = 0.",
  "Komponen Ekosistem dan Interaksi": "Ekosistem: satuan antara makhluk hidup dan lingkungan. Komponen biotik: produsen, konsumen, dekomposer. Abiotik: air, udara, tanah. Interaksi: simbiosis (mutualisme, parasitisme, komensalisme).",
  "Letak dan Kondisi Geografis Indonesia": "Letak astronomis: 6°LU-11°LS, 95°BT-141°BT. Letak geografis: antara Samudra Hindia dan Pasifik, Benua Asia dan Australia. Akibat: iklim tropis, rawan gempa, banyak gunung api.",
  "Potensi Sumber Daya Alam": "SDA hayati: hutan, pertanian, perkebunan, perikanan. Nonhayati: minyak bumi, gas, batu bara, emas. SDA terbarukan (air, angin, matahari). Sebaran SDA di Indonesia.",
  "Kehidupan Masyarakat Praaksara": "Masa berburu dan meramu (nomaden). Masa bercocok tanam (sedenter). Masa perundagian (peralatan logam). Peninggalan: kapak genggam, kapak lonjong, dolmen, sarkofagus.",
  "Kerajaan Hindu-Buddha di Indonesia": "Kerajaan: Kutai, Tarumanegara, Sriwijaya, Mataram Kuno, Majapahit. Peninggalan: candi (Borobudur, Prambanan), prasasti, kitab. Pengaruh: sistem kasta, seni bangunan, sastra.",
  "Kerajaan Islam di Indonesia": "Kerajaan: Samudra Pasai, Demak, Mataram Islam, Ternate Tidore, Makassar (Gowa-Tallo). Wali Songo penyebar Islam di Jawa. Peninggalan: masjid kuno, makam, keraton.",
  "Produksi, Distribusi, dan Konsumsi": "Produksi: kegiatan menghasilkan barang/jasa. Distribusi: menyalurkan dari produsen ke konsumen. Konsumsi: menghabiskan nilai guna. Pelaku ekonomi: rumah tangga, perusahaan, pemerintah, luar negeri.",
  "Pasar dan Permintaan-Penawaran": "Pasar: tempat jual beli. Permintaan (demand): jumlah barang yang diminta pada harga tertentu. Penawaran (supply): jumlah barang yang ditawarkan. Harga keseimbangan: perpotongan permintaan dan penawaran.",
  "Sosialisasi dan Lembaga Sosial": "Sosialisasi: proses belajar nilai dan norma. Agen: keluarga, sekolah, masyarakat. Lembaga sosial: keluarga, pendidikan, ekonomi, politik, agama. Fungsi masing-masing lembaga.",
  "Besaran Pokok dan Turunan": "Besaran pokok: panjang (m), massa (kg), waktu (s), suhu (K), kuat arus (A), intensitas cahaya (cd), jumlah zat (mol). Besaran turunan: luas, volume, kecepatan, massa jenis.",
  "Jarak dan Perpindahan": "Jarak = panjang lintasan total (skalar). Perpindahan = perubahan posisi (vektor). Contoh: berjalan 3m ke timur lalu 4m ke barat → jarak=7m, perpindahan=1m ke barat.",
  "Kelajuan, Kecepatan, dan Percepatan": "Kelajuan = jarak/waktu (skalar). Kecepatan = perpindahan/waktu (vektor). Percepatan = perubahan kecepatan/waktu. Gerak melingkar beraturan: percepatan sentripetal.",
  "Hukum Newton": "Hk I: ΣF=0 → benda diam/GLB. Hk II: F=ma. Hk III: aksi=reaksi. Contoh: naik bus → tubuh terdorong ke depan saat rem (Hk I), gaya dorong tembok (Hk III).",
  "Energi Kinetik dan Potensial": "Energi kinetik: EK = ½mv². Energi potensial gravitasi: EP = mgh. Energi mekanik = EK + EP. Hukum kekekalan energi mekanik. Aplikasi: roller coaster.",
  "Tekanan Zat Padat, Cair, dan Gas": "Tekanan = F/A. Tekanan hidrostatis: Ph = ρgh. Hukum Pascal: tekanan diteruskan ke segala arah. Hukum Archimedes: gaya apung = berat fluida yang dipindahkan.",
  "Getaran dan Gelombang": "Getaran: gerak bolak-balik. Frekuensi (f) = n/t, Periode (T) = t/n. Gelombang: mekanik (butuh medium) dan elektromagnetik. Panjang gelombang (λ), cepat rambat v = λf.",
  "Nilai-Nilai Pancasila dalam Kehidupan": "Pancasila dasar negara. Sila 1: Ketuhanan (toleransi). Sila 2: Kemanusiaan (adil). Sila 3: Persatuan (nasionalisme). Sila 4: Kerakyatan (musyawarah). Sila 5: Keadilan (merata).",
  "Penerapan Pancasila di Lingkungan Sekolah": "Sila 1: berdoa sebelum belajar. Sila 2: tidak membeda-bedakan teman. Sila 3: kerja bakti kelas. Sila 4: pemilihan ketua kelas. Sila 5: pembagian tugas piket.",
  "Norma dan Keadilan": "Norma: agama, kesusilaan, kesopanan, hukum. Sanksi masing-masing. Keadilan: setiap orang mendapat haknya. Contoh: antre di kantin (norma kesopanan).",
  "Hak dan Kewajiban Warga Negara": "Hak: pendidikan, kesehatan, berpendapat. Kewajiban: membayar pajak, menaati hukum, bela negara. Di sekolah: hak belajar, kewajiban mengerjakan tugas.",
  "Keberagaman Suku, Agama, dan Budaya": "Indonesia punya 1.340 suku, 6 agama resmi. Keberagaman: rumah adat, pakaian adat, tarian, bahasa daerah. Semboyan: Bhinneka Tunggal Ika.",
  "Toleransi dan Kerukunan": "Toleransi: menghormati perbedaan. Kerukunan: hidup damai dalam keberagaman. Contoh: menghormati teman yang beribadah, ikut merayakan hari besar agama lain.",
  "Wilayah dan Pemerintahan NKRI": "Wilayah NKRI: darat, laut, udara. Pembagian provinsi (38). Pemerintahan pusat: presiden, DPR. Daerah: gubernur, bupati/walikota, DPRD. Otonomi daerah.",
  "Sepak Bola": "Teknik dasar: menendang, mengontrol, menggiring, menyundul. Aturan: 11 pemain, 2×45 menit. Pelanggaran: offside, handball, tekel keras. Tujuan: mencetak gol ke gawang lawan.",
  "Bola Basket": "Teknik: dribble, passing, shooting. Aturan: 5 pemain, 4×10 menit. Pelanggaran: travel (jalan sebelum dribble), double dribble. Skor: 2 poin (dalam), 3 poin (luar).",
  "Bulu Tangkis": "Teknik: servis, lob, smash, dropshot. Aturan: best of 3 game, 21 poin per game. Ganda: runcing/setengah lingkaran. Lapangan: 13.4×5.18m (tunggal).",
  "Lari Jarak Pendek": "Teknik start: jongkok (bunyi 'bersedia-siap-ya'). Lari: ayunan tangan, langkah lebar. Finish: dada condong ke depan. Jarak: 100m, 200m, 400m.",
  "Lompat dan Lempar": "Lompat jauh: awalan, tolakan, melayang, mendarat. Lempar lembing: awalan, lempar, lepas. Tolak peluru: menolak, bukan melempar. Gaya: O'Brien (membelakangi).",
  "Latihan Kebugaran": "Komponen kebugaran: kekuatan, daya tahan, kelenturan, kecepatan. Latihan: push up, sit up, back up, lari 12 menit. Tes: WFI, Harvard step test.",
  "Senam Lantai": "Gerakan: guling depan, guling belakang, kayang, sikap lilin, handstand, headstand. Manfaat: melatih keseimbangan, kelenturan, koordinasi. Pemanasan sebelum senam penting untuk mencegah cedera.",
  "Pengenalan Renang": "Gaya renang: dada, bebas, punggung, kupu-kupu. Teknik dasar: mengapung, meluncur, pernapasan. Keselamatan di air. Manfaat: melatih pernapasan, seluruh otot bergerak.",
};

const FALLBACK_SLIDE = "Materi ini membahas konsep dasar dan penerapan dalam kehidupan sehari-hari sesuai Kurikulum Merdeka Kelas VII.";

function q(text) {
  return `'${String(text).replace(/'/g, "''")}'`;
}

async function main() {
  const sres = await pool.query(`SELECT id FROM "Student" WHERE "studentId" = 'STU_MRHLH4LX'`);
  const studentId = sres.rows[0].id;
  
  const cres = await pool.query(`SELECT id FROM "Curriculum" WHERE "studentId" = $1 ORDER BY version DESC LIMIT 1`, [studentId]);
  const currId = cres.rows[0].id;
  console.log(`Curriculum: ${currId}, Student UUID: ${studentId}`);

  let totalMats = 0;
  let totalQ = 0;

  for (const [subject, topics] of Object.entries(S)) {
    // Delete old materials for this subject
    const old = await pool.query(`SELECT id FROM "Material" WHERE "curriculumId" = $1 AND subject = $2`, [currId, subject]);
    for (const m of old.rows) {
      const qs = await pool.query(`SELECT id FROM "Quiz" WHERE "materialId" = $1`, [m.id]);
      for (const q of qs.rows) {
        await pool.query(`DELETE FROM "Attempt" WHERE "quizId" = $1`, [q.id]);
      }
      await pool.query(`DELETE FROM "Quiz" WHERE "materialId" = $1`, [m.id]);
      await pool.query(`DELETE FROM "Material" WHERE id = $1`, [m.id]);
    }
    console.log(`${subject}: deleted ${old.rows.length} old`);

    for (let i = 0; i < topics.length; i++) {
      const [topic, sub, jam] = topics[i];
      const matId = uid();
      const slide = SLIDES[sub] || FALLBACK_SLIDE;
      
      await pool.query(
        `INSERT INTO "Material" (id, "curriculumId", subject, topic, "subTopic", "rawContent", "processedContent", "gradeLevel", "weekOrder", priority, delivery, status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'SMP_1', $8, $9, 'TEXT', 'READY', NOW(), NOW())`,
        [matId, currId, subject, topic, sub, slide, slide, Math.ceil((i+1)/2), jam]
      );

      const q = { question: `Apa konsep utama dari "${sub}"?`, options: ["Konsep inti sesuai definisi", "Konsep yang tidak berkaitan", "Konsep dari bab lain", "Tidak ada jawaban benar"], correctIndex: 0, explanation: `${sub} adalah ${slide.slice(0,100)}...` };
      const quizId = uid();
      await pool.query(
        `INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "timeLimit", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'QUIZ', $4, $5, NULL, NOW(), NOW())`,
        [quizId, matId, studentId, JSON.stringify([q]), 1]
      );
      totalMats++;
      totalQ++;
    }
    console.log(`  + ${topics.length} materials, ${topics.length} quizzes`);
  }

  console.log(`\n✅ TOTAL: ${totalMats} materials, ${totalQ} quizzes for Raihan`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
