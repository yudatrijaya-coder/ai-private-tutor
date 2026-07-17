const { Pool } = require("pg");
const crypto = require("crypto");

const pool = new Pool({
  host: "localhost", port: 5432, database: "ai_private_tutor",
  user: "tutor", password: "tutor123",
});

function uid() { return crypto.randomUUID(); }

const Q_BANK = {
  "Teks Deskripsi": [
    {q:"Apa ciri utama teks deskripsi?",o:["Menceritakan kisah","Menggambarkan objek detail","Memberi argumentasi","Memberi petunjuk"],c:1,e:"Teks deskripsi menggambarkan objek, tempat, atau peristiwa secara rinci."},
    {q:"Kata mana yang sering muncul di teks deskripsi?",o:["Karena","Oleh sebab itu","Besar dan cantik","Setelah itu"],c:2,e:"Teks deskripsi banyak menggunakan kata sifat."},
    {q:"Struktur teks deskripsi dimulai dari?",o:["Simpulan","Identifikasi","Argumentasi","Rekomendasi"],c:1,e:"Struktur: identifikasi → deskripsi bagian → kesan."},
    {q:"Kalimat manakah termasuk deskripsi?",o:["Hari ini sekolah libur","Gunung itu sangat tinggi dan tertutup salju","Sebaiknya kita rajin belajar","Dia pergi ke pasar"],c:1,e:"Kalimat menggambarkan objek (gunung) secara detail."},
    {q:"Teks deskripsi sering menggunakan sudut pandang?",o:["Orang pertama","Orang ketiga","Campuran","Semua benar"],c:3,e:"Teks deskripsi bisa pakai sudut pandang apa saja tergantung objek."}
  ],
  "Puisi Rakyat": [
    {q:"Berapa baris dalam pantun?",o:["2","4","6","8"],c:1,e:"Pantun terdiri dari 4 baris: 2 sampiran + 2 isi."},
    {q:"Sajak pantun bersamaan pada baris?",o:["1-2 dan 3-4","1-4 dan 2-3","1-3 dan 2-4","Semua bersamaan"],c:0,e:"Sajak pantun a-b-a-b pada baris 1-2-3-4."},
    {q:"Syair memiliki berapa baris?",o:["2","4","6","8"],c:1,e:"Syair terdiri dari 4 baris dengan sajak a-a-a-a."},
    {q:"Gurindam berisi?",o:["Nasihat","Cinta","Sedih","Humor"],c:0,e:"Gurindam adalah puisi dua baris yang berisi nasihat/pendidikan."},
    {q:"Pantun berasal dari kata?",o:["Patuntun","Pahat","Putar","Pantang"],c:0,e:"Pantun berasal dari 'patuntun' (Membantu) dalam bahasa Jawa Kuno."}
  ],
  "Bilangan Bulat": [
    {q:"Hasil dari -5 + 8 adalah?",o:["-13","-3","3","13"],c:2,e:"-5 + 8 = 3 (beda tanda, kurangi dan ambil tanda yang lebih besar)."},
    {q:"Sifat komutatif bilangan bulat berlaku untuk?",o:["Penjumlahan dan pengurangan","Penjumlahan dan perkalian","Pembagian dan pengurangan","Semua operasi"],c:1,e:"a+b=b+a dan a×b=b×a. Pengurangan dan pembagian tidak komutatif."},
    {q:"Hasil dari (-4) × (-3) adalah?",o:["-12","-7","7","12"],c:3,e:"Negatif × negatif = positif. -4 × -3 = 12."},
    {q:"Urutan operasi bilangan yang benar?",o:["+- lalu ×÷","×÷ lalu +-","Kurung lalu +-","Kurung → pangkat → ×÷ → +-"],c:3,e:"Urutan: kurung, pangkat, kali/bagi, tambah/kurang."},
    {q:"Jika a = -2 dan b = 3, nilai 2a + b adalah?",o:["-1","1","-7","7"],c:0,e:"2(-2) + 3 = -4 + 3 = -1."}
  ],
  "Bentuk Aljabar": [
    {q:"Suku sejenis dari 3x + 2y - 5x adalah?",o:["3x dan 2y","3x dan -5x","2y dan -5x","Semua"],c:1,e:"3x dan -5x punya variabel sama (x)."},
    {q:"Hasil dari 2(x + 3) adalah?",o:["2x + 3","2x + 6","x + 6","2x + 5"],c:1,e:"Distributif: 2×x + 2×3 = 2x + 6."},
    {q:"Pemfaktoran dari x² - 9 adalah?",o:["(x-3)(x-3)","(x+3)(x+3)","(x+3)(x-3)","(x-9)(x+1)"],c:2,e:"Selisih kuadrat: x² - 9 = (x+3)(x-3)."},
    {q:"Koefisien dari -4xy² adalah?",o:["-4","4","x","y²"],c:0,e:"Koefisien adalah angka di depan variabel."},
    {q:"Jumlah suku dari 3a - 2b + c adalah?",o:["1","2","3","4"],c:2,e:"Ada 3 suku: 3a, -2b, dan c."}
  ],
  "Sepak Bola": [
    {q:"Berapa jumlah pemain sepak bola dalam satu tim?",o:["9","10","11","12"],c:2,e:"Sepak bola dimainkan 11 pemain per tim."},
    {q:"Berapa lama waktu pertandingan sepak bola?",o:["2×30 menit","2×35 menit","2×40 menit","2×45 menit"],c:3,e:"Pertandingan sepak bola 2 babak × 45 menit."},
    {q:"Teknik dasar sepak bola yang pertama dipelajari?",o:["Menendang","Menggiring","Mengontrol","Menyundul"],c:2,e:"Mengontrol/menghentikan bola (trapping) adalah teknik dasar pertama."},
    {q:"Pelanggaran saat pemain menggunakan tangan disebut?",o:["Offside","Handball","Foul","Offside trap"],c:1,e:"Handball adalah pelanggaran menggunakan tangan/tangan."},
    {q:"Tendangan sudut dilakukan saat?",o:["Bola keluar dari garis gawang","Bola keluar dari garis samping","Pemain dilanggar di kotak penalti","Pemain offside"],c:0,e:"Tendangan sudut saat bola keluar dari garis gawang oleh pemain bertahan."}
  ],
};

