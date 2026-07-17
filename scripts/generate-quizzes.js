/**
 * Generate quizzes for SHOFI (STU_MRHQL6KX) using raw SQL (pg)
 * Materials without quizzes:
 * - Kimia: Pengantar Kimia (5284a834-de1a-48a8-975c-1206f3f1d205)
 * - Kimia: Termokimia (df992341-3e3f-4a57-b44f-8f0dfa9dad0f)
 * - Bahasa Inggris Tingkat Lanjut: Pengantar (1126855c-e24e-4408-9c2c-7381d4869884)
 * - Matematika Tingkat Lanjut: Pengantar (b3464210-831e-49c2-854c-561105d14af5)
 */

const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'tutor',
  password: 'tutor123',
  database: 'ai_private_tutor'
});

const STUDENT_ID = 'e30b6559-1d33-4aa5-a39a-22102f29894d';

const quizzesData = [
  {
    materialId: '5284a834-de1a-48a8-975c-1206f3f1d205',
    subject: 'Kimia',
    topic: 'Pengantar Kimia',
    questions: [
      {
        question: 'Apa yang dimaksud dengan atom?',
        options: [
          'Bagian terkecil dari suatu unsur yang masih memiliki sifat unsur tersebut',
          'Gabungan dari beberapa unsur',
          'Bagian yang tidak dapat dibagi lagi',
          'Zat yang terbentuk dari reaksi kimia'
        ],
        correctIndex: 0,
        difficulty: 'easy',
        explanation: 'Atom adalah bagian terkecil dari suatu unsur yang masih memiliki sifat unsur tersebut dan tidak dapat dibagi lagi dengan cara reaksi kimia biasa.'
      },
      {
        question: 'Apa perbedaan antara unsur dan senyawa?',
        options: [
          'Unsur adalah zat murni, senyawa gabungan dari dua atau lebih unsur',
          'Unsur lebih besar dari senyawa',
          'Senyawa tidak memiliki massa',
          'Tidak ada perbedaan'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Unsur adalah zat murni yang tidak dapat dipecah menjadi zat yang lebih sederhana, sedangkan senyawa terbentuk dari gabungan dua atau lebih unsur yang dapat diuraikan kembali.'
      },
      {
        question: 'Apa yang dimaksud dengan campuran?',
        options: [
          'Gabungan dua atau lebih zat yang tidak bereaksi secara kimia',
          'Zat yang hanya terdiri dari satu unsur',
          'Zat yang telah mengalami perubahan kimia',
          'Bagian terkecil dari suatu molekul'
        ],
        correctIndex: 0,
        difficulty: 'easy',
        explanation: 'Campuran adalah gabungan dua atau lebih zat yang tidak bergabung secara kimia, sehingga setiap zat penyusun masih mempertahankan sifat aslinya.'
      },
      {
        question: 'Apa fungsi utama tabel periodik unsur?',
        options: [
          'Mengelompokkan unsur berdasarkan sifat kimia dan nomor atom',
          'Menyimpan rumus-rumus kimia',
          'Menunjukkan reaksi kimia yang mungkin terjadi',
          'Mengukur massa atom suatu unsur'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Tabel periodik mengelompokkan unsur-unsur berdasarkan kenaikan nomor atom dan kemiripan sifat kimia.'
      },
      {
        question: 'Manakah yang merupakan contoh perubahan fisika?',
        options: [
          'Es batu mencair menjadi air',
          'Kayu terbakar menjadi abu',
          'Besi berkarat',
          'Singkong difermentasi menjadi tape'
        ],
        correctIndex: 0,
        difficulty: 'easy',
        explanation: 'Perubahan fisika adalah perubahan yang tidak menghasilkan zat baru. Es mencair hanya mengubah wujud dari padat menjadi cair, tanpa mengubah sifat kimia air.'
      },
      {
        question: 'Ikatan kimia yang terjadi akibat serah terima elektron disebut...',
        options: [
          'Ikatan ionik',
          'Ikatan kovalen',
          'Ikatan logam',
          'Ikatan hidrogen'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Ikatan ionik terbentuk melalui serah terima elektron antara atom logam dan non-logam, menghasilkan ion positif dan negatif yang saling tarik-menarik.'
      },
      {
        question: 'Manakah yang TIDAK termasuk contoh perubahan kimia?',
        options: [
          'Gula larut dalam air',
          'Kertas dibakar',
          'Buah membusuk',
          'Susu menjadi asam'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Gula larut dalam air adalah perubahan fisika, karena gula masih tetap gula dan dapat diperoleh kembali melalui penguapan. Tidak terbentuk zat baru.'
      },
      {
        question: 'Apa yang dimaksud dengan molekul?',
        options: [
          'Gabungan dua atau lebih atom yang terikat secara kimia',
          'Atom tunggal yang berdiri sendiri',
          'Campuran homogen dari berbagai unsur',
          'Zat tunggal yang tidak dapat diuraikan'
        ],
        correctIndex: 0,
        difficulty: 'easy',
        explanation: 'Molekul adalah partikel netral yang terdiri dari dua atau lebih atom yang terikat satu sama lain melalui ikatan kimia.'
      }
    ]
  },
  {
    materialId: 'df992341-3e3f-4a57-b44f-8f0dfa9dad0f',
    subject: 'Kimia',
    topic: 'Termokimia',
    questions: [
      {
        question: 'Apa fungsi utama kalorimeter?',
        options: [
          'Mengukur perubahan panas dalam reaksi kimia',
          'Mengukur massa zat yang bereaksi',
          'Memisahkan campuran berdasarkan titik didih',
          'Mengukur volume gas yang dihasilkan'
        ],
        correctIndex: 0,
        difficulty: 'easy',
        explanation: 'Kalorimeter adalah alat yang digunakan untuk mengukur jumlah kalor yang diserap atau dilepaskan dalam suatu reaksi kimia.'
      },
      {
        question: 'Apa perbedaan utama antara kalorimeter kopi dan kalorimeter bom?',
        options: [
          'Kalorimeter kopi untuk reaksi dalam larutan, kalorimeter bom untuk reaksi pembakaran',
          'Kalorimeter kopi lebih mahal dari kalorimeter bom',
          'Kalorimeter bom digunakan untuk zat cair, kalorimeter kopi untuk gas',
          'Tidak ada perbedaan prinsip kerja'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Kalorimeter kopi (coffee cup) digunakan untuk reaksi dalam larutan pada tekanan tetap, sedangkan kalorimeter bom digunakan untuk reaksi pembakaran pada volume tetap.'
      },
      {
        question: 'Apa yang dimaksud dengan perubahan entalpi (ΔH)?',
        options: [
          'Jumlah kalor yang diserap atau dilepaskan pada tekanan tetap',
          'Suhu akhir reaksi kimia',
          'Kecepatan suatu reaksi kimia',
          'Massa zat hasil reaksi'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Perubahan entalpi (ΔH) adalah jumlah energi kalor yang diserap atau dilepaskan dalam suatu reaksi kimia yang berlangsung pada tekanan tetap.'
      },
      {
        question: 'Jika suatu reaksi memiliki ΔH negatif, reaksi tersebut bersifat...',
        options: [
          'Eksoterm (melepaskan kalor ke lingkungan)',
          'Endoterm (menyerap kalor dari lingkungan)',
          'Netral (tidak ada perubahan kalor)',
          'Tidak dapat ditentukan'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Reaksi eksoterm melepaskan kalor ke lingkungan, sehingga entalpi produk lebih rendah dari reaktan, menghasilkan ΔH negatif.'
      },
      {
        question: 'Rumus untuk menghitung kalor reaksi adalah...',
        options: [
          'q = m × c × ΔT',
          'q = m × c + ΔT',
          'q = m / (c × ΔT)',
          'q = m + c + ΔT'
        ],
        correctIndex: 0,
        difficulty: 'hard',
        explanation: 'Kalor dihitung dengan rumus q = m × c × ΔT, di mana m = massa, c = kalor jenis, dan ΔT = perubahan suhu.'
      },
      {
        question: 'Manakah yang merupakan contoh reaksi endoterm?',
        options: [
          'Fotosintesis pada tumbuhan',
          'Pembakaran kayu',
          'Pembakaran bensin dalam mesin',
          'Reaksi netralisasi asam-basa'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Fotosintesis memerlukan energi cahaya matahari untuk mengubah CO2 dan H2O menjadi glukosa, sehingga merupakan reaksi endoterm.'
      },
      {
        question: 'Satuan SI untuk kalor adalah...',
        options: [
          'Joule (J)',
          'Watt (W)',
          'Newton (N)',
          'Pascal (Pa)'
        ],
        correctIndex: 0,
        difficulty: 'easy',
        explanation: 'Joule (J) adalah satuan SI untuk energi dan kalor. 1 kalori setara dengan 4,184 Joule.'
      },
      {
        question: 'Apa yang terjadi pada suhu dalam kalorimeter ketika reaksi eksoterm berlangsung?',
        options: [
          'Suhu air di kalorimeter meningkat',
          'Suhu air di kalorimeter menurun',
          'Suhu air tetap konstan',
          'Suhu air tidak dapat diukur'
        ],
        correctIndex: 0,
        difficulty: 'easy',
        explanation: 'Pada reaksi eksoterm, kalor dilepaskan dan diserap oleh air di kalorimeter, menyebabkan suhu air meningkat.'
      }
    ]
  },
  {
    materialId: '1126855c-e24e-4408-9c2c-7381d4869884',
    subject: 'Bahasa Inggris Tingkat Lanjut',
    topic: 'Pengantar Bahasa Inggris Tingkat Lanjut',
    questions: [
      {
        question: 'What is the main purpose of Advanced English study?',
        options: [
          'To develop complex communication skills for academic and professional contexts',
          'To learn the English alphabet',
          'To memorize basic vocabulary only',
          'To learn children stories'
        ],
        correctIndex: 0,
        difficulty: 'easy',
        explanation: 'Advanced English focuses on developing communication skills needed for academic studies, professional work, and complex social interactions.'
      },
      {
        question: 'Which type of text is commonly studied in Advanced English?',
        options: [
          'Scientific articles, essays, and academic papers',
          'Children fairy tales only',
          'Shopping lists',
          'Comic books'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Advanced English involves reading and analyzing scientific articles, academic essays, research papers, and other complex texts.'
      },
      {
        question: 'What characterizes a complex sentence structure?',
        options: [
          'It contains multiple clauses with subordinating conjunctions',
          'It consists of only three words',
          'It has no verb',
          'It uses only simple present tense'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Complex sentences use subordinate clauses connected by conjunctions like "although", "because", "which" to express more sophisticated ideas.'
      },
      {
        question: 'Which situation requires formal English communication?',
        options: [
          'A business presentation',
          'A chat with close friends',
          'A text message to family',
          'A comment on social media'
        ],
        correctIndex: 0,
        difficulty: 'easy',
        explanation: 'Business presentations, academic lectures, and official meetings require formal English with proper structure and professional vocabulary.'
      },
      {
        question: 'What does "academic vocabulary" refer to?',
        options: [
          'Words commonly used in textbooks, research, and scholarly contexts',
          'Slang words used by teenagers',
          'Everyday conversational words',
          'Words found only in dictionaries'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Academic vocabulary consists of words frequently used in educational and research settings, such as "analyze", "hypothesis", "methodology".'
      },
      {
        question: 'What is the purpose of writing an essay in Advanced English?',
        options: [
          'To present structured arguments and analysis on a topic',
          'To list daily activities',
          'To write a short story for entertainment',
          'To fill empty time in class'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Essays allow students to develop and present well-structured arguments, analysis, and critical thinking about a specific topic.'
      },
      {
        question: 'Which skill is NOT part of Advanced English learning?',
        options: [
          'Memorizing the alphabet repeatedly',
          'Critical reading of complex texts',
          'Writing well-structured essays',
          'Delivering formal presentations'
        ],
        correctIndex: 0,
        difficulty: 'easy',
        explanation: 'Memorizing the alphabet is a beginner-level skill, not part of Advanced English which focuses on higher-order language skills.'
      },
      {
        question: 'Why is discussion skill important in Advanced English?',
        options: [
          'To express and defend opinions in academic and professional settings',
          'To order food at a restaurant',
          'To ask for directions',
          'To greet someone'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Discussion skills enable students to articulate, defend, and refine their ideas in academic seminars, business meetings, and professional settings.'
      }
    ]
  },
  {
    materialId: 'b3464210-831e-49c2-854c-561105d14af5',
    subject: 'Matematika Tingkat Lanjut',
    topic: 'Pengantar Matematika Tingkat Lanjut',
    questions: [
      {
        question: 'Apa yang dimaksud dengan limit dalam kalkulus?',
        options: [
          'Nilai yang didekati suatu fungsi ketika variabel mendekati suatu titik tertentu',
          'Nilai maksimum dari suatu fungsi',
          'Jumlah semua nilai fungsi dalam suatu interval',
          'Luas daerah di bawah kurva fungsi'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Limit adalah konsep yang menggambarkan nilai yang didekati suatu fungsi ketika variabelnya mendekati titik tertentu, baik dari kiri maupun kanan.'
      },
      {
        question: 'Bentuk umum persamaan kuadrat adalah...',
        options: [
          'ax² + bx + c = 0, dengan a ≠ 0',
          'ax + b = 0',
          'ax³ + bx² + cx + d = 0',
          'a + b = c'
        ],
        correctIndex: 0,
        difficulty: 'easy',
        explanation: 'Persamaan kuadrat memiliki bentuk umum ax² + bx + c = 0, di mana a, b, c adalah konstanta dan a ≠ 0, dengan pangkat tertinggi variabel adalah 2.'
      },
      {
        question: 'Fungsi dalam matematika digunakan untuk...',
        options: [
          'Menggambarkan hubungan antara satu variabel dengan variabel lainnya',
          'Menghitung luas bangun datar saja',
          'Menentukan umur seseorang',
          'Mengukur berat benda'
        ],
        correctIndex: 0,
        difficulty: 'easy',
        explanation: 'Fungsi menggambarkan hubungan antara dua himpunan, di mana setiap elemen di daerah asal dipetakan ke tepat satu elemen di daerah kawan.'
      },
      {
        question: 'Apa penerapan trigonometri dalam kehidupan nyata?',
        options: [
          'Menghitung tinggi bangunan dan jarak antar objek',
          'Menghitung uang belanja',
          'Membuat grafik batang sederhana',
          'Menentukan warna benda'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Trigonometri digunakan dalam navigasi, arsitektur, teknik sipil, astronomi, dan berbagai bidang lain untuk mengukur jarak dan sudut.'
      },
      {
        question: 'Apa yang dimaksud dengan turunan (derivative) dalam kalkulus?',
        options: [
          'Laju perubahan suatu fungsi terhadap perubahan variabelnya',
          'Nilai fungsi pada titik tertentu',
          'Jumlah luasan di bawah kurva',
          'Nilai minimum suatu fungsi'
        ],
        correctIndex: 0,
        difficulty: 'hard',
        explanation: 'Turunan mengukur seberapa cepat suatu fungsi berubah ketika variabelnya berubah, dikenal juga sebagai laju perubahan sesaat.'
      },
      {
        question: 'Manakah yang merupakan contoh penerapan limit dalam fisika?',
        options: [
          'Menghitung kecepatan sesaat suatu benda',
          'Menghitung luas persegi panjang',
          'Menjumlahkan dua bilangan',
          'Mengukur panjang meja'
        ],
        correctIndex: 0,
        difficulty: 'medium',
        explanation: 'Kecepatan sesaat diperoleh dari limit rasio perubahan jarak terhadap perubahan waktu ketika interval waktu mendekati nol.'
      },
      {
        question: 'Apa yang dimaksud dengan sistem persamaan linear?',
        options: [
          'Kumpulan persamaan linear yang diselesaikan secara bersamaan',
          'Satu persamaan dengan satu variabel',
          'Persamaan yang tidak memiliki solusi',
          'Persamaan dengan variabel berpangkat dua'
        ],
        correctIndex: 0,
        difficulty: 'easy',
        explanation: 'Sistem persamaan linear terdiri dari dua atau lebih persamaan linear yang harus dipenuhi oleh variabel-variabel yang sama secara bersamaan.'
      },
      {
        question: 'Mengapa grafik fungsi penting dalam matematika?',
        options: [
          'Untuk memvisualisasikan perilaku dan sifat-sifat suatu fungsi',
          'Untuk menggambar pemandangan',
          'Untuk membuat pola dekorasi',
          'Untuk menulis catatan'
        ],
        correctIndex: 0,
        difficulty: 'easy',
        explanation: 'Grafik fungsi memungkinkan kita melihat secara visual bagaimana fungsi berperilaku, termasuk titik potong, titik puncak, dan kecenderungan fungsi.'
      }
    ]
  }
];

async function generateQuizzes() {
  await client.connect();
  console.log('Connected to database.\n');

  let successCount = 0;
  let failCount = 0;

  for (const quizData of quizzesData) {
    try {
      const maxScore = quizData.questions.length;
      
      const res = await client.query(
        `INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "timeLimit", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'QUIZ', $3::jsonb, $4, NULL, NOW(), NOW())
         RETURNING id`,
        [quizData.materialId, STUDENT_ID, JSON.stringify(quizData.questions), maxScore]
      );

      console.log(`✅ ${quizData.subject} - ${quizData.topic}: Quiz created (${quizData.questions.length} questions, id=${res.rows[0].id})`);
      successCount++;
    } catch (err) {
      console.error(`❌ ${quizData.subject} - ${quizData.topic}: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Quizzes created successfully: ${successCount}`);
  console.log(`Failures: ${failCount}`);
}

generateQuizzes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
