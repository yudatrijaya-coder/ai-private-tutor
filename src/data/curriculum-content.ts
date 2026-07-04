/**
 * Curriculum Content Bank — rich Indonesian-language educational content
 *
 * Maps each {subject, topic, subTopic} to real pedagogical content (300-500 words)
 * written in Indonesian, aligned with Kurikulum Merdeka.
 *
 * Content is KEYED by `${subject}||${topic}||${subTopic}` for fast lookup.
 *
 * @module @/data/curriculum-content
 */

export interface CurriculumContent {
  subject: string;
  topic: string;
  subTopic: string;
  content: string;
}

// ---------------------------------------------------------------------------
//  Helper: build a lookup key
// ---------------------------------------------------------------------------
export function contentKey(
  subject: string,
  topic: string,
  subTopic: string,
): string {
  return `${subject}||${topic}||${subTopic}`;
}

// ---------------------------------------------------------------------------
// Content bank — rich, grade-appropriate Indonesian lessons
// ---------------------------------------------------------------------------

const CONTENT_MAP: Record<string, string> = {
  // ═══════════════════════════════════════════════════════════════════════════
  //  SD/5 — WEEK 1
  // ═══════════════════════════════════════════════════════════════════════════

  [contentKey('Matematika', 'Pecahan', 'Mengenal Pecahan')]: `Pecahan adalah bilangan yang menyatakan bagian dari suatu keseluruhan. Dalam kehidupan sehari-hari, kita sering menemukan pecahan. Misalnya, ketika ibu memotong kue menjadi 8 bagian sama besar dan kamu mendapat 1 bagian, maka bagianmu adalah 1/8 dari seluruh kue.

Bentuk umum pecahan adalah a/b, di mana:
• a disebut PEMBILANG — bilangan yang menunjukkan berapa bagian yang diambil
• b disebut PENYEBUT — bilangan yang menunjukkan jumlah total bagian yang sama besar

Contoh: Pada pecahan 3/5, angka 3 adalah pembilang dan angka 5 adalah penyebut. Artinya, sesuatu dibagi menjadi 5 bagian sama besar, dan kita mengambil 3 bagian darinya.

Jenis-jenis pecahan:
1) Pecahan biasa — pembilang lebih kecil dari penyebut (1/2, 3/4, 2/5)
2) Pecahan campuran — terdiri dari bilangan bulat dan pecahan biasa (1 1/2, 2 3/4)
3) Pecahan desimal — pecahan dalam bentuk bilangan desimal (0,5; 0,75; 0,25)
4) Pecahan senilai — pecahan yang nilainya sama meskipun angka pembilang dan penyebutnya berbeda. Contoh: 1/2 = 2/4 = 3/6

Cara menentukan pecahan senilai: kalikan pembilang dan penyebut dengan bilangan yang sama. Misalnya: 1/2 × 2/2 = 2/4, 1/2 × 3/3 = 3/6.

Sekarang coba bayangkan: Jika sebuah pizza dipotong menjadi 6 bagian dan kamu makan 2 bagian, berapa pecahan pizza yang kamu makan? Ya, 2/6 atau bisa disederhanakan menjadi 1/3.`,

  [contentKey('Matematika', 'Pecahan', 'Penjumlahan Pecahan')]: `Penjumlahan pecahan adalah operasi menggabungkan dua atau lebih pecahan. Ada dua situasi yang perlu diperhatikan: pecahan dengan penyebut sama dan pecahan dengan penyebut berbeda.

A. PENJUMLAHAN PECAHAN BERPENYEBUT SAMA
Jika penyebutnya sama, kita cukup menjumlahkan pembilangnya saja. Penyebutnya tetap sama.
Contoh: 2/5 + 1/5 = (2 + 1)/5 = 3/5
Contoh: 3/8 + 2/8 = (3 + 2)/8 = 5/8

B. PENJUMLAHAN PECAHAN BERPENYEBUT BERBEDA
Langkah-langkah:
1) Samakan penyebut dengan mencari KPK (Kelipatan Persekutuan Terkecil) dari kedua penyebut
2) Ubah setiap pecahan menjadi pecahan senilai dengan penyebut baru
3) Jumlahkan pembilangnya

Contoh: 1/3 + 1/4 = ?
• KPK dari 3 dan 4 adalah 12
• 1/3 = (1 × 4)/(3 × 4) = 4/12
• 1/4 = (1 × 3)/(4 × 3) = 3/12
• Maka 4/12 + 3/12 = 7/12

C. PENJUMLAHAN PECAHAN CAMPURAN
Untuk pecahan campuran, jumlahkan bilangan bulatnya terlebih dahulu, lalu jumlahkan pecahannya.
Contoh: 2 1/3 + 1 1/4 = (2 + 1) + (1/3 + 1/4) = 3 + (4/12 + 3/12) = 3 + 7/12 = 3 7/12

Tips penting: Selalu sederhanakan hasil penjumlahan jika bisa. Misalnya 4/6 bisa disederhanakan menjadi 2/3 dengan membagi pembilang dan penyebut dengan 2 (FPB-nya).`,

  [contentKey('Bahasa Indonesia', 'Membaca Pemahaman', 'Ide Pokok')]: `Ide pokok adalah gagasan utama yang menjadi dasar pengembangan sebuah paragraf. Ide pokok merupakan inti atau pokok permasalahan yang ingin disampaikan oleh penulis dalam sebuah paragraf.

CIRI-CIRI IDE POKOK:
• Merupakan inti dari seluruh isi paragraf
• Dinyatakan dalam satu kalimat utama
• Didukung oleh kalimat-kalimat penjelas
• Bersifat umum, kemudian dijelaskan lebih rinci oleh kalimat penjelas

LETAK IDE POKOK DALAM PARAGRAF:

1) Paragraf DEDUKTIF — ide pokok di awal paragraf
Contoh: "Belajar secara teratur sangat penting untuk meraih prestasi. Dengan belajar setiap hari, materi pelajaran lebih mudah dipahami. Selain itu, belajar teratur juga mengurangi stres saat menghadapi ujian." — Ide pokok: Belajar secara teratur sangat penting.

2) Paragraf INDUKTIF — ide pokok di akhir paragraf
Contoh: "Andi rajin membaca buku setiap hari. Ia juga aktif bertanya kepada guru. Nilai-nilainya selalu memuaskan. Oleh karena itu, Andi adalah siswa teladan." — Ide pokok: Andi adalah siswa teladan.

3) Paragraf CAMPURAN — ide pokok di awal dan ditegaskan kembali di akhir
Contoh: "Olahraga membuat tubuh sehat. Olahraga melancarkan peredaran darah dan memperkuat otot. Jantung pun bekerja lebih optimal. Jadi, olahraga sangat baik untuk kesehatan." — Ide pokok: Olahraga membuat tubuh sehat.

Langkah menemukan ide pokok:
1) Bacalah paragraf dengan saksama
2) Tentukan kalimat utama (kalimat yang paling umum/pokok)
3) Perhatikan kalimat pertama dan terakhir paragraf
4) Tanyakan: "Apa yang sedang dibicarakan dalam paragraf ini?"

Latihan: Bacalah paragraf berikut dan temukan ide pokoknya!
"Kebersihan lingkungan sekolah adalah tanggung jawab semua warga sekolah. Guru, siswa, dan karyawan harus bekerja sama menjaga kebersihan. Setiap kelas memiliki jadwal piket harian. Halaman sekolah juga dibersihkan secara rutin."

Ide pokok paragraf tersebut adalah: Kebersihan lingkungan sekolah adalah tanggung jawab semua warga sekolah.`,

  [contentKey('IPA', 'Sistem Pencernaan', 'Organ Pencernaan')]: `Sistem pencernaan manusia adalah serangkaian organ yang bekerja sama untuk memecah makanan menjadi zat-zat gizi yang dapat diserap oleh tubuh. Tanpa sistem pencernaan, tubuh tidak bisa mendapatkan energi dan nutrisi dari makanan yang kita makan.

Organ-organ pencernaan manusia dari awal hingga akhir:

1) MULUT — Di dalam mulut, pencernaan terjadi secara MEKANIK (digigit dan dikunyah oleh gigi) dan KIMIAWI (enzim amilase dalam air liur memecah karbohidrat menjadi gula sederhana). Gigi terdiri dari gigi seri (memotong), gigi taring (merobek), dan gigi geraham (mengunyah).

2) KERONGKONGAN (ESOFAGUS) — Saluran sepanjang sekitar 25 cm yang menghubungkan mulut ke lambung. Otot-otot kerongkongan melakukan gerak PERISTALTIK (gerakan meremas) untuk mendorong makanan menuju lambung.

3) LAMBUNG — Organ berbentuk seperti kantong yang menghasilkan ASAM LAMBUNG (HCl) dan enzim PEPSIN. Asam lambung membunuh kuman dalam makanan, sedangkan pepsin mulai mencerna protein. Makanan tinggal di lambung selama 2-4 jam.

4) USUS HALUS — Tempat utama pencernaan dan penyerapan zat gizi. Panjangnya sekitar 6-7 meter. Terdiri dari tiga bagian: duodenum (usus 12 jari), jejunum (usus kosong), dan ileum (usus penyerapan). Dinding usus halus memiliki VILI (jonjot-jonjot kecil) yang memperluas permukaan penyerapan.

5) USUS BESAR (KOLON) — Panjang sekitar 1,5 meter. Berfungsi menyerap air dan mineral dari sisa makanan, serta membentuk feses (tinja). Di dalam usus besar terdapat bakteri baik yang membantu proses pembusukan sisa makanan dan menghasilkan vitamin K.

6) ANUS — Lubang tempat dikeluarkannya feses dari tubuh. Sebelum dikeluarkan, feses ditampung sementara di rektum.

Gangguan pada sistem pencernaan: maag (radang lambung), diare (infeksi usus), sembelit (kesulitan buang air besar), dan usus buntu (radang apendiks).`,

  [contentKey('IPS', 'Kerajaan Nusantara', 'Kerajaan Hindu-Buddha')]: `Kerajaan-kerajaan Hindu-Buddha berkembang pesat di Nusantara dari abad ke-4 hingga abad ke-15 Masehi. Masuknya pengaruh Hindu-Buddha ke Indonesia dibawa oleh para pedagang dari India. Ada beberapa teori tentang masuknya agama Hindu-Buddha, yaitu teori Brahmana (oleh para pendeta), teori Ksatria (oleh para prajurit), teori Waisya (oleh para pedagang), dan teori Arus Balik (masyarakat Indonesia belajar ke India lalu menyebarkannya).

Beberapa kerajaan Hindu-Buddha penting di Indonesia:

KERAJAAN KUTAI (abad ke-4 M)
Kerajaan Hindu tertua di Indonesia, terletak di Kalimantan Timur. Sumber sejarahnya adalah prasasti Yupa (tiang batu) yang ditemukan di tepi Sungai Mahakam. Raja pertama adalah Kudungga, kemudian digantikan oleh Aswawarman dan Mulawarman. Prasasti Yupa menceritakan tentang upacara persembahan 20.000 ekor sapi oleh Raja Mulawarman. Kutai mencapai puncak kejayaan pada masa Raja Mulawarman.

KERAJAAN SRIWIJAYA (abad ke-7 hingga ke-13 M)
Kerajaan Buddha terbesar di Nusantara yang berpusat di Palembang, Sumatera Selatan. Sriwijaya menguasai jalur perdagangan Selat Malaka dan menjadi pusat pembelajaran agama Buddha. Banyak pendeta dari China dan India datang ke Sriwijaya untuk belajar. Raja terkenal adalah Balaputradewa. Peninggalan penting: Prasasti Kedukan Bukit, Prasasti Talang Tuo, dan Candi Muara Takus.

KERAJAAN MAJAPAHIT (abad ke-13 hingga ke-15 M)
Kerajaan Hindu terbesar di Indonesia yang mencapai puncak kejayaan pada masa pemerintahan Raja Hayam Wuruk (1350-1389) dengan Patih Gajah Mada. Gajah Mada terkenal dengan Sumpah Palapa: "Jika Nusantara sudah bersatu, saya baru akan berhenti berpuasa (menikmati kenikmatan duniawi)." Majapahit menguasai hampir seluruh wilayah Indonesia dan sebagian Asia Tenggara. Peninggalan: Candi Penataran, Candi Tikus, dan Kitab Negarakertagama karya Mpu Prapanca.

Peninggalan kerajaan Hindu-Buddha lainnya meliputi Candi Borobudur (Buddha, Magelang), Candi Prambanan (Hindu, Yogyakarta), dan candi-candi di Jawa Timur seperti Candi Singasari dan Candi Jago.`,

  [contentKey('PPKn', 'Pancasila', 'Nilai-Nilai Pancasila')]: `Pancasila adalah dasar negara Republik Indonesia. Kata Pancasila berasal dari bahasa Sansekerta: "panca" artinya lima, dan "sila" artinya dasar atau asas. Jadi Pancasila berarti lima dasar negara. Pancasila dirumuskan oleh para pendiri bangsa dan disahkan pada tanggal 18 Agustus 1945.

Bunyi Pancasila:
1. Ketuhanan Yang Maha Esa
2. Kemanusiaan yang Adil dan Beradab
3. Persatuan Indonesia
4. Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan dalam Permusyawaratan/Perwakilan
5. Keadilan Sosial bagi Seluruh Rakyat Indonesia

NILAI-NILAI PANCASILA DALAM KEHIDUPAN SEHARI-HARI:

Sila 1 — Ketuhanan: Menghormati teman yang berbeda agama, beribadah sesuai keyakinan, tidak memaksakan agama kepada orang lain. Di sekolah: berdoa sebelum belajar, mengikuti kegiatan keagamaan.

Sila 2 — Kemanusiaan: Bersikap adil kepada semua teman, tidak membeda-bedakan suku/ras, menolong teman yang kesusahan. Di sekolah: membantu teman yang belum paham pelajaran, tidak mengejek teman.

Sila 3 — Persatuan: Bangga sebagai bangsa Indonesia, menggunakan produk dalam negeri, menjaga kerukunan. Di sekolah: mengikuti upacara bendera, bekerja sama dalam piket kelas, mencintai budaya daerah.

Sila 4 — Kerakyatan: Mengutamakan musyawarah untuk mengambil keputusan, menghargai pendapat orang lain, tidak memaksakan kehendak. Di sekolah: musyawarah membagi tugas kelompok, voting memilih ketua kelas.

Sila 5 — Keadilan: Bersikap adil, tidak pilih kasih, menghormati hak orang lain. Di sekolah: mendapat giliran yang sama dalam piket, berbagi bekal dengan teman.

Pancasila bukan hanya dihafal, tetapi harus diamalkan dalam kehidupan sehari-hari. Dengan mengamalkan Pancasila, kita menjadi warga negara yang baik.`,

  // ═══════════════════════════════════════════════════════════════════════════
  //  SD/5 — WEEK 2
  // ═══════════════════════════════════════════════════════════════════════════

  [contentKey('Bahasa Indonesia', 'Membaca Pemahaman', 'Kesimpulan')]: `Kesimpulan adalah intisari atau ringkasan dari suatu bacaan atau pembicaraan. Kesimpulan berisi gagasan utama yang diambil dari keseluruhan isi teks. Kemampuan menarik kesimpulan sangat penting karena membantu kita memahami dan mengingat isi bacaan dengan lebih baik.

CIRI-CIRI KESIMPULAN YANG BAIK:
• Merupakan inti dari keseluruhan bacaan
• Disusun dengan bahasa yang singkat, jelas, dan padat
• Mengandung informasi penting yang mewakili isi bacaan
• Tidak menambahkan opini pribadi atau informasi baru yang tidak ada dalam bacaan
• Disusun berdasarkan fakta yang ada dalam teks

LANGKAH-LANGKAH MENARIK KESIMPULAN:
1) Bacalah teks dengan saksama dan pahami isinya
2) Temukan ide pokok dari setiap paragraf
3) Catat informasi-informasi penting
4) Hubungkan ide pokok antaragraf untuk mendapatkan gambaran utuh
5) Tulis kesimpulan dengan bahasa sendiri yang singkat dan jelas

Perbedaan Ide Pokok dan Kesimpulan:
• Ide pokok: gagasan utama dalam SATU paragraf
• Kesimpulan: intisari dari SELURUH bacaan (bisa terdiri dari beberapa paragraf)

Contoh teks:
"Kucing adalah hewan peliharaan yang populer. Kucing memiliki bulu yang lembut dan mata yang indah. Kucing juga pandai menangkap tikus. Oleh karena itu, banyak orang memelihara kucing di rumah."

Kesimpulan: Kucing adalah hewan peliharaan populer karena memiliki bulu lembut, mata indah, dan pandai menangkap tikus.

Kata-kata yang sering digunakan dalam kesimpulan: jadi, oleh karena itu, dengan demikian, berdasarkan uraian di atas, dapat disimpulkan bahwa.`,

  [contentKey('IPA', 'Sistem Pencernaan', 'Proses Pencernaan')]: `Proses pencernaan adalah rangkaian tahapan yang dialami makanan sejak masuk ke mulut hingga dikeluarkan dari tubuh. Mari kita ikuti perjalanan makanan melalui tubuh manusia!

TAHAP 1: PENCERNAAN DI MULUT
Makanan masuk ke mulut dan dikunyah oleh gigi. Gigi seri memotong makanan, gigi taring merobek, dan gigi geraham mengunyah hingga halus. Air liur (saliva) mengandung enzim AMILASE yang mulai memecah karbohidrat (nasi, roti) menjadi gula sederhana (maltosa). Lidah membantu mengaduk dan mendorong makanan ke kerongkongan. Proses menelan makanan disebut DEGLUTISI.

TAHAP 2: PERJALANAN MELALUI KERONGKONGAN
Makanan yang sudah berbentuk bolus (gumpalan lunak) masuk ke kerongkongan. Di sini terjadi gerak PERISTALTIK, yaitu gerakan seperti meremas yang mendorong makanan menuju lambung. Di ujung kerongkongan terdapat katot (sfingter) yang membuka dan menutup secara otomatis.

TAHAP 3: PENCERNAAN DI LAMBUNG
Di dalam lambung, makanan dicampur dengan GETAH LAMBUNG yang mengandung:
• Asam klorida (HCl) — membunuh kuman dan membuat suasana asam
• Enzim pepsin — mencerna protein menjadi pepton
• Enzim renin — menggumpalkan protein susu (pada bayi)

Lambung mengaduk-aduk makanan dengan gerakan memeras selama 2-4 jam. Hasilnya berupa bubur halus yang disebut KIMUS.

TAHAP 4: PENCERNAAN DAN PENYERAPAN DI USUS HALUS
Kimus masuk ke usus halus yang terdiri dari tiga bagian: usus 12 jari (duodenum), usus kosong (jejunum), dan usus penyerapan (ileum). Di sini terjadi proses paling penting:
• Pankreas menghasilkan enzim amilase (karbohidrat → gula), tripsin (protein → asam amino), dan lipase (lemak → asam lemak & gliserol)
• Hati menghasilkan EMPEDU yang mengemulsi lemak
• VILI usus menyerap nutrisi ke aliran darah

TAHAP 5: PENYERAPAN AIR DI USUS BESAR
Sisa makanan yang tidak tercerna masuk ke usus besar. Di sini air dan mineral diserap kembali. Bakteri Escherichia coli membantu membusukkan sisa makanan dan menghasilkan vitamin K. Sisa makanan yang mengeras disebut FESES.

TAHAP 6: PENGELUARAN
Feses ditampung di rektum dan dikeluarkan melalui anus dalam proses DEFEKASI (buang air besar).`,

  [contentKey('IPS', 'Kerajaan Nusantara', 'Kerajaan Islam')]: `Kerajaan-kerajaan Islam mulai berkembang di Nusantara sekitar abad ke-13 Masehi. Agama Islam masuk ke Indonesia melalui para pedagang dari Gujarat (India), Persia, dan Arab. Jalur perdagangan laut menjadi media utama penyebaran Islam. Beberapa teori masuknya Islam ke Indonesia: teori Gujarat (Islam dibawa pedagang Gujarat), teori Mekah (langsung dari Arab), dan teori Persia (dari para mubaligh Persia).

Berikut kerajaan-kerajaan Islam penting di Indonesia:

KERAJAAN SAMUDERA PASAI (abad ke-13 hingga ke-16 M)
Kerajaan Islam pertama di Indonesia, terletak di Aceh Utara. Raja pertama adalah Sultan Malik Al-Saleh (nama sebelumnya Merah Silu). Samudera Pasai menjadi pusat perdagangan dan penyebaran Islam di Asia Tenggara. Banyak ulama dari berbagai negara datang ke Pasai. Peninggalan: makam Sultan Malik Al-Saleh dan koin emas (dirham) sebagai alat pembayaran.

KESULTANAN ACEH (abad ke-16 hingga ke-19 M)
Aceh mencapai puncak kejayaan pada masa Sultan Iskandar Muda (1607-1636). Aceh memiliki armada laut yang kuat dan menguasai perdagangan lada. Sultan Iskandar Muda juga membangun Masjid Baiturrahman dan menulis kitab undang-undang. Aceh terkenal dengan perlawanannya terhadap penjajahan Belanda yang berlangsung selama puluhan tahun.

KESULTANAN DEMAK (abad ke-16 M)
Kerajaan Islam pertama di Jawa, didirikan oleh Raden Patah (putra Raja Majapahit). Demak berperan besar dalam penyebaran Islam di Jawa. Sunan Kalijaga, salah satu Wali Songo, menjadi penasihat kerajaan. Masjid Agung Demak menjadi pusat kegiatan dakwah. Demak dipimpin oleh Sultan Trenggono pada puncak kejayaannya.

KESULTANAN MATARAM ISLAM (abad ke-16 hingga ke-18 M)
Didirikan oleh Panembahan Senopati. Mencapai puncak kejayaan pada masa Sultan Agung Hanyokrokusumo (1613-1645). Sultan Agung menggabungkan kekuatan budaya Jawa dan Islam. Peninggalan: Masjid Agung Kotagede, Makam Raja Mataram di Imogiri.

KESULTANAN MAKASSAR (Gowa-Tallo, abad ke-16 hingga ke-17 M)
Kerajaan Islam di Sulawesi Selatan. Raja terkenal: Sultan Hasanuddin, yang dijuluki "Ayam Jantan dari Timur" karena keberaniannya melawan VOC.

Peninggalan kerajaan Islam: masjid-masjid kuno, makam wali, seni kaligrafi, tembang dan suluk, serta tradisi seperti sekaten dan grebeg.`,

  // ═══════════════════════════════════════════════════════════════════════════
  //  SMP/1 — WEEK 1
  // ═══════════════════════════════════════════════════════════════════════════

  [contentKey('Matematika', 'Aljabar', 'Bentuk Aljabar')]: `Aljabar adalah cabang matematika yang menggunakan huruf atau simbol untuk mewakili bilangan yang belum diketahui nilainya. Kata "aljabar" berasal dari bahasa Arab "al-jabr" yang artinya "penyembuhan" atau "penggabungan kembali". Aljabar ditemukan oleh ilmuwan Muslim bernama Al-Khawarizmi pada abad ke-9.

BENTUK ALJABAR terdiri dari:
• VARIABEL — lambang atau huruf yang mewakili bilangan yang belum diketahui (biasanya x, y, z)
• KOEFISIEN — bilangan yang menempel pada variabel (contoh: 3x → 3 adalah koefisien)
• KONSTANTA — bilangan yang tidak memiliki variabel (contoh: 3x + 5 → 5 adalah konstanta)
• SUKU — bagian dari bentuk aljabar yang dipisahkan oleh tanda + atau -

Contoh bentuk aljabar: 3x + 5
• 3 = koefisien
• x = variabel
• 5 = konstanta
• 3x dan 5 = dua suku

Jenis-jenis suku dalam aljabar:
1) Suku SEJENIS — suku yang memiliki variabel dan pangkat yang SAMA
   Contoh: 2x dan 5x (sama-sama variabel x pangkat 1)
   Contoh: 3y² dan 7y² (sama-sama variabel y pangkat 2)
2) Suku TIDAK SEJENIS — suku yang memiliki variabel atau pangkat yang BERBEDA
   Contoh: 2x dan 3y (variabel berbeda)
   Contoh: 4x² dan 2x (pangkat berbeda)

OPERASI DASAR BENTUK ALJABAR:
• Penjumlahan/Pengurangan: hanya suku SEJENIS yang bisa dijumlah/dikurang
   2x + 3x = 5x
   5x - 2x = 3x
   2x + 3y = 2x + 3y (tidak bisa dijumlah, berbeda variabel)
• Perkalian: kalikan koefisien dengan koefisien, variabel dengan variabel
   2x × 3 = 6x
   2x × 3y = 6xy
   2x × (x + 3) = 2x² + 6x

Penerapan aljabar dalam kehidupan sehari-hari: menghitung biaya belanja (harga × jumlah), menghitung jarak tempuh (kecepatan × waktu), dan menyelesaikan masalah jual beli.`,

  [contentKey('Matematika', 'Aljabar', 'Operasi Aljabar')]: `Operasi aljabar adalah cara melakukan perhitungan pada bentuk aljabar. Mari kita pelajari operasi-operasi yang sering digunakan.

A. PENJUMLAHAN DAN PENGURANGAN BENTUK ALJABAR
Hanya suku-suku SEJENIS yang dapat dijumlahkan atau dikurangkan.
Contoh:
(3x + 2y - 5) + (2x - 3y + 4) = 3x + 2x + 2y - 3y - 5 + 4 = 5x - y - 1
(5x² + 3x - 2) - (2x² - x + 4) = 5x² - 2x² + 3x + x - 2 - 4 = 3x² + 4x - 6

Tips: Kelompokkan suku sejenis terlebih dahulu sebelum menjumlahkan.

B. PERKALIAN BENTUK ALJABAR

1) Perkalian konstanta dengan bentuk aljabar:
   3(2x + 5) = 3 × 2x + 3 × 5 = 6x + 15

2) Perkalian variabel dengan bentuk aljabar:
   x(3x + 2) = x × 3x + x × 2 = 3x² + 2x

3) Perkalian dua bentuk aljabar (metode distributif):
   (x + 3)(x + 2) = x(x + 2) + 3(x + 2)
                     = x² + 2x + 3x + 6
                     = x² + 5x + 6

   (x + 3)(x - 2) = x(x - 2) + 3(x - 2)
                     = x² - 2x + 3x - 6
                     = x² + x - 6

Rumus penting:
• (a + b)² = a² + 2ab + b²
• (a - b)² = a² - 2ab + b²
• (a + b)(a - b) = a² - b²

C. PEMBAGIAN BENTUK ALJABAR
Jika variabelnya sama, kurangkan pangkatnya:
10x⁵ ÷ 2x² = 5x³

Contoh soal:
Sederhanakan: (2x + 5)(x - 3)
= 2x(x - 3) + 5(x - 3)
= 2x² - 6x + 5x - 15
= 2x² - x - 15

Selamat berlatih! Semakin sering berlatih, semakin mahir kamu dalam operasi aljabar.`,

  [contentKey('Bahasa Indonesia', 'Teks Deskripsi', 'Ciri Teks Deskripsi')]: `Teks deskripsi adalah teks yang menggambarkan suatu objek, tempat, atau peristiwa secara detail sehingga pembaca seolah-olah dapat melihat, mendengar, atau merasakan objek yang dideskripsikan. Tujuan teks deskripsi adalah membuat pembaca memiliki kesan atau gambaran yang jelas tentang sesuatu.

CIRI-CIRI UMUM TEKS DESKRIPSI:
• Menggambarkan sesuatu (benda, tempat, orang, suasana) secara detail
• Melibatkan pancaindra (penglihatan, pendengaran, penciuman, peraba, pengecap)
• Menggunakan kata-kata khusus (konkret) untuk memperjelas gambaran
• Banyak menggunakan kata sifat (adjektiva) seperti indah, besar, wangi, sejuk
• Menimbulkan kesan atau imaji pada pembaca

STRUKTUR TEKS DESKRIPSI:
1) IDENTIFIKASI — Bagian awal yang memperkenalkan objek yang akan dideskripsikan. Berisi nama, lokasi, atau gambaran umum objek.
2) DESKRIPSI — Bagian inti yang menggambarkan ciri-ciri objek secara detail. Biasanya terdiri dari beberapa paragraf yang masing-masing menggambarkan aspek berbeda.

KAIDAH KEBAHASAAN TEKS DESKRIPSI:
1) Menggunakan kata SINONIM (persamaan kata) untuk menghindari pengulangan
2) Menggunakan kata ANTONIM (lawan kata) untuk perbandingan
3) Menggunakan KALIMAT PERINCIAN untuk menjelaskan bagian-bagian objek — contoh: "Rumah itu memiliki tiga kamar tidur, dua kamar mandi, dan sebuah ruang tamu yang luas."
4) Menggunakan kata DEPAN yang menunjukkan tempat — seperti di, ke, dari
5) Banyak menggunakan kata sifat — seperti cantik, megah, hijau, harum

Contoh teks deskripsi:
"Pantai ini sungguh memesona. Pasir putihnya lembut di kaki. Air laut berwarna biru jernih dengan ombak kecil yang tenang. Di kejauhan, deretan pohon kelapa melambai-lambai ditiup angin. Udara segar bercampur aroma laut membuat siapa pun betah berlama-lama di sini."

Dalam contoh di atas, penulis menggunakan kata-kata yang melibatkan indra peraba (pasir lembut), penglihatan (biru jernih, pohon kelapa), penciuman (aroma laut), sehingga pembaca seolah ikut berada di pantai tersebut.`,

  [contentKey('Bahasa Inggris', 'Tenses', 'Simple Present')]: `Simple Present Tense is one of the most important tenses in English. It is used to express facts, habits, and general truths that happen regularly.

USAGES (PENGGUNAAN):
1) GENERAL TRUTHS (Fakta umum)
   • The sun rises in the east. (Matahari terbit di timur.)
   • Water boils at 100°C. (Air mendidih pada suhu 100°C.)

2) HABITS / ROUTINES (Kebiasaan rutin)
   • I go to school every day. (Saya pergi ke sekolah setiap hari.)
   • She always drinks milk before bed. (Dia selalu minum susu sebelum tidur.)

3) SCHEDULED EVENTS (Jadwal tetap)
   • The train leaves at 7 AM. (Kereta berangkat jam 7 pagi.)
   • The store opens at 8 o'clock. (Toko buka jam 8.)

FORMULA (RUMUS):

(+) POSITIVE: Subject + Verb 1 (s/es) + Object/Complement
   • I read books.
   • He reads books.
   • She reads books.
   • They read books.

(-) NEGATIVE: Subject + do/does + not + Verb 1 + Object
   • I do not (don't) read books.
   • She does not (doesn't) read books.
   • They do not (don't) read books.

(?) INTERROGATIVE: Do/Does + Subject + Verb 1 + Object?
   • Do you read books?
   • Does she read books?
   • Do they read books?

VERB ADDITIONAL RULES (Aturan penambahan s/es):
• Most verbs: add -s (read → reads, write → writes)
• Verbs ending in ch, sh, x, o, ss: add -es (teach → teaches, go → goes, fix → fixes)
• Verbs ending in consonant + y: change y to ies (study → studies, try → tries)
• Verbs ending in vowel + y: add -s (play → plays, buy → buys)

TIME SIGNALS (Kata keterangan waktu):
always (selalu), usually (biasanya), often (sering), sometimes (kadang-kadang), seldom (jarang), never (tidak pernah), every day (setiap hari), every week (setiap minggu).

Contoh kalimat dalam paragraf:
"Andi wakes up at 5 AM every day. He takes a shower and then prays. After that, he has breakfast with his family. Andi always goes to school by bicycle. He never comes late to school."

Artinya: Andi bangun jam 5 pagi setiap hari. Dia mandi lalu berdoa. Setelah itu, dia sarapan bersama keluarganya. Andi selalu pergi ke sekolah naik sepeda. Dia tidak pernah datang terlambat ke sekolah.`,

  [contentKey('IPA', 'Sistem Pernapasan', 'Organ Pernapasan Manusia')]: `Sistem pernapasan manusia berfungsi untuk memasukkan oksigen (O₂) ke dalam tubuh dan mengeluarkan karbon dioksida (CO₂) dari tubuh. Proses ini disebut RESPIRASI. Oksigen diperlukan sel-sel tubuh untuk menghasilkan energi melalui proses pembakaran (oksidasi) makanan.

ORGAN-ORGAN PERNAPASAN MANUSIA:

1) HIDUNG — Pintu masuk utama udara. Di dalam rongga hidung terdapat:
   • Rambut-rambut halus (silia) yang menyaring kotoran dan debu
   • Selaput lendir yang melembabkan dan menghangatkan udara
   • Pembuluh darah yang menghangatkan udara

2) FARING (tekak) — Saluran persimpangan antara rongga hidung dan rongga mulut. Faring menghubungkan hidung ke laring.

3) LARING (pangkal tenggorokan) — Terdapat pita suara yang menghasilkan suara saat bergetar. Laring dilindungi oleh KATUP EPIGLOTIS yang menutup saat menelan agar makanan tidak masuk ke saluran pernapasan.

4) TRAKEA (batang tenggorokan) — Pipa sepanjang sekitar 10-12 cm yang terdiri dari cincin tulang rawan. Dinding trakea dilapisi lendir dan rambut getar (silia) yang menangkap dan mendorong kotoran ke atas.

5) BRONKUS — Cabang trakea yang menuju paru-paru kanan dan kiri. Bronkus kanan lebih pendek dan lebar, bronkus kiri lebih panjang dan sempit.

6) BRONKIOLUS — Cabang-cabang kecil dari bronkus yang semakin mengecil seperti cabang pohon.

7) ALVEOLUS — Kantung udara kecil di ujung bronkiolus, tempat pertukaran gas terjadi. Alveolus sangat banyak (sekitar 300 juta) dan memiliki dinding tipis yang dikelilingi kapiler darah. Di sinilah oksigen berdifusi ke darah dan CO₂ berdifusi keluar.

MEKANISME PERNAPASAN:
• INSPIRASI (menghirup): Otot diafragma berkontraksi (mendatar), otot antar tulang rusuk mengangkat tulang rusuk → rongga dada membesar → tekanan udara turun → udara masuk.
• EKSPIRASI (menghembus): Otot diafragma relaksasi (menggembung), otot antar tulang rusuk menurunkan tulang rusuk → rongga dada mengecil → tekanan naik → udara keluar.

Volume udara pernapasan: udara tidal (500 ml), udara cadangan inspirasi (1500 ml), udara cadangan ekspirasi (1500 ml), dan udara residu (1000 ml).`,

  [contentKey('IPS', 'Kerajaan Hindu-Buddha', 'Kerajaan Kutai')]: `Kerajaan Kutai adalah kerajaan Hindu tertua di Indonesia. Kerajaan ini terletak di Muara Kaman, tepi Sungai Mahakam, Kalimantan Timur. Kutai diperkirakan berdiri pada abad ke-4 Masehi. Nama Kutai diambil dari nama daerah tempat kerajaan ini berada.

SUMBER SEJARAH
Sumber utama sejarah Kerajaan Kutai adalah PRASASTI YUPA. Yupa adalah tiang batu yang digunakan untuk mengikat hewan kurban dalam upacara keagamaan. Prasasti Yupa ditemukan di daerah Muara Kaman dan ditulis menggunakan huruf Pallawa (dari India Selatan) dengan bahasa Sansekerta. Ada tujuh buah prasasti Yupa yang ditemukan.

RAJA-RAJA KUTAI:
1) KUDUNGGA — Raja pertama Kerajaan Kutai. Nama Kudungga masih terdengar seperti nama asli Indonesia (nama non-Hindu), menunjukkan bahwa awalnya Kutai belum bercorak Hindu. Setelah mendapat pengaruh Hindu, ia digantikan oleh putranya yang sudah memakai nama Hindu.

2) ASWAWARMAN — Putra Kudungga yang menjadi raja kedua. Ia disebut sebagai "wangshakarta" yang berarti pembangun keluarga (raja pertama yang mendirikan dinasti). Aswawarman memiliki tiga orang putra, salah satunya adalah Mulawarman.

3) MULAWARMAN — Raja terbesar Kutai yang memerintah dengan adil dan bijaksana. Prasasti Yupa menceritakan bahwa Raja Mulawarman melakukan upacara persembahan (Yadnya) dengan memberikan 20.000 ekor sapi kepada para brahmana (pendeta Hindu). Nama Mulawarman khusus disebut berkali-kali dalam prasasti, menunjukkan perannya yang sangat penting.

KEHIDUPAN SOSIAL DAN BUDAYA:
• Agama yang dianut adalah Hindu aliran Siwa
• Masyarakat hidup dengan bertani dan berdagang
• Sungai Mahakam menjadi jalur transportasi utama
• Pemerintahan dijalankan secara turun-temurun

PENINGGALAN:
• Prasasti Yupa (7 buah) — bukti tertulis tertua di Indonesia
• Kalung Ciwa (ditemukan di daerah Kutai)
• Arca-arca Hindu sederhana

Kerajaan Kutai mengalami kemunduran sekitar abad ke-6 M karena tidak diketahui secara pasti. Namun, prasasti Yupa tetap menjadi bukti berharga bahwa Indonesia telah memiliki peradaban maju sejak abad ke-4 M.`,

  // ═══════════════════════════════════════════════════════════════════════════
  //  SMP/1 — WEEK 2
  // ═══════════════════════════════════════════════════════════════════════════

  [contentKey('Bahasa Indonesia', 'Teks Narasi', 'Struktur Narasi')]: `Teks narasi adalah teks yang menceritakan suatu peristiwa atau kejadian secara kronologis (berurutan). Tujuan teks narasi adalah menghibur pembaca dan menyampaikan pesan moral. Cerita rakyat, dongeng, novel, cerpen, dan biografi termasuk jenis teks narasi.

STRUKTUR TEKS NARASI:
1) ORIENTASI — Bagian awal yang memperkenalkan tokoh, latar tempat, latar waktu, dan suasana cerita. Orientasi membantu pembaca memahami siapa, kapan, dan di mana cerita berlangsung.
2) KOMPLIKASI — Bagian yang berisi munculnya masalah, konflik, atau pertentangan. Inilah yang membuat cerita menarik. Konflik bisa terjadi antar tokoh, batin tokoh, atau dengan alam.
3) RESOLUSI — Bagian penyelesaian masalah. Konflik mulai terpecahkan. Resolusi bisa bahagia (happy ending) atau sedih (sad ending).
4) KODA (opsional) — Bagian penutup yang berisi pesan moral atau amanat dari cerita. Tidak semua teks narasi memiliki koda.

CIRI KEBAHASAAN TEKS NARASI:
• Menggunakan kata kerja aksi (verba material): berlari, memukul, menangis
• Menggunakan kata kerja yang menunjukkan peristiwa: terjadi, bermula
• Menggunakan kata hubung kronologis (konjungsi temporal): kemudian, lalu, setelah itu, akhirnya, pada suatu hari
• Menggunakan kata ganti orang (pronomina): ia, dia, mereka, kami
• Sering menggunakan dialog atau percakapan
• Menggunakan kata keterangan waktu: pagi hari, keesokan harinya, sudah lama

Contoh teks narasi sederhana:

"Pada suatu hari, Kancil berjalan-jalan di hutan (ORIENTASI). Tiba-tiba, ia terjatuh ke dalam lubang jebakan pemburu. Kancil mencoba memanjat dinding lubang, tetapi selalu terjatuh kembali (KOMPLIKASI). Beruntung, Kancil yang cerdik melihat gajah lewat dan memanggilnya. Gajah membantu mengangkat Kancil dengan belalainya. Kancil pun selamat dari lubang itu (RESOLUSI). Ia berjanji tidak akan ceroboh lagi. Kebaikan hati selalu berbuah kebaikan (KODA)."

Perbedaan teks narasi dan teks deskripsi: narasi menceritakan rangkaian peristiwa secara berurutan, sedangkan deskripsi menggambarkan sesuatu secara detail.`,

  [contentKey('Bahasa Inggris', 'Tenses', 'Present Continuous')]: `Present Continuous Tense (juga disebut Present Progressive) digunakan untuk menyatakan kejadian yang sedang berlangsung saat ini atau rencana di masa depan yang sudah pasti.

USAGES (PENGGUNAAN):
1) ACTIONS IN PROGRESS NOW — Aksi yang sedang terjadi sekarang
   • I am studying English right now. (Saya sedang belajar Inggris sekarang.)
   • She is reading a book at the moment. (Dia sedang membaca buku saat ini.)

2) TEMPORARY ACTIONS — Aksi sementara (belum tentu selalu dilakukan)
   • He is living with his uncle this month. (Dia tinggal bersama pamannya bulan ini.)
   • They are working on a project this week. (Mereka sedang mengerjakan proyek minggu ini.)

3) FUTURE PLANS — Rencana yang sudah pasti (sudah diatur)
   • I am meeting my friend tomorrow. (Saya akan bertemu temanku besok.)
   • She is flying to Bali next week. (Dia akan terbang ke Bali minggu depan.)

FORMULA (RUMUS):

(+) POSITIVE: Subject + is/am/are + Verb-ing + Object
   • I am studying.
   • She is studying.
   • They are studying.

(-) NEGATIVE: Subject + is/am/are + not + Verb-ing
   • I am not (ain't) sleeping.
   • She is not (isn't) sleeping.
   • They are not (aren't) sleeping.

(?) INTERROGATIVE: Is/Am/Are + Subject + Verb-ing?
   • Are you studying?
   • Is she sleeping?
   • Are they coming?

VERB-ing RULES (Aturan penambahan -ing):
• Most verbs: add -ing (read → reading, study → studying)
• Verbs ending in e: drop the e, add -ing (write → writing, come → coming)
• Verbs ending in CVC (consonant-vowel-consonant) with ONE syllable: double last consonant, add -ing (run → running, sit → sitting, swim → swimming)
• Verbs ending in ie: change to y + ing (die → dying, lie → lying)

TIME SIGNALS (Kata keterangan waktu):
now (sekarang), right now (saat ini), at the moment (saat ini), currently (saat ini), today (hari ini), this week (minggu ini), tonight (malam ini), tomorrow (besok).

Perbedaan Simple Present vs Present Continuous:
Simple Present: "She reads books every day." (kebiasaan umum)
Present Continuous: "She is reading a book now." (sedang berlangsung)

Contoh paragraf:
"Right now, I am sitting in my classroom. My teacher is explaining a new lesson. My friends are listening carefully. Usually, we study English on Mondays, but today we are studying something special. I always pay attention in class because I want to learn."`,

  [contentKey('IPA', 'Sistem Pernapasan', 'Gangguan Pernapasan')]: `Gangguan pernapasan adalah berbagai kondisi yang mengganggu proses masuknya oksigen dan keluarnya karbon dioksida dari tubuh. Gangguan ini bisa disebabkan oleh infeksi, polusi udara, kebiasaan buruk, atau kelainan bawaan.

BERIKUT BERBAGAI GANGGUAN PADA SISTEM PERNAPASAN:

1) INFLUENZA (FLU) — Infeksi virus pada saluran pernapasan bagian atas. Gejala: demam, pilek, batuk, sakit tenggorokan. Dapat sembuh sendiri dengan istirahat dan minum banyak air.

2) ASMA — Penyempitan saluran pernapasan karena alergi atau faktor pemicu (debu, bulu hewan, udara dingin). Gejala: sesak napas, batuk, napas berbunyi (mengi). Asma tidak bisa disembuhkan total tetapi bisa dikontrol dengan obat.

3) BRONKITIS — Peradangan pada bronkus (cabang tenggorokan) karena infeksi bakteri/virus atau asap rokok. Gejala: batuk berdahak, demam, sesak napas. Bronkitis akut sembuh dalam beberapa minggu; bronkitis kronis bisa berlangsung lama.

4) PNEUMONIA — Infeksi pada alveolus (kantung udara) yang menyebabkan peradangan dan penumpukan cairan. Gejala: demam tinggi, batuk berdahak, sesak napas berat. Pneumonia bisa berbahaya terutama pada anak-anak dan lansia.

5) TBC (TUBERKULOSIS) — Infeksi bakteri Mycobacterium tuberculosis pada paru-paru. Penyakit ini menular melalui percikan ludah saat batuk/bersin. Gejala: batuk lebih dari 3 minggu, demam malam hari, keringat malam, berat badan turun. TBC bisa disembuhkan dengan pengobatan rutin 6-8 bulan.

6) COVID-19 — Infeksi virus SARS-CoV-2 yang menyerang saluran pernapasan. Gejala bervariasi dari ringan (demam, batuk, hilang penciuman) hingga berat (sesak napas, pneumonia). Pencegahan: vaksinasi, masker, menjaga jarak.

FAKTOR PENYEBAB GANGGUAN PERNAPASAN:
• Polusi udara (asap kendaraan, asap pabrik, asap rokok)
• Infeksi bakteri atau virus
• Alergen (debu, serbuk sari, bulu hewan)
• Kebiasaan merokok
• Perubahan cuaca ekstrem

CARA MENJAGA KESEHATAN PERNAPASAN:
• Olahraga teratur untuk melatih kapasitas paru-paru
• Makan makanan bergizi untuk meningkatkan daya tahan tubuh
• Hindari merokok dan paparan asap rokok
• Gunakan masker saat berada di area berpolusi
• Istirahat cukup dan kelola stres`,

  [contentKey('IPS', 'Kerajaan Hindu-Buddha', 'Kerajaan Majapahit')]: `Kerajaan Majapahit adalah kerajaan Hindu terbesar yang pernah berdiri di Nusantara. Majapahit mencapai puncak kejayaan pada abad ke-14 Masehi. Kerajaan ini terletak di Jawa Timur, tepatnya di daerah Trowulan, Mojokerto. Majapahit didirikan oleh Raden Wijaya (1289 M) setelah berhasil mengalahkan pasukan Mongol di bantu oleh Arya Wiraraja.

SUMBER SEJARAH MAJAPAHIT:
• Kitab NEGARAKERTAGAMA — karya Mpu Prapanca (1365 M) yang menggambarkan kejayaan Majapahit secara detail, termasuk wilayah kekuasaan dan upacara kerajaan.
• Kitab SUTASOMA — karya Mpu Tantular yang memuat semboyan "Bhinneka Tunggal Ika" (berbeda-beda tetapi tetap satu).
• Prasasti-prasasti seperti Prasasti Sukamerta dan Prasasti Kudadu.
• Candi-candi peninggalan: Candi Penataran, Candi Tikus, Candi Bajang Ratu.

RAJA-RAJA TERKENAL MAJAPAHIT:
1) RADEN WIJAYA (1293-1309) — Pendiri Majapahit, setelah mengusir pasukan Mongol.
2) JAYANEGARA (1309-1328) — Putra Raden Wijaya. Pemerintahannya tidak stabil karena banyak pemberontakan.
3) TRIBUWANA TUNGGADEWI (1328-1350) — Ratu wanita pertama yang memerintah Majapahit. Patih Gajah Mada mulai terkenal pada masa ini.
4) HAYAM WURUK (1350-1389) — Raja terbesar Majapahit. Pada masa pemerintahannya, Majapahit mencapai puncak keemasan dengan wilayah yang sangat luas.
5) WIKRAMAWARDHANA (1389-1429) — Penerus Hayam Wuruk, Majapahit mulai mengalami kemunduran.

PATAH GAJAH MADA adalah patih paling terkenal. Ia mengucapkan SUMPAH PALAPA: "Lamun huwus kalah Nusantara, isun amukti palapa" — Jika sudah mengalahkan Nusantara, barulah saya menikmati kenikmatan duniawi. Gajah Mada berhasil menyatukan wilayah Nusantara yang membentang dari Sumatera hingga Papua di bawah kekuasaan Majapahit.

KEMUNDURAN MAJAPAHIT disebabkan oleh: perang saudara (Perang Paregreg 1401-1406), semakin kuatnya kerajaan-kerajaan Islam di pesisir, dan melemahnya ekonomi akibat berkurangnya perdagangan.

Peninggalan Majapahit yang masih terlihat: Candi Penataran, Kolam Segaran, Gapura Bajang Ratu, dan makam-makam raja di Trowulan.`,

  // ═══════════════════════════════════════════════════════════════════════════
  //  SMA/2 — WEEK 1
  // ═══════════════════════════════════════════════════════════════════════════

  [contentKey('Matematika', 'Fungsi Komposisi', 'Definisi Fungsi')]: `Fungsi (pemetaan) adalah relasi khusus yang menghubungkan setiap anggota himpunan A (daerah asal/domain) dengan tepat satu anggota himpunan B (daerah kawan/kodomain). Fungsi merupakan salah satu konsep paling penting dalam matematika karena menjadi dasar kalkulus dan analisis.

NOTASI FUNGSI:
Sebuah fungsi biasanya ditulis sebagai f : A → B, dibaca "fungsi f memetakan himpunan A ke himpunan B". Jika x ∈ A dan y ∈ B, maka y = f(x), dibaca "y adalah peta dari x oleh fungsi f".

ISTILAH-ISTILAH PENTING:
1) DOMAIN (Daerah Asal) — Himpunan semua nilai x yang dapat dimasukkan ke dalam fungsi
2) KODOMAIN (Daerah Kawan) — Himpunan semua nilai yang mungkin menjadi hasil fungsi
3) RANGE (Daerah Hasil) — Himpunan semua nilai f(x) yang benar-benar dihasilkan oleh fungsi (subset dari kodomain)

JENIS-JENIS FUNGSI:
1) FUNGSI INJEKTIF (Satu-satu) — Setiap anggota domain dipetakan ke anggota kodomain yang berbeda. Jika a ≠ b maka f(a) ≠ f(b). Contoh: f(x) = 2x.
2) FUNGSI SURJEKTIF (ONTO) — Setiap anggota kodomain memiliki pasangan di domain (range = kodomain). Contoh: f(x) = x³.
3) FUNGSI BUEKTIF (Korespondensi Satu-satu) — Injektif dan surjektif sekaligus. Contoh: f(x) = x + 1.

CONTOH FUNGSI:
f(x) = 2x + 3 dengan domain x ∈ {1, 2, 3, 4}
• f(1) = 2(1) + 3 = 5
• f(2) = 2(2) + 3 = 7
• f(3) = 2(3) + 3 = 9
• f(4) = 2(4) + 3 = 11
Range = {5, 7, 9, 11}

OPERASI FUNGSI:
Jika f(x) dan g(x) adalah fungsi-fungsi, maka:
1) (f + g)(x) = f(x) + g(x)
2) (f - g)(x) = f(x) - g(x)
3) (f × g)(x) = f(x) × g(x)
4) (f / g)(x) = f(x) / g(x), dengan syarat g(x) ≠ 0

Contoh: f(x) = 2x + 1 dan g(x) = x²
(f + g)(x) = 2x + 1 + x² = x² + 2x + 1
(f × g)(x) = (2x + 1)(x²) = 2x³ + x²

Fungsi sangat penting dalam kehidupan sehari-hari: menghitung biaya pengiriman (fungsi dari berat barang), konversi suhu (fungsi dari derajat Celcius ke Fahrenheit), dan perhitungan bunga bank (fungsi dari waktu menabung).`,

  [contentKey('Matematika', 'Fungsi Komposisi', 'Komposisi Fungsi')]: `Fungsi komposisi adalah penggabungan dua fungsi secara berurutan sehingga menghasilkan fungsi baru. Komposisi fungsi dilambangkan dengan tanda ∘ (bundaran).

KONSEP DASAR:
Jika f : A → B dan g : B → C, maka komposisi (g ∘ f)(x) = g(f(x)) artinya:
1) Masukkan x ke fungsi f → f(x)
2) Masukkan hasil f(x) ke fungsi g → g(f(x))

Dibaca: "g bundaran f dari x" atau "komposisi fungsi g dengan f dari x".

PENTING: Urutan pengerjaan adalah dari KIRI ke KANAN untuk fungsi dalam — kerjakan f(x) dulu, lalu hasilnya dimasukkan ke g.

Contoh 1: f(x) = 2x + 1 dan g(x) = x²
Tentukan (g ∘ f)(x) dan (f ∘ g)(x).

(g ∘ f)(x) = g(f(x)) = g(2x + 1) = (2x + 1)² = 4x² + 4x + 1
(f ∘ g)(x) = f(g(x)) = f(x²) = 2(x²) + 1 = 2x² + 1

Perhatikan bahwa (g ∘ f)(x) ≠ (f ∘ g)(x). Komposisi fungsi bersifat TIDAK KOMUTATIF.

Contoh 2: f(x) = x + 3, g(x) = 2x, h(x) = x²
Tentukan (h ∘ g ∘ f)(x).

(h ∘ g ∘ f)(x) = h(g(f(x)))
Langkah 1: f(x) = x + 3
Langkah 2: g(f(x)) = g(x + 3) = 2(x + 3) = 2x + 6
Langkah 3: h(g(f(x))) = h(2x + 6) = (2x + 6)² = 4x² + 24x + 36

SIFAT-SIFAT KOMPOSISI FUNGSI:
1) Tidak komutatif: (g ∘ f)(x) ≠ (f ∘ g)(x) pada umumnya
2) Asosiatif: (h ∘ (g ∘ f))(x) = ((h ∘ g) ∘ f)(x)
3) Identitas: (f ∘ I)(x) = (I ∘ f)(x) = f(x), di mana I(x) = x

DOMAIN KOMPOSISI FUNGSI:
Domain dari (g ∘ f)(x) adalah semua x di domain f sehingga f(x) berada di domain g. Domain ini tidak selalu sama dengan domain f.

Contoh penerapan: Dalam fisika, jika f mengubah waktu menjadi kecepatan dan g mengubah kecepatan menjadi energi kinetik, maka (g ∘ f) mengubah waktu langsung menjadi energi kinetik.`,

  [contentKey('Fisika', 'Hukum Newton', 'Hukum I Newton')]: `Hukum I Newton, yang juga dikenal sebagai HUKUM KELEMBAMAN atau HUKUM INERSIA, adalah hukum pertama dari tiga hukum gerak Newton. Hukum ini pertama kali dirumuskan oleh Sir Isaac Newton (1643-1727), seorang ilmuwan Inggris.

BUNYI HUKUM I NEWTON:
"Setiap benda akan tetap dalam keadaan diam atau bergerak lurus beraturan kecuali ada gaya total (resultan gaya) yang bekerja padanya."

Dalam bahasa sederhana: Benda yang diam akan tetap diam, dan benda yang bergerak akan terus bergerak dengan kecepatan konstan, kecuali ada gaya luar yang mengubah keadaan tersebut.

RUMUS: ΣF = 0 (resultan gaya = 0)

Sifat ini disebut KELEMBAMAN (inersia), yaitu kecenderungan benda untuk mempertahankan keadaan diam atau geraknya. Massa benda adalah ukuran kelembaman — semakin besar massa, semakin sulit mengubah keadaan geraknya.

CONTOH DALAM KEHIDUPAN SEHARI-HARI:

1) SAAT MOBIL BERHENTI MENGEJAK — Tubuh kita terdorong ke depan karena tubuh kita cenderung mempertahankan gerak maju. Inilah sebabnya kita harus memakai sabuk pengaman.

2) SAAT MOBIL BERGERAK MENDADAK — Tubuh kita terdorong ke belakang karena tubuh kita cenderung mempertahankan keadaan diam.

3) MENGHENTAK TAPLAK MEJA — Jika kita mengh entak taplak meja secara cepat, benda-benda di atas meja akan tetap di tempatnya karena cenderung mempertahankan keadaan diam.

4) MENGAYUH SEPEDA — Saat kita berhenti mengayuh, sepeda tetap melaju beberapa saat sebelum akhirnya berhenti karena gaya gesek.

PENERAPAN TEKNOLOGI:
• Sabuk pengaman pada mobil — mengurangi efek kelembaman tubuh saat tabrakan
• Airbag — memberikan gaya perlambatan yang lebih kecil pada tubuh
• Perlengkapan olahraga — helm, bantalan lutut, dan matras mengurangi gaya tabrakan

PENTING: Hukum I Newton hanya berlaku dalam KERANGKA ACUAN INERSIAL (kerangka acuan yang diam atau bergerak dengan kecepatan konstan). Dalam kerangka yang dipercepat, hukum ini tidak berlaku dan diperlukan gaya fiktif.

Contoh soal:
Sebuah balok bermassa 5 kg terletak di atas meja licin tanpa gesekan. Berapa gaya yang diperlukan agar balok tetap diam?
Jawab: ΣF = 0. Karena balok sudah diam dan tidak ada gaya yang bekerja, maka tidak diperlukan gaya agar balok tetap diam (Hukum I Newton).`,

  [contentKey('Fisika', 'Hukum Newton', 'Hukum II Newton')]: `Hukum II Newton menjelaskan hubungan antara gaya, massa, dan percepatan pada suatu benda. Hukum ini merupakan hukum yang paling penting dalam mekanika klasik karena memungkinkan kita menghitung gerak benda.

BUNYI HUKUM II NEWTON:
"Percepatan suatu benda sebanding dengan resultan gaya yang bekerja padanya dan berbanding terbalik dengan massanya. Arah percepatan sama dengan arah resultan gaya."

RUMUS: F = m × a

di mana:
• F = resultan gaya (Newton, N)
• m = massa benda (kg)
• a = percepatan benda (m/s²)

1 Newton didefinisikan sebagai gaya yang diperlukan untuk memberikan percepatan 1 m/s² pada benda bermassa 1 kg. Jadi 1 N = 1 kg·m/s².

IMPLIKASI PENTING:
1) Semakin besar gaya yang diberikan, semakin besar percepatannya
2) Semakin besar massa benda, semakin kecil percepatan yang dihasilkan oleh gaya yang sama
3) Arah percepatan selalu sama dengan arah gaya total

CONTOH SOAL:

1) Sebuah benda bermassa 10 kg didorong dengan gaya 50 N. Hitung percepatannya!
   F = 50 N, m = 10 kg
   a = F/m = 50/10 = 5 m/s²

2) Sebuah mobil bermassa 1000 kg bergerak dengan percepatan 2 m/s². Berapa gaya mesin yang diperlukan?
   m = 1000 kg, a = 2 m/s²
   F = m × a = 1000 × 2 = 2000 N

PENERAPAN DALAM KEHIDUPAN SEHARI-HARI:
• Mendorong gerobak — lebih mudah mendorong gerobak kosong daripada gerobak penuh (massa lebih kecil)
• Mobil balap — mesin besar menghasilkan gaya besar, akselerasi tinggi
• Memukul bola — semakin keras pukulan (gaya besar), bola melaju semakin kencang (percepatan besar)

HUKUM II NEWTON DENGAN BEBERAPA GAYA:
Jika ada beberapa gaya bekerja pada satu benda, maka:

ΣF = m × a

di mana ΣF adalah resultan (jumlah vektor) dari semua gaya yang bekerja.

Contoh: Sebuah benda ditarik ke kanan dengan gaya 30 N dan ditarik ke kiri dengan gaya 10 N. Massa benda 4 kg. Tentukan percepatan!
ΣF = 30 - 10 = 20 N (ke kanan)
a = ΣF / m = 20 / 4 = 5 m/s² (ke kanan)`,

  [contentKey('Kimia', 'Ikatan Kimia', 'Ikatan Ion')]: `Ikatan ion adalah ikatan kimia yang terjadi akibat serah terima elektron antara atom logam (yang cenderung melepas elektron) dengan atom non-logam (yang cenderung menerima elektron). Ikatan ion terbentuk karena adanya gaya tarik-menarik elektrostatis antara ion positif (kation) dan ion negatif (anion).

ATOM-ATOM CENDERUNG MENCAPAI KESTABILAN
Atom-atom ingin mencapai konfigurasi elektron seperti gas mulia (oktet/8 elektron di kulit terluar atau duplet/2 elektron untuk kulit pertama). Hukum ini disebut KAIDAH OKTET.

CARA IKATAN ION TERBENTUK:
1) Atom logam (golongan IA, IIA, IIIA) melepas 1, 2, atau 3 elektron → menjadi ion positif (KATION)
2) Atom non-logam (golongan VIA, VIIA) menerima 1, 2, atau 3 elektron → menjadi ion negatif (ANION)
3) Kation dan anion saling tarik-menarik secara elektrostatis → membentuk senyawa ion

CONTOH IKATAN ION:

1) NaCl (Natrium Klorida — Garam Dapur)
   Na (golongan IA, 2.8.1) → melepas 1 elektron → Na⁺ (2.8)
   Cl (golongan VIIA, 2.8.7) → menerima 1 elektron → Cl⁻ (2.8.8)
   Na⁺ + Cl⁻ → NaCl

2) MgCl₂ (Magnesium Klorida)
   Mg (golongan IIA, 2.8.2) → melepas 2 elektron → Mg²⁺ (2.8)
   2 Cl (masing-masing menerima 1 elektron) → 2 Cl⁻ (2.8.8)
   Mg²⁺ + 2Cl⁻ → MgCl₂

3) CaO (Kalsium Oksida — Kapur)
   Ca (golongan IIA, 2.8.8.2) → melepas 2 elektron → Ca²⁺ (2.8.8)
   O (golongan VIA, 2.6) → menerima 2 elektron → O²⁻ (2.8)
   Ca²⁺ + O²⁻ → CaO

SIFAT-SIFAT SENYAWA ION:
1) Titik leleh dan titik didih TINGGI (karena ikatan elektrostatis kuat)
2) Larut dalam air (pelarut polar)
3) Dapat menghantarkan listrik dalam bentuk lelehan (cair) atau larutan (karena ion-ion bergerak bebas)
4) Tidak menghantarkan listrik dalam bentuk padatan (ion-ion terikat kuat pada tempatnya)
5) Berbentuk kristal padat pada suhu kamar
6) Rapuh (mudah patah jika dipukul)

Contoh senyawa ion dalam kehidupan sehari-hari: garam dapur (NaCl), kapur (CaCO₃), soda kue (NaHCO₃), pupuk NPK (KNO₃).`,

  [contentKey('Kimia', 'Ikatan Kimia', 'Ikatan Kovalen')]: `Ikatan kovalen adalah ikatan kimia yang terjadi karena PEMAKAIAN BERSAMA pasangan elektron antara atom-atom non-logam. Berbeda dengan ikatan ion yang melibatkan serah terima elektron, ikatan kovalen melibatkan penggunaan elektron secara bersama.

TEORI DASAR:
Atom non-logam memiliki elektronegativitas yang tinggi dan tidak melepas elektron dengan mudah. Oleh karena itu, untuk mencapai kestabilan (oktet), atom-atom non-logam lebih suka menggunakan pasangan elektron bersama daripada mentransfer elektron.

JENIS-JENIS IKATAN KOVALEN:

1) IKATAN KOVALEN TUNGGAL — 1 pasang elektron digunakan bersama
   Contoh: H₂, Cl₂, HCl, CH₄
   H · + · H → H:H (H—H)

2) IKATAN KOVALEN RANGKAP DUA — 2 pasang elektron digunakan bersama
   Contoh: O₂, CO₂
   O :: O (O=O)

3) IKATAN KOVALEN RANGKAP TIGA — 3 pasang elektron digunakan bersama
   Contoh: N₂ (N≡N)

CONTOH SENYAWA KOVALEN:

1) H₂O (Air)
   O (2.8.6) memerlukan 2 elektron untuk mencapai oktet
   2 atom H (masing-masing 1 elektron) membentuk ikatan tunggal dengan O
   Struktur: H—O—H (bentuk molekul: V/bengkok)

2) CO₂ (Karbon Dioksida)
   C (2.4) memerlukan 4 elektron, O (2.6) memerlukan 2 elektron
   O=C=O (ikatan rangkap dua, bentuk molekul: linear)

3) CH₄ (Metana — Gas Alam)
   C (2.4) memerlukan 4 elektron, 4 atom H masing-masing 1 elektron
   Bentuk molekul: tetrahedral

IKATAN KOVALEN KOORDINASI — Pasangan elektron yang digunakan bersama berasal dari SATU atom saja. Contoh: NH₄⁺ (amonium).

SIFAT-SIFAT SENYAWA KOVALEN:
1) Titik leleh dan titik didih RENDAH (karena gaya antar molekul lemah)
2) Banyak yang tidak larut dalam air
3) Umumnya TIDAK menghantarkan listrik (bukan elektrolit)
4) Berwujud gas, cair, atau padat dengan titik leleh rendah
5) Antar molekul relatif lunak

IKATAN KOVALEN POLAR vs NONPOLAR:
• Polar: pasangan elektron tertarik lebih kuat ke salah satu atom (perbedaan keelektronegatifan besar). Contoh: H₂O, HCl, NH₃
• Nonpolar: pasangan elektron terbagi rata (perbedaan keelektronegatifan kecil). Contoh: H₂, O₂, CH₄

Perbandingan Ikatan Ion vs Kovalen:
Ion (logam+non-logam, serah terima, titik leleh tinggi, larut air, konduktor listrik dalam larutan)
Kovalen (non-logam+non-logam, pemakaian bersama, titik leleh rendah, tidak selalu larut, non-konduktor).`,

  [contentKey('Biologi', 'Sistem Ekskresi', 'Ginjal')]: `Ginjal adalah organ ekskresi utama pada manusia. Ginjal berbentuk seperti biji kacang merah dan berwarna merah keunguan. Manusia memiliki sepasang ginjal yang terletak di kanan dan kiri tulang belakang, tepatnya di daerah pinggang. Ginjal kanan sedikit lebih rendah dari ginjal kiri karena terdesak oleh hati.

STRUKTUR GINJAL:
• KORTEKS (Kulit Ginjal) — Lapisan terluar tempat banyak nefron berada
• MEDULA (Sumsum Ginjal) — Lapisan tengah berbentuk piramida
• PELVIS (Rongga Ginjal) — Rongga yang menampung urine sebelum disalurkan ke ureter

Setiap ginjal mengandung sekitar satu juta NEFRON — unit fungsional terkecil ginjal. Nefron terdiri dari:
• GLOMERULUS — anyaman pembuluh darah kapiler
• KAPSULA BOWMAN — selaput yang menyelubungi glomerulus
• TUBULUS KONTORTUS PROKSIMAL — saluran berkelok pertama
• LINGKARAN HENLE — saluran berbentuk U yang panjang
• TUBULUS KONTORTUS DISTAL — saluran berkelok kedua
• TUBULUS PENGUMPUL — saluran yang mengumpulkan urine dari beberapa nefron

PROSES PEMBENTUKAN URINE (3 TAHAP):

1) FILTRASI (Penyaringan) — Terjadi di glomerulus dan kapsula Bowman. Darah yang masuk ke glomerulus disaring. Hasil filtrasi disebut FILTRAT GLOMERULUS (urine primer) yang mengandung air, glukosa, garam, asam amino, urea, dan ion-ion. Sel darah dan protein tidak ikut tersaring karena ukurannya terlalu besar.

2) REABSORPSI (Penyerapan Kembali) — Terjadi di tubulus kontortus proksimal. Zat-zat yang masih berguna diserap kembali ke darah: glukosa (100%), asam amino (100%), sebagian garam dan air (sekitar 85%). Hasilnya disebut URINE SEKUNDER yang sudah mengandung urea lebih pekat.

3) AUGMENTASI (Pengeluaran Zat) — Terjadi di tubulus kontortus distal. Zat-zat sisa seperti ion hidrogen (H⁺), kalium (K⁺), amonia (NH₃), dan kreatinin dikeluarkan ke dalam urine. Hasil akhirnya berupa URINE SESUNGGUHNYA yang akan disalurkan ke pelvis, lalu ke ureter, kandung kemih, dan uretra untuk dikeluarkan.

JUMLAH URINE:
• Normal: 1-2 liter per hari
• Dipengaruhi oleh: jumlah minum, suhu, aktivitas, hormon ADH (anti-diuretic hormone)

KELAINAN GINJAL:
• Batu ginjal — pengendapan mineral (kalsium oksalat)
• Nefritis — radang nefron karena infeksi bakteri
• Gagal ginjal — ginjal tidak mampu menyaring darah → perlu cuci darah (dialisis) atau transplantasi ginjal`,

  [contentKey('Biologi', 'Sistem Ekskresi', 'Kulit')]: `Kulit adalah organ ekskresi terbesar pada manusia dengan luas sekitar 1,5-2 m². Selain berfungsi sebagai alat ekskresi (mengeluarkan keringat), kulit juga berfungsi sebagai pelindung tubuh, pengatur suhu, indra peraba, dan tempat pembuatan vitamin D.

STRUKTUR KULIT:

1) EPIDERMIS (Kulit Ari) — Lapisan terluar yang tipis dan tidak berpembuluh darah. Terdiri dari:
   • Stratum korneum (lapisan tanduk) — sel-sel mati yang mengelupas
   • Stratum granulosum — lapisan butiran
   • Stratum germinativum — lapisan tempat sel-sel baru dibentuk, mengandung melanin (pigmen warna kulit)

2) DERMIS (Kulit Jangat) — Lapisan di bawah epidermis, lebih tebal, mengandung:
   • Pembuluh darah dan kapiler
   • KELENJAR KERINGAT (glandula sudorifera) — berbentuk tabung yang mengeluarkan keringat
   • KELENJAR MINYAK (glandula sebasea) — menghasilkan sebum (minyak)
   • Ujung saraf (untuk merasakan sentuhan, tekanan, panas, dingin, nyeri)
   • Akar rambut dan otot penegak rambut

3) HIPODERMIS (Jaringan Lemak Bawah Kulit) — Lapisan terdalam yang mengandung lemak sebagai cadangan energi dan isolator panas.

PROSES PENGELUARAN KERINGAT:
Keringat diproduksi oleh kelenjar keringat yang terdapat di seluruh permukaan kulit, terutama banyak di telapak tangan, telapak kaki, dahi, dan ketiak. Keringat mengandung air (99%), garam (NaCl), urea, asam laktat, dan sedikit amonia.

Faktor yang mempengaruhi produksi keringat:
• Suhu lingkungan — semakin panas, semakin banyak keringat
• Aktivitas fisik — olahraga meningkatkan produksi keringat
• Emosi — gugup atau takut menyebabkan keringat dingin
• Demam — tubuh berkeringat untuk menurunkan suhu

FUNGSI KERINGAT:
• Mengeluarkan zat sisa (urea dan garam)
• Mendinginkan tubuh (penguapan keringat menyerap panas tubuh)

KELAINAN PADA KULIT:
• Jerawat — penyumbatan kelenjar minyak oleh sebum dan bakteri
• Eksim (dermatitis) — peradangan kulit dengan gatal dan kemerahan
• Panu — infeksi jamur Malassezia
• Kudis (skabies) — infeksi tungau Sarcoptes scabiei
• Kanker kulit — akibat paparan sinar UV berlebihan

Perawatan kulit yang baik: mandi teratur, menggunakan tabir surya, makan makanan bergizi, cukup minum air putih, dan istirahat cukup.`,

  [contentKey('Bahasa Indonesia', 'Teks Editorial', 'Struktur Editorial')]: `Teks editorial (tajuk rencana) adalah artikel opini yang ditulis oleh redaksi media massa (koran, majalah, portal berita) yang mencerminkan sikap resmi media terhadap suatu isu atau peristiwa aktual. Teks editorial sering disebut sebagai "nyawa" atau "wajah" suatu media karena menunjukkan pandangan media tersebut.

CIRI-CIRI TEKS EDITORIAL:
• Berisi OPINI dan sikap redaksi terhadap isu aktual
• Bersifat argumentatif dan persuasif (meyakinkan pembaca)
• Menggunakan bahasa yang lugas, jelas, dan logis
• Didukung oleh data, fakta, dan argumen yang kuat
• Muncul secara rutin di media massa
• Topiknya bersifat aktual dan kontroversial

STRUKTUR TEKS EDITORIAL:

1) TESA (PERNYATAAN PENDAPAT)— Bagian pembuka yang berisi sudut pandang redaksi terhadap isu yang akan dibahas. Tesis biasanya dinyatakan dalam satu kalimat utama yang jelas dan tegas. Contoh: "Kebijakan pemerintah mengurangi subsidi bahan bakar minyak (BBM) perlu dikaji ulang karena akan memberatkan masyarakat kecil."

2) ARGUMEN — Bagian inti yang berisi alasan-alasan, bukti, dan data untuk mendukung tesis. Biasanya terdiri dari beberapa paragraf, masing-masing menguraikan satu argumen. Argumen harus logis, berdasarkan fakta, dan relevan. Penulis bisa menggunakan data statistik, contoh kasus, pendapat ahli, atau perbandingan.

Contoh argumen: "Harga BBM bersubsidi saat ini sudah di bawah harga pasar. Akibatnya, anggaran subsidi BBM membengkak hingga Rp 500 triliun. Dana ini bisa digunakan untuk pembangunan infrastruktur pendidikan dan kesehatan."

3) PERNYATAAN ULANG (PENEGASAN) — Bagian penutup yang memperkuat posisi penulis. Berisi kesimpulan, rekomendasi, atau ajakan. Pernyataan ulang bisa berupa kalimat yang sama dengan tesis tetapi dengan kata-kata yang berbeda atau lebih tegas.

Contoh penutup: "Sudah saatnya pemerintah mengkaji ulang kebijakan subsidi BBM dan mengalihkan subsidi ke sektor-sektor yang lebih produktif untuk kesejahteraan rakyat."

KAIDAH KEBAHASAAN TEKS EDITORIAL:
• Menggunakan kata-kata persuasif (seharusnya, sebaiknya, perlu)
• Menggunakan konjungsi argumentatif (sebab, karena, oleh karena itu, maka)
• Menggunakan istilah teknis sesuai topik
• Menggunakan kalimat retoris (pertanyaan yang tidak perlu dijawab) untuk menekankan
• Menggunakan kata ganti penunjuk (ini, itu, tersebut)

Contoh: Apakah pantas rakyat kecil menanggung kenaikan harga akibat subsidi yang salah sasaran?" (kalimat retoris)`,

  [contentKey('Bahasa Inggris', 'Tenses', 'Past Perfect')]: `Past Perfect Tense digunakan untuk menyatakan suatu kejadian yang telah selesai terjadi SEBELUM kejadian lain di masa lampau. Tense ini membantu menjelaskan urutan kejadian di masa lalu.

USAGES (PENGGUNAAN):

1) AN ACTION COMPLETED BEFORE ANOTHER PAST ACTION — Aksi yang selesai sebelum aksi lain di masa lalu
   • "I had finished my homework before my mother came home."
     (Saya sudah selesai mengerjakan PR sebelum ibu pulang.)
   • "She had left when I arrived."
     (Dia sudah pergi ketika saya tiba.)

2) AN ACTION THAT HAPPENED BEFORE A SPECIFIC TIME IN THE PAST — Aksi yang terjadi sebelum waktu tertentu di masa lalu
   • "By 2020, he had already graduated from university."
     (Pada tahun 2020, dia sudah lulus dari universitas.)

3) REPORTED SPEECH — Dalam kalimat tidak langsung
   • She said that she had seen the movie.
     (Dia berkata bahwa dia sudah menonton film itu.)

FORMULA (RUMUS):

(+) POSITIVE: Subject + had + Past Participle (V3) + Object
   • I had eaten breakfast before I went to school.
   • They had arrived when the meeting started.

(-) NEGATIVE: Subject + had + not + Past Participle (V3)
   • I had not (hadn't) eaten breakfast.
   • She had not (hadn't) finished her homework.

(?) INTERROGATIVE: Had + Subject + Past Participle (V3)?
   • Had you eaten before leaving?
   • Had they arrived on time?

PERBEDAAN SIMPLE PAST vs PAST PERFECT:

Simple Past: menyatakan urutan kejadian secara berurutan
"I ate breakfast. Then I went to school." (saya sarapan, lalu pergi sekolah — dua kejadian berurutan)

Past Perfect: menekankan bahwa satu kejadian selesai SEBELUM kejadian lainnya
"I had eaten breakfast before I went to school." (saya sudah sarapan sebelum pergi sekolah — penekanan bahwa sarapan selesai duluan)

TIME SIGNALS (Kata keterangan waktu):
before (sebelum), after (setelah), already (sudah), just (baru saja), never (tidak pernah), by the time (pada saat), when (ketika), until (sampai).

Contoh paragraf:
"After Andi had studied for three hours, he decided to take a break. He had never felt so tired before. By the time his mother called him for dinner, he had already finished all his homework. He was very proud because he had accomplished everything he planned for the day."

Artinya: Setelah Andi belajar selama tiga jam, dia memutuskan untuk istirahat. Dia tidak pernah merasa begitu lelah sebelumnya. Pada saat ibunya memanggilnya untuk makan malam, dia sudah menyelesaikan semua PR-nya. Dia sangat bangga karena dia telah mencapai semua yang direncanakannya hari itu.`,

  [contentKey('Sejarah', 'Reformasi', 'Latar Belakang Reformasi')]: `Reformasi adalah gerakan perubahan besar-besaran dalam berbagai bidang kehidupan yang terjadi di Indonesia pada tahun 1998. Gerakan reformasi berhasil menumbangkan kekuasaan Presiden Soeharto yang telah berkuasa selama 32 tahun (1966-1998). Kata "reformasi" berarti perubahan sistem yang sudah tidak sesuai lagi dengan kebutuhan masyarakat.

LATAR BELAKANG TERJADINYA REFORMASI:

1) KRISIS EKONOMI (1997-1998)
   • Nilai tukar rupiah merosot drastis dari Rp 2.500/US$ menjadi Rp 15.000/US$ atau bahkan lebih
   • Utang luar negeri membengkak
   • Banyak perusahaan bangkrut dan terjadi PHK massal
   • Harga kebutuhan pokok melonjak tinggi
   • Indonesia terpaksa meminta bantuan IMF (Dana Moneter Internasional)

2) KKN (Korupsi, Kolusi, dan Nepotisme) yang MERAJALELA
   • Korupsi dilakukan secara sistematis oleh pejabat negara
   • Kolusi antara pengusaha dan penguasa (keluarga Cendana menguasai banyak perusahaan)
   • Nepotisme — kerabat dan keluarga Presiden mendapat perlakuan istimewa
   • Berbagai proyek pemerintah dikelola oleh keluarga dan kerabat Soeharto

3) KETIMPAKGAN SOSIAL
   • Kesenjangan antara orang kaya dan miskin semakin lebar
   • 80% kekayaan nasional dikuasai oleh 20% penduduk
   • Kemiskinan dan pengangguran meningkat

4) PEMBUNGKAMAN DEMOKRASI
   • Kebebasan pers dibatasi (koran dan majalah bisa dibredel)
   • Partai politik hanya ada 3 (PPP, Golkar, PDI)
   • Hasil pemilu selalu dimenangkan Golkar
   • Mahasiswa dan aktivis dilarang berdemo dan berpendapat

5) TRAGEDI-TRAGEDI KEMANUSIAAN
   • Tragedi Trisakti (12 Mei 1998) — 4 mahasiswa tewas tertembak saat berdemo
   • Tragedi Semanggi — mahasiswa tewas di dekat Universitas Trisakti dan Atma Jaya
   • Penculikan aktivis pro-demokrasi tahun 1997-1998

PUNCAK REFORMASI:
• Aksi demo mahasiswa besar-besaran di seluruh Indonesia (Maret-Mei 1998)
• Gedung DPR/MPR diduduki mahasiswa pada 21 Mei 1998
• Soeharto menyatakan mundur pada 21 Mei 1998 pukul 09.00 WIB
• B.J. Habibie menggantikan sebagai Presiden RI ke-3

TUNTUTAN REFORMASI:
1) Adili Soeharto dan kroni-kroninya
2) Amandemen UUD 1945
3) Hapuskan dwifungsi ABRI
4) Otonomi daerah seluas-luasnya
5) Tegakkan supremasi hukum
6) Ciptakan pemerintahan yang bersih dari KKN`,

  // ═══════════════════════════════════════════════════════════════════════════
  //  SMA/2 — WEEK 2
  // ═══════════════════════════════════════════════════════════════════════════

  [contentKey('Fisika', 'Hukum Newton', 'Hukum III Newton')]: `Hukum III Newton dikenal sebagai HUKUM AKSI-REAKSI. Hukum ini menjelaskan bahwa gaya selalu terjadi berpasangan.

BUNYI HUKUM III NEWTON:
"Jika suatu benda memberikan gaya (aksi) pada benda lain, maka benda itu akan menerima gaya (reaksi) dari benda lain tersebut dengan besar yang sama tetapi arah yang berlawanan."

RUMUS: F_aksi = - F_reaksi

PENTING untuk dipahami:
• Gaya aksi dan reaksi BEKERJA PADA BENDA YANG BERBEDA — bukan pada benda yang sama
• Besarnya SAMA, arahnya BERLAWANAN
• Kedua gaya terjadi BERSAMAAN, tidak ada yang mendahului

CONTOH DALAM KEHIDUPAN SEHARI-HARI:

1) BERJALAN — Kaki mendorong tanah ke belakang (aksi). Tanah mendorong kaki ke depan (reaksi). Kita bisa maju karena reaksi dari tanah.

2) ROKET MELUNCUR — Gas panas dari roket terdorong ke bawah (aksi). Roket terdorong ke atas (reaksi). Inilah prinsip roket dan pesawat jet.

3) BERENANG — Tangan mendorong air ke belakang (aksi). Air mendorong tangan ke depan (reaksi). Perenang bisa maju.

4) MEMUKUL TEMBOK — Tangan memukul tembok (aksi). Tembok memberikan gaya reaksi yang sama besar ke tangan (reaksi). Inilah sebabnya tangan sakit saat memukul tembok keras.

5) PISTOL MUNDUR (Recoil) — Saat peluru didorong keluar (aksi), pistol mendorong ke arah sebaliknya (reaksi).

PERBEDAAN PENTING ANTARA AKSI-REAKSI DAN KESETIMBANGAN:

Aksi-Reaksi (Hukum III Newton):
• Bekerja pada BENDA BERBEDA
• Contoh: Buku di atas meja — buku memberikan gaya berat ke meja (aksi), meja memberikan gaya normal ke buku (reaksi). Ini AKSI-REAKSI karena buku dan meja adalah benda berbeda.

Kesetimbangan (Hukum I Newton):
• Bekerja pada BENDA YANG SAMA
• Contoh: Gaya berat buku ke bawah dan gaya normal meja ke atas bekerja pada BENDA YANG SAMA (buku), menghasilkan ΣF = 0. Ini KESETIMBANGAN, bukan aksi-reaksi.

Contoh soal:
Seorang anak bermassa 40 kg berdiri di atas lantai. Jika percepatan gravitasi 10 m/s², hitung gaya aksi dan reaksinya!
Gaya berat anak (aksi) = m × g = 40 × 10 = 400 N (ke bawah pada lantai)
Gaya reaksi lantai = 400 N (ke atas pada anak)
Keduanya bekerja pada benda yang berbeda (aksi pada lantai, reaksi pada anak).`,

  [contentKey('Kimia', 'Ikatan Kimia', 'Ikatan Kovalen')]: `IKATAN KOVALEN — Lanjutan

(lihat entri ikatan kovalen yang sudah ditulis di bagian atas — ini adalah daftar kedua untuk mencakup minggu ke-2)

IKATAN KOVALEN POLAR vs NONPOLAR — PRAKTIK:

Untuk menentukan apakah suatu senyawa bersifat polar atau nonpolar, perhatikan:
• Bentuk molekul — molekul simetris cenderung nonpolar, molekul asimetris cenderung polar
• Perbedaan keelektronegatifan — > 0,4 cenderung polar
• Adanya pasangan elektron bebas — membuat molekul asimetris → polar

Contoh:
• CO₂ (karbon dioksida) — linear, simetris → NONPOLAR meskipun memiliki ikatan polar
• H₂O (air) — bentuk V, asimetris, ada PEB → POLAR
• CCl₄ — tetrahedral, simetris → NONPOLAR
• CHCl₃ — tetrahedral, asimetris → POLAR

Sifat "like dissolves like": zat polar larut dalam pelarut polar, zat nonpolar larut dalam pelarut nonpolar. Air (polar) melarutkan gula dan garam, tetapi tidak melarutkan minyak (nonpolar).

KEKUATAN IKATAN KOVALEN: Ikatan rangkap tiga > rangkap dua > tunggal. Semakin banyak pasangan elektron bersama, semakin kuat dan pendek ikatannya.
• C—C (154 pm, 348 kJ/mol) — ikatan tunggal
• C=C (134 pm, 614 kJ/mol) — ikatan rangkap dua
• C≡C (120 pm, 839 kJ/mol) — ikatan rangkap tiga`,

  [contentKey('Biologi', 'Sistem Ekskresi', 'Kulit')]: `KULIT SEBAGAI ALAT EKSKRESI — Lanjutan

(lihat entri kulit yang sudah ditulis di bagian atas — ini mencakup minggu ke-2)

HUBUNGAN KULIT DENGAN ORGAN EKSKRESI LAIN:

Tubuh memiliki 4 organ ekskresi utama:
1) GINJAL — mengeluarkan urine (air, urea, garam)
2) KULIT — mengeluarkan keringat (air, garam, urea)
3) PARU-PARU — mengeluarkan CO₂ dan uap air
4) HATI — mengeluarkan empedu dan mengubah amonia menjadi urea

Hati mengubah amonia (NH₃) yang beracun menjadi urea (CO(NH₂)₂) yang kurang beracun. Urea kemudian dikeluarkan oleh ginjal dan sebagian kecil oleh kulit.

Gangguan yang menghubungkan organ ekskresi:
• Diabetes melitus — kadar gula darah tinggi, ginjal tidak bisa mereabsorpsi glukosa → glukosa keluar melalui urine
• Penyakit kuning — kerusakan hati menyebabkan penumpukan bilirubin
• Edema — penumpukan air karena ginjal gagal menyaring (wajah bengkak, kaki bengkak)

CARA MENJAGA KESEHATAN SISTEM EKSKRESI:
• Minum air putih 8 gelas sehari (2 liter)
• Tidak menahan buang air kecil
• Olahraga teratur
• Hindari makanan terlalu asin dan berlemak
• Jaga kebersihan kulit
• Tidak merokok dan minum alkohol`,

  [contentKey('Bahasa Indonesia', 'Teks Editorial', 'Opini dan Fakta')]: `Dalam teks editorial, sangat penting membedakan antara FAKTA dan OPINI. Teks editorial yang baik harus didukung fakta, meskipun tujuannya menyampaikan opini/sikap.

FAKTA adalah kejadian atau pernyataan yang BENAR-BENAR TERJADI dan dapat dibuktikan kebenarannya. Ciri fakta:
• Data yang akurat (angka, tanggal, tempat)
• Dapat diverifikasi (dicek kebenarannya)
• Bersifat objektif (tidak dipengaruhi perasaan)
• Contoh: "Angka kemiskinan di Indonesia mencapai 25,9 juta jiwa pada Maret 2023." (data BPS)

OPINI adalah pernyataan yang berupa PENDAPAT, pandangan, atau sikap seseorang. Ciri opini:
• Bersifat subjektif (dipengaruhi perasaan/pandangan)
• Belum tentu benar, bisa diperdebatkan
• Sering menggunakan kata: sebaiknya, seharusnya, mungkin, perlu, menurut
• Contoh: "Pemerintah seharusnya meningkatkan subsidi pendidikan untuk mengurangi angka putus sekolah."

Dalam teks editorial, opini disampaikan dengan didukung fakta. Editorial yang baik menggunakan fakta untuk memperkuat argumen opini. Contoh: "Berdasarkan data Kementerian Kesehatan, angka stunting di Indonesia masih 21,6% (FAKTA). Oleh karena itu, pemerintah perlu mengalokasikan anggaran lebih untuk program gizi anak sekolah (OPINI)."`,

  [contentKey('Sejarah', 'Orde Baru', 'Kebijakan Orde Baru')]: `Orde Baru adalah sebutan untuk masa pemerintahan Presiden Soeharto yang berlangsung dari tahun 1966 hingga 1998. Orde Baru lahir setelah kegagalan Orde Lama (pemerintahan Soekarno) yang ditandai dengan G30S/PKI dan krisis ekonomi. Soeharto menggantikan Soekarno melalui Surat Perintah Sebelas Maret (Supersemar) tahun 1966.

KEBIJAKAN-KEBIJAKAN PENTING ORDE BARU:

1) BIDANG EKONOMI:
   • REPELITA (Rencana Pembangunan Lima Tahun) — program pembangunan bertahap dimulai 1969
   • Swasembada pangan — berhasil dicapai tahun 1984, Indonesia tidak impor beras
   • Pertumbuhan ekonomi rata-rata 7% per tahun
   • Masuknya investasi asing melalui UU PMA (Penanaman Modal Asing)
   • Terbentuknya konglomerat-konglomerat besar

2) BIDANG POLITIK:
   • Penyerdehanaan partai politik menjadi 3: PPP, Golkar, PDI
   • Asas tunggal Pancasila — semua organisasi harus berasaskan Pancasila
   • Dwifungsi ABRI — militer memiliki peran sosial-politik di samping pertahanan
   • Pemilu selalu dimenangkan Golkar
   • Pembatasan kebebasan pers dan berpendapat

3) BIDANG PENDIDIKAN:
   • Inpres SD — pembangunan SD massal (1980-an) meningkatkan angka melek huruf
   • Wajib belajar 6 tahun (kemudian 9 tahun)
   • Penataran P4 (Pedoman Penghayatan dan Pengamalan Pancasila)
   • Normalisasi kehidupan kampus (NKK) — membatasi aktivitas politik mahasiswa

4) BIDANG LUAR NEGERI:
   • Politik luar negeri bebas aktif
   • Indonesia kembali menjadi anggota PBB (1966)
   • Pelopor berdirinya ASEAN (1967)
   • Normalisasi hubungan dengan Malaysia

KEBERHASILAN ORDE BARU:
• Stabilitas politik dan keamanan
• Pertumbuhan ekonomi yang pesat
• Pembangunan infrastruktur (jalan, jembatan, irigasi, sekolah, puskesmas)
• Angka kemiskinan turun dari 60% (1965) menjadi 11% (1996)
• Swasembada beras

KELEMAHAN ORDE BARU:
• KKN (Korupsi, Kolusi, Nepotisme) merajalela
• Demokrasi terkekang
• Kesenjangan kaya-miskin semakin lebar
• Kebebasan pers dibungkam
• Pelanggaran HAM (Trisakti, Semanggi, Timor Timur)
• Ketergantungan pada utang luar negeri`,

  // ═══════════════════════════════════════════════════════════════════════════
  //  SD/5 — additional week-3+ topics (shorter content)
  // ═══════════════════════════════════════════════════════════════════════════

  [contentKey('Matematika', 'Pecahan', 'Pengurangan Pecahan')]: `Pengurangan pecahan mirip dengan penjumlahan pecahan. Jika penyebutnya sama, kurangkan pembilangnya. Jika penyebut berbeda, samakan penyebut dulu dengan KPK. Contoh: 5/6 - 1/3 = 5/6 - 2/6 = 3/6 = 1/2. Untuk pecahan campuran, ubah ke pecahan biasa dulu atau kurangkan bilangan bulat dan pecahannya secara terpisah.`,

  [contentKey('Matematika', 'Pecahan', 'Perkalian Pecahan')]: `Perkalian pecahan lebih mudah daripada penjumlahan — kalikan pembilang dengan pembilang, penyebut dengan penyebut. Tidak perlu menyamakan penyebut. Contoh: 2/3 × 4/5 = 8/15. Untuk perkalian dengan bilangan bulat: 3 × 2/5 = 6/5 = 1 1/5. Sederhanakan hasil jika memungkinkan.`,

  [contentKey('Matematika', 'Desimal', 'Mengenal Desimal')]: `Desimal adalah bilangan yang menggunakan tanda koma (,) untuk memisahkan bilangan bulat dan pecahan. Contoh: 0,5 = 1/2, 0,25 = 1/4, 0,75 = 3/4. Nilai tempat desimal: persepuluhan (0,1), perseratusan (0,01), perseribuan (0,001). Cara mengubah pecahan ke desimal: bagi pembilang dengan penyebut.`,

  [contentKey('IPA', 'Sistem Pernapasan', 'Organ Pernapasan')]: `Organ pernapasan manusia meliputi hidung (menyaring, menghangatkan, melembabkan udara), faring (persimpangan), laring (pita suara), trakea (batang tenggorokan), bronkus (cabang), bronkiolus (cabang lebih kecil), dan alveolus (tempat pertukaran gas O₂ dan CO₂). Paru-paru kanan memiliki 3 lobus, paru-paru kiri 2 lobus.`,

  [contentKey('IPA', 'Sistem Peredaran Darah', 'Jantung dan Pembuluh Darah')]: `Jantung adalah organ pemompa darah yang terletak di rongga dada. Terdiri dari 4 ruang: serambi kanan, serambi kiri, bilik kanan, bilik kiri. Jantung memompa darah melalui pembuluh: arteri (membawa darah kaya O₂ dari jantung), vena (membawa darah kaya CO₂ ke jantung), dan kapiler (tempat pertukaran zat).`,

  [contentKey('PPKn', 'Hak dan Kewajiban', 'Hak Anak')]: `Hak anak adalah hak dasar yang dimiliki setiap anak. Menurut Konvensi PBB tentang Hak Anak: hak hidup, hak tumbuh kembang, hak perlindungan, dan hak partisipasi. Di Indonesia, hak anak dilindungi UU No. 23 Tahun 2002 tentang Perlindungan Anak. Contoh hak anak di sekolah: mendapat pelajaran, mendapat nilai adil, mendapat bimbingan guru.`,

  [contentKey('Agama', 'Akhlak', 'Akhlak Terpuji')]: `Akhlak terpuji (akhlakul karimah) adalah perilaku baik yang sesuai dengan ajaran agama. Contoh: jujur (berkata benar), disiplin (tepat waktu), tanggung jawab (menyelesaikan tugas), tolong-menolong (membantu sesama), hormat kepada orang tua dan guru. Rasulullah SAW bersabda: "Sesungguhnya aku diutus untuk menyempurnakan akhlak yang mulia."`,

  [contentKey('Seni Budaya', 'Seni Rupa', 'Menggambar')]: `Menggambar adalah kegiatan mengekspresikan ide dan perasaan melalui gambar. Teknik dasar: menggambar bentuk (mengamati objek nyata), menggambar perspektif (memberi kesan ruang), menggambar komposisi (mengatur tata letak). Alat menggambar: pensil, pensil warna, crayon, cat air, spidol. Prinsip: proporsi (perbandingan ukuran), keseimbangan, irama, kesatuan.`,

  [contentKey('PJOK', 'Olahraga', 'Permainan Bola Besar')]: `Permainan bola besar menggunakan bola berukuran besar. Contoh: sepak bola (11 pemain, tendang bola ke gawang), bola voli (6 pemain, pukul bola melewati net), bola basket (5 pemain, masukkan bola ke ring). Manfaat: melatih kekuatan otot, kerja sama tim, dan kebugaran jantung.`,

  // ═══════════════════════════════════════════════════════════════════════════
  //  SMP/1 — additional week-3+ topics (shorter content)
  // ═══════════════════════════════════════════════════════════════════════════

  [contentKey('Matematika', 'Persamaan Linear', 'PLSV')]: `Persamaan Linear Satu Variabel (PLSV) adalah persamaan yang memiliki satu variabel berpangkat satu. Bentuk umum: ax + b = c, dengan a ≠ 0. Contoh: 2x + 3 = 7. Untuk menyelesaikan: kumpulkan variabel di satu ruas, konstanta di ruas lain. 2x = 7 - 3 → 2x = 4 → x = 2.`,

  [contentKey('Matematika', 'Himpunan', 'Konsep Himpunan')]: `Himpunan adalah kumpulan objek yang terdefinisi dengan jelas. Contoh: Himpunan bilangan genap = {2, 4, 6, 8, ...}. Notasi: A = {x | x < 10, x ∈ bilangan genap}. Anggota himpunan dinotasikan dengan ∈, bukan anggota ∉. Himpunan kosong { } atau ∅. Himpunan semesta S adalah himpunan semua objek yang dibicarakan.`,

  [contentKey('Bahasa Indonesia', 'Teks Eksposisi', 'Tesis dan Argumen')]: `Teks eksposisi bertujuan menjelaskan informasi agar pembaca mendapat pengetahuan. Struktur: tesis (pernyataan pendapat), argumen (alasan dan bukti), penegasan ulang (kesimpulan). Contoh tesis: "Pendidikan karakter sangat penting bagi siswa." Argumen: mendukung dengan data dan contoh. Gunakan fakta, data statistik, dan pendapat ahli sebagai argumen.`,

  [contentKey('IPA', 'Sistem Ekskresi', 'Ginjal')]: `Ginjal adalah organ ekskresi berbentuk seperti kacang merah, terletak di pinggang. Fungsi: menyaring darah (filtrasi di glomerulus), menyerap kembali zat berguna (reabsorpsi), mengeluarkan zat sisa (augmentasi). Hasil akhir: urine yang dikeluarkan melalui ureter → kandung kemih → uretra.`,

  [contentKey('IPA', 'Gerak Benda', 'Gaya dan Gerak')]: `Gaya adalah tarikan atau dorongan yang menyebabkan benda bergerak, berubah bentuk, atau berubah arah. Jenis gaya: gaya sentuh (gesek, pegas, otot) dan gaya tak sentuh (gravitasi, magnet, listrik). Hukum Newton menjelaskan hubungan gaya dan gerak. Gaya diukur dalam satuan Newton (N).`,

  [contentKey('PPKn', 'Norma', 'Macam-Macam Norma')]: `Norma adalah aturan atau pedoman hidup dalam masyarakat. Macam-macam norma: norma agama (berasal dari Tuhan), norma kesusilaan (hati nurani), norma kesopanan (adat kebiasaan), norma hukum (peraturan negara). Sanksi norma hukum bersifat tegas dan memaksa. Norma agama memiliki sanksi dari Tuhan (dosa/pahala).`,

  [contentKey('Agama', 'Ibadah', 'Shalat Wajib')]: `Shalat wajib (fardhu) adalah ibadah yang harus dikerjakan setiap Muslim. Ada 5 waktu shalat: Subuh (2 rakaat), Dzuhur (4), Ashar (4), Maghrib (3), Isya (4). Syarat sah shalat: suci dari hadas, bersih badan/pakaian/tempat, menutup aurat, menghadap kiblat. Rukun shalat: niat, takbiratul ihram, membaca Al-Fatihah, ruku, sujud, duduk di antara dua sujud, tasyahud akhir, salam.`,

  // ═══════════════════════════════════════════════════════════════════════════
  //  SMA/2 — additional week-3+ topics (shorter content)
  // ═══════════════════════════════════════════════════════════════════════════

  [contentKey('Matematika', 'Fungsi Invers', 'Invers Fungsi')]: `Invers fungsi adalah kebalikan dari suatu fungsi. Jika f adalah fungsi dari A ke B, maka invers f (ditulis f⁻¹) adalah fungsi dari B ke A yang memenuhi f⁻¹(f(x)) = x dan f(f⁻¹(x)) = x. Syarat fungsi memiliki invers: fungsi harus bijektif. Cara mencari f⁻¹: ganti f(x) dengan y, tukar x dan y, selesaikan untuk y. Contoh: f(x) = 2x + 3 → y = 2x + 3 → x = 2y + 3 → y = (x-3)/2 → f⁻¹(x) = (x-3)/2.`,

  [contentKey('Matematika', 'Limit', 'Konsep Limit')]: `Limit adalah nilai yang didekati suatu fungsi ketika variabel mendekati nilai tertentu. Notasi: lim(x→a) f(x) = L. Artinya: ketika x mendekati a (tapi tidak sama dengan a), nilai f(x) mendekati L. Limit kiri (dari kiri) dan limit kanan (dari kanan) harus sama agar limit ada. Contoh sederhana: lim(x→2) (x² - 4)/(x - 2) = lim(x→2) (x+2) = 4.`,

  [contentKey('Fisika', 'Usaha dan Energi', 'Konsep Usaha')]: `Usaha (W) dalam fisika adalah gaya yang bekerja pada benda sehingga benda berpindah. Rumus: W = F × s, di mana F = gaya (N), s = perpindahan (m). Satuan: Joule (J). Jika gaya membentuk sudut θ terhadap perpindahan: W = F × s × cos θ. Usaha bernilai positif jika searah, nol jika tegak lurus, negatif jika berlawanan. Contoh: mendorong meja sejauh 2 m dengan gaya 50 N → W = 50 × 2 = 100 J.`,

  [contentKey('Fisika', 'Gelombang', 'Gelombang Bunyi')]: `Gelombang bunyi adalah gelombang mekanik longitudinal yang merambat melalui medium. Bunyi memerlukan medium (padat, cair, gas) untuk merambat. Cepat rambat bunyi: di udara ±340 m/s, di air ±1500 m/s, di besi ±5000 m/s. Frekuensi bunyi: infrasonik (<20 Hz), audiosonik (20-20.000 Hz, bisa didengar manusia), ultrasonik (>20.000 Hz).`,

  [contentKey('Kimia', 'Stoikiometri', 'Konsep Mol')]: `Mol adalah satuan jumlah zat dalam kimia. 1 mol = 6,02 × 10²³ partikel (bilangan Avogadro). Rumus: mol = massa/Mr (massa molekul relatif). Jumlah partikel = mol × 6,02 × 10²³. Volume gas pada STP (0°C, 1 atm) = mol × 22,4 L. Contoh: 18 gram air (Mr = 18) = 1 mol = 6,02 × 10²³ molekul H₂O.`,

  [contentKey('Kimia', 'Larutan', 'Konsentrasi Larutan')]: `Konsentrasi larutan menyatakan jumlah zat terlarut dalam pelarut. Molaritas (M) = mol zat terlarut / liter larutan. Mol = massa/Mr. Contoh: membuat 0,5 M NaCl: 0,5 mol = 29,25 gram NaCl dilarutkan dalam air hingga volume 1 L. Pengenceran: V₁ × M₁ = V₂ × M₂.`,

  [contentKey('Biologi', 'Sistem Koordinasi', 'Sistem Saraf')]: `Sistem saraf mengatur dan mengkoordinasikan seluruh aktivitas tubuh. Terdiri dari: sistem saraf pusat (otak dan sumsum tulang belakang) dan sistem saraf tepi. Sel saraf (neuron) terdiri dari badan sel, dendrit (menerima impuls), dan akson (menghantarkan impuls). Sinapsis adalah celah antar neuron tempat perpindahan impuls melalui neurotransmiter.`,

  [contentKey('Biologi', 'Genetika', 'Hukum Mendel')]: `Hukum Mendel adalah hukum pewarisan sifat. Hukum I Mendel (segregasi): pasangan alel memisah saat pembentukan gamet. Hukum II Mendel (asortasi bebas): gen-gen pada kromosom berbeda berpasangan secara bebas. Persilangan monohibrid (satu sifat) menghasilkan rasio fenotip 3:1 pada F₂. Persilangan dihibrid (dua sifat) menghasilkan rasio 9:3:3:1 pada F₂.`,

  [contentKey('Bahasa Indonesia', 'Cerpen', 'Unsur Intrinsik')]: `Unsur intrinsik adalah unsur pembangun cerpen dari dalam. Meliputi: tema (gagasan utama), tokoh (protagonis, antagonis, tritagonis), penokohan (penggambaran watak), alur/plot (kronologi: awal → konflik → klimaks → resolusi → akhir), latar (tempat, waktu, suasana), sudut pandang (orang pertama/kedua/ketiga), amanat (pesan moral).`,

  [contentKey('Bahasa Inggris', 'Passive Voice', 'Active vs Passive')]: `Passive Voice digunakan ketika subjek dikenai tindakan. Rumus: Subject + be + Past Participle (V3) + by Agent. Mengubah active ke passive: objek jadi subjek, subjek jadi by-agent. Contoh: Active: "The cat ate the fish." → Passive: "The fish was eaten by the cat." Tense be-nya mengikuti tense kalimat active.`,

  [contentKey('Sejarah', 'Orde Baru', 'Akhir Orde Baru')]: `Orde Baru berakhir pada 21 Mei 1998 saat Soeharto mundur. Penyebab: krisis ekonomi 1997 (rupiah jatuh, inflasi tinggi), demonstrasi mahasiswa besar-besaran, desakan tokoh nasional (Habibie, Harmoko, Try Sutrisno), dan ketidakmampuan mengatasi krisis. Setelah Soeharto mundur, B.J. Habibie menjadi presiden dan memulai era reformasi dengan kebebasan pers, pembebasan tahanan politik, dan pemilu demokratis 1999.`,
};

// ---------------------------------------------------------------------------
//  Exported content bank as array (for iteration) + lookup function
// ---------------------------------------------------------------------------

/**
 * Look up content for a given subject, topic, and subtopic.
 * Returns null if not found.
 */
export function getContent(
  subject: string,
  topic: string,
  subTopic: string,
): string | null {
  return CONTENT_MAP[contentKey(subject, topic, subTopic)] ?? null;
}

/**
 * The full content bank as an array of CurriculumContent objects.
 */
export const CONTENT_BANK: CurriculumContent[] = Object.entries(CONTENT_MAP).map(
  ([key, content]) => {
    const [subject, topic, subTopic] = key.split('||');
    return { subject, topic, subTopic, content };
  },
);

/**
 * Check if a specific topic entry has content in the bank.
 */
export function hasContent(
  subject: string,
  topic: string,
  subTopic: string,
): boolean {
  return contentKey(subject, topic, subTopic) in CONTENT_MAP;
}