// Default fallback questions generator
function makeDefaultQs(topic, sub) {
  return [
    {q:`Apa pengertian dari "${sub}"?`,o:[`Definisi ${sub}`,`Konsep yang tidak berkaitan`,`Istilah dari pelajaran lain`,`Tidak ada jawaban benar`],c:0,e:`${sub} adalah konsep penting dalam pelajaran ${topic}.`},
    {q:`Mengapa "${sub}" penting dipelajari?`,o:[`Tidak penting`,`Untuk ujian saja`,`Berguna dalam kehidupan`,`Hanya teori`],c:2,e:`${sub} memiliki penerapan praktis dalam kehidupan sehari-hari.`},
    {q:`Contoh penerapan "${sub}" dalam kehidupan?`,o:[`Tidak ada contoh`,`Contoh hipotetis`,`Banyak contoh nyata`,`Hanya di laboratorium`],c:2,e:`${sub} sering ditemui dalam kehidupan sehari-hari.`},
    {q:`Siapa yang mempelajari "${sub}"?`,o:[`Hanya guru`,`Hanya siswa`,`Semua orang`,`Tidak perlu dipelajari`],c:2,e:`Semua orang bisa mempelajari ${sub} karena manfaatnya.`},
    {q:`Bagaimana cara memahami "${sub}" dengan baik?`,o:[`Hafal definisi`,`Praktik dan latihan soal`,`Tidak perlu dipahami`,`Hanya baca sekali`],c:1,e:`Memahami ${sub} memerlukan praktik dan latihan soal.`}
  ];
}

const YT_LINKS = {
  "Bahasa Indonesia": "https://www.youtube.com/results?search_query=belajar+bahasa+indonesia+kelas+7+kurikulum+merdeka",
  "Bahasa Inggris": "https://www.youtube.com/results?search_query=english+for+junior+high+school+grade+7",
  Matematika: "https://www.youtube.com/results?search_query=matematika+kelas+7+kurikulum+merdeka",
  IPA: "https://www.youtube.com/results?search_query=ipa+kelas+7+smp+kurikulum+merdeka",
  IPS: "https://www.youtube.com/results?search_query=ips+kelas+7+smp+kurikulum+merdeka",
  Fisika: "https://www.youtube.com/results?search_query=fisika+kelas+7+smp+kurikulum+merdeka",
  Kimia: "https://www.youtube.com/results?search_query=kimia+kelas+7+smp+kurikulum+merdeka",
  Informatika: "https://www.youtube.com/results?search_query=informatika+kelas+7+smp",
  "Pendidikan Pancasila": "https://www.youtube.com/results?search_query=ppkn+kelas+7+smp+kurikulum+merdeka",
  PJOK: "https://www.youtube.com/results?search_query=penjas+kelas+7+smp",
};

async function main() {
  const sres = await pool.query(`SELECT id FROM "Student" WHERE "studentId" = 'STU_MRHLH4LX'`);
  const studentId = sres.rows[0].id;

  const mats = await pool.query(
    `SELECT m.id, m."subTopic", m.subject, m.topic
     FROM "Material" m
     JOIN "Curriculum" c ON c.id = m."curriculumId"
     WHERE c."studentId" = $1 ORDER BY m.subject, m."weekOrder"`,
    [studentId]
  );

  let updatedQ = 0;
  let updatedMeta = 0;

  for (const m of mats.rows) {
    const qArr = Q_BANK[m.subTopic] || makeDefaultQs(m.topic, m.subTopic);
    
    // Update quiz with 5 questions
    const quizRes = await pool.query(`SELECT id FROM "Quiz" WHERE "materialId" = $1`, [m.id]);
    if (quizRes.rows.length > 0) {
      await pool.query(
        `UPDATE "Quiz" SET questions = $1, "maxScore" = $2 WHERE "materialId" = $3`,
        [JSON.stringify(qArr), qArr.length, m.id]
      );
      updatedQ++;
    }

    // Add metadata with exam info and YouTube
    const yt = YT_LINKS[m.subject] || "";
    const metadata = JSON.stringify({
      examInfo: {
        description: `Ujian ${m.topic} — ${m.subTopic}. Materi meliputi konsep dasar, penerapan, dan latihan soal.`,
        totalQuestions: 10,
        durationMinutes: 30,
      },
      youtubeUrl: yt,
      subject: m.subject,
    });

    await pool.query(
      `UPDATE "Material" SET metadata = $1 WHERE id = $2`,
      [metadata, m.id]
    );
    updatedMeta++;
  }

  console.log(`✅ Updated ${updatedQ} quizzes (5 soal each)`);
  console.log(`✅ Updated ${updatedMeta} materials (metadata + YouTube)`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
