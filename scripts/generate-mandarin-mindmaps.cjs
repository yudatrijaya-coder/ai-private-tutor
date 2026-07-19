/**
 * Generate comprehensive mindmaps + YouTube URLs for all 8 Bahasa Mandarin materials.
 * - Fetches all 8 Mandarin materials from the database
 * - Generates rich mindmap JSON (root=topic, 5-8 branches with children)
 * - Searches YouTube Data API for working video URLs
 * - Updates metadata->>'mindmap' and videoUrl in the database
 */

const https = require('https');

const DB_CONFIG = {
  host: 'localhost',
  user: 'tutor',
  password: 'tutor123',
  database: 'ai_private_tutor',
};

const YOUTUBE_API_KEY = 'AIzaSyD_etQDR8vKkXU53IGopl7JY_VvzLq6VWg';

// ─── YouTube Data API ──────────────────────────────────────────────────────────

function youtubeSearch(query, maxResults = 3) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: String(maxResults),
      key: YOUTUBE_API_KEY,
    });
    const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
    https.get(url, { headers: { Accept: 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            console.warn(`  ⚠️  YouTube API error: ${json.error.message}`);
            resolve([]);
            return;
          }
          const results = (json.items || []).map(item => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          }));
          resolve(results);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// ─── Mindmap generator ──────────────────────────────────────────────────────────

function generateMindmap(topic, branches) {
  const root = { id: 'root', label: topic, children: [] };
  branches.forEach((branch, bi) => {
    const branchNode = { id: `b${bi}`, label: branch.label, children: [] };
    if (branch.children) {
      branch.children.forEach((child, ci) => {
        branchNode.children.push({ id: `b${bi}_c${ci}`, label: child });
      });
    }
    root.children.push(branchNode);
  });
  return JSON.stringify(root);
}

// ─── Mandarin topic definitions ─────────────────────────────────────────────────

const MANDARIN_TOPICS = {
  'Kosakata HSK 3.0 Level 1': {
    branches: [
      { label: 'Salam & Ucapan Dasar', children: ['你好 (Nǐhǎo) - Halo', '再见 (Zàijiàn) - Selamat tinggal', '谢谢 (Xièxie) - Terima kasih', '不客气 (Bù kèqi) - Sama-sama', '对不起 (Duìbuqǐ) - Maaf', '没关系 (Méi guānxi) - Tidak apa-apa'] },
      { label: 'Perkenalan Diri', children: ['我叫… (Wǒ jiào…) - Nama saya…', '我是学生 (Wǒ shì xuéshēng) - Saya pelajar', '你叫什么名字？(Nǐ jiào shénme míngzi?) - Siapa namamu?', '很高兴认识你 (Hěn gāoxìng rènshi nǐ) - Senang bertemu'] },
      { label: 'Angka 1-10', children: ['一 (Yī) - 1', '二 (Èr) - 2', '三 (Sān) - 3', '四 (Sì) - 4', '五 (Wǔ) - 5', '六 (Liù) - 6', '七 (Qī) - 7', '八 (Bā) - 8', '九 (Jiǔ) - 9', '十 (Shí) - 10'] },
      { label: 'Kata Ganti Orang', children: ['我 (Wǒ) - Saya', '你 (Nǐ) - Kamu', '他 (Tā) - Dia (laki-laki)', '她 (Tā) - Dia (perempuan)', '我们 (Wǒmen) - Kami', '你们 (Nǐmen) - Kalian', '他们/她们 - Mereka'] },
      { label: 'Waktu & Hari', children: ['今天 (Jīntiān) - Hari ini', '明天 (Míngtiān) - Besok', '昨天 (Zuótiān) - Kemarin', '现在 (Xiànzài) - Sekarang', '几点？(Jǐ diǎn?) - Jam berapa?'] },
      { label: 'Kalimat Dasar', children: ['我是… (Wǒ shì…) - Saya adalah…', '你有…吗？(Nǐ yǒu… ma?) - Apakah kamu punya…?', '这是… (Zhè shì…) - Ini adalah…', '那是… (Nà shì…) - Itu adalah…'] },
      { label: 'Kosakata Sehari-hari', children: ['水 (Shuǐ) - Air', '吃 (Chī) - Makan', '喝 (Hē) - Minum', '好 (Hǎo) - Baik', '是 (Shì) - Iya/Adalah', '不 (Bù) - Tidak'] },
    ],
    youtubeQueries: [
      'belajar bahasa mandarin HSK 1 kosakata dasar Indonesia',
      'hanzi dasar bahasa mandarin untuk pemula',
    ],
  },

  'Kosakata HSK 3.0 Level 2': {
    branches: [
      { label: 'Benda di Kelas', children: ['书 (Shū) - Buku', '笔 (Bǐ) - Pulpen', '桌子 (Zhuōzi) - Meja', '椅子 (Yǐzi) - Kursi', '书包 (Shūbāo) - Tas sekolah', '本子 (Běnzi) - Buku tulis'] },
      { label: 'Angka 11-100', children: ['十一到二十 (11-20)', '三十, 四十, 五十 (30, 40, 50)', '一百 (Yìbǎi) - 100', '多少钱？(Duōshao qián?) - Berapa harganya?'] },
      { label: 'Warna', children: ['红色 (Hóngsè) - Merah', '蓝色 (Lánsè) - Biru', '绿色 (Lǜsè) - Hijau', '黄色 (Huángsè) - Kuning', '白色 (Báisè) - Putih', '黑色 (Hēisè) - Hitam'] },
      { label: 'Keluarga', children: ['爸爸 (Bàba) - Ayah', '妈妈 (Māma) - Ibu', '哥哥 (Gēge) - Kakak laki-laki', '姐姐 (Jiějie) - Kakak perempuan', '弟弟 (Dìdi) - Adik laki-laki', '妹妹 (Mèimei) - Adik perempuan'] },
      { label: 'Makanan & Minuman', children: ['米饭 (Mǐfàn) - Nasi', '面条 (Miàntiáo) - Mie', '苹果 (Píngguǒ) - Apel', '茶 (Chá) - Teh', '咖啡 (Kāfēi) - Kopi'] },
      { label: 'Kata Kerja Dasar', children: ['学习 (Xuéxí) - Belajar', '工作 (Gōngzuò) - Bekerja', '休息 (Xiūxi) - Beristirahat', '睡觉 (Shuìjiào) - Tidur', '走路 (Zǒulù) - Berjalan'] },
      { label: 'Tempat', children: ['学校 (Xuéxiào) - Sekolah', '家 (Jiā) - Rumah', '医院 (Yīyuàn) - Rumah sakit', '商店 (Shāngdiàn) - Toko', '图书馆 (Túshūguǎn) - Perpustakaan'] },
    ],
    youtubeQueries: [
      'belajar bahasa mandarin HSK 2 kosakata Indonesia',
      'kosakata mandarin menengah untuk pemula',
    ],
  },

  'Kosakata HSK 3.0 Level 3': {
    branches: [
      { label: 'Aktivitas Sehari-hari', children: ['吃饭 (Chīfàn) - Makan', '睡觉 (Shuìjiào) - Tidur', '洗澡 (Xǐzǎo) - Mandi', '运动 (Yùndòng) - Berolahraga', '买东西 (Mǎi dōngxi) - Belanja'] },
      { label: 'Waktu Lebih Lanjut', children: ['早上 (Zǎoshang) - Pagi', '中午 (Zhōngwǔ) - Siang', '下午 (Xiàwǔ) - Sore', '晚上 (Wǎnshang) - Malam', '周末 (Zhōumò) - Akhir pekan'] },
      { label: 'Kata Keluarga Lebih Lengkap', children: ['父亲 (Fùqīn) - Ayah', '母亲 (Mǔqīn) - Ibu', '兄弟 (Xiōngdì) - Bersaudara laki-laki', '姐妹 (Jiěmèi) - Bersaudara perempuan', '孩子 (Háizi) - Anak', '老人 (Lǎorén) - Lansia'] },
      { label: 'Pekerjaan', children: ['老师 (Lǎoshī) - Guru', '医生 (Yīshēng) - Dokter', '护士 (Hùshi) - Perawat', '工程师 (Gōngchéngshī) - Insinyur', '服务员 (Fúwùyuán) - Pelayan'] },
      { label: 'Transportasi', children: ['火车 (Huǒchē) - Kereta', '汽车 (Qìchē) - Mobil', '飞机 (Fēijī) - Pesawat', '地铁 (Dìtiě) - MRT/Metro', '自行车 (Zìxíngchē) - Sepeda'] },
      { label: 'Tempat Umum', children: ['公园 (Gōngyuán) - Taman', '银行 (Yínháng) - Bank', '餐厅 (Cāntīng) - Restoran', '电影院 (Diànyǐngyuàn) - Bioskop', '超市 (Chāoshì) - Supermarket'] },
      { label: 'Kata Sifat Umum', children: ['大 (Dà) - Besar', '小 (Xiǎo) - Kecil', '新 (Xīn) - Baru', '老 (Lǎo) - Tua/Lama', '好 (Hǎo) - Bagus', '快 (Kuài) - Cepat', '慢 (Màn) - Lambat'] },
    ],
    youtubeQueries: [
      'belajar bahasa mandarin HSK 3 kosakata menengah atas Indonesia',
      'kosakata bahasa mandarin aktivitas sehari-hari',
    ],
  },

  'Kosakata HSK 3.0 Level 4': {
    branches: [
      { label: 'Profesi Lebih Lengkap', children: ['老师 (Lǎoshī) - Guru', '医生 (Yīshēng) - Dokter', '律师 (Lǜshī) - Pengacara', '会计 (Kuàijì) - Akuntan', '记者 (Jìzhě) - Jurnalis', '演员 (Yǎnyuán) - Aktor'] },
      { label: 'Transportasi & Perjalanan', children: ['火车 (Huǒchē) - Kereta', '飞机 (Fēijī) - Pesawat', '船 (Chuán) - Kapal', '出租车 (Chūzū chē) - Taksi', '出发 (Chūfā) - Berangkat', '到达 (Dàodá) - Tiba'] },
      { label: 'Aktivitas & Kegemaran', children: ['爱好 (Àihào) - Hobi', '唱歌 (Chànggē) - Bernyanyi', '跳舞 (Tiàowǔ) - Menari', '看书 (Kànshū) - Membaca buku', '旅行 (Lǚxíng) - Berpergian', '运动 (Yùndòng) - Berolahraga'] },
      { label: 'Cuaca & Musim', children: ['天气 (Tiānqì) - Cuaca', '下雨 (Xiàyǔ) - Hujan', '下雪 (Xiàxuě) - Salju', '热 (Rè) - Panas', '冷 (Lěng) - Dingin', '春天 (Chūntiān) - Musim semi', '夏天 (Xiàtiān) - Musim panas'] },
      { label: 'Kalimat dengan Kata Bantu', children: ['会 (Huì) - Bisa/Mahir', '能 (Néng) - Mampu/Boleh', '想 (Xiǎng) - Ingin/Mau', '要 (Yào) - Ingin/Mau', '可以 (Kěyǐ) - Boleh', '应该 (Yīnggāi) - Seharusnya'] },
      { label: 'Kata Hubung & Struktur', children: ['因为…所以… (Yīnwèi… suǒyǐ…) - Karena… maka…', '如果…就… (Rúguǒ… jiù…) - Jika… maka…', '虽然…但是… (Suīrán… dànshì…) - Meskipun… tapi…', '或者 (Huòzhě) - Atau', '但是 (Dànshì) - Tetapi'] },
      { label: 'Kosakata Abstrak', children: ['时间 (Shíjiān) - Waktu', '机会 (Jīhuì) - Kesempatan', '问题 (Wèntí) - Masalah/Soal', '经验 (Jīngyàn) - Pengalaman', '能力 (Nénglì) - Kemampuan', '兴趣 (Xìngqù) - Minat'] },
    ],
    youtubeQueries: [
      'belajar bahasa mandarin HSK 4 kosakata lanjutan Indonesia',
      'kosakata bahasa mandarin profesional dan abstrak',
    ],
  },

  'Bangun Fondasi Bahasa Mandarin': {
    branches: [
      { label: 'Sistem Pinyin', children: ['Inisial (声母) - Konsonan awal', 'Final (韵母) - Vokal/final', 'Nada (声调) - 4 nada + nada netral', 'Tanda nada (声调符号)', 'Aturan perubahan nada (变调)'] },
      { label: 'Empat Nada Mandarin', children: ['Nada 1 (阴平) - Tinggi rata: mā', 'Nada 2 (阳平) - Naik: má', 'Nada 3 (上声) - Turun-naik: mǎ', 'Nada 4 (去声) - Turun tajam: mà', 'Nada netral - Pendek, lemah'] },
      { label: 'Karakter Hanzi Dasar', children: ['Struktur karakter (笔画)', 'Radikal (偏旁) - Komponen karakter', 'Jumlah goresan (笔画数)', 'Cara menulis (笔顺) - Urutan goresan', 'Arah goresan (从左到右, 上到下)'] },
      { label: 'Struktur Kalimat Dasar', children: ['Pola SVO - Subjek + Predikat + Objek', 'Kalimat dengan 是 (shì) - kata kerja to be', 'Kalimat dengan 有 (yǒu) - kata kerja have', 'Partikel 的 (de) - penanda milik', 'Partikel 了 (le) - penanda selesai'] },
      { label: 'Kosakata & Frasa Kunci', children: ['这/那 (Zhè/Nà) - Ini/Itu', '哪个 (Nǎge) - Yang mana', '什么 (Shénme) - Apa', '怎么 (Zěnme) - Bagaimana', '为什么 (Wèishénme) - Mengapa'] },
      { label: 'Kemampuan Komunikasi Dasar', children: ['Bertanya dan menjawab', 'Menggunakan sapaan formal dan informal', 'Berhitung dan menyebutkan harga', 'Membaca waktu dan tanggal', 'Menyusun kalimat sederhana'] },
      { label: 'Budaya & Konteks', children: ['Tata krama salam (问候礼仪)', 'Penggunaan nama dan sapaan', 'Angka yang membawa keberuntungan/禁忌', 'Budaya makan dan jamuan', 'Perbedaan register bahasa formal-informal'] },
    ],
    youtubeQueries: [
      'belajar pinyin mandarin untuk pemula Indonesia lengkap',
      'cara menulis hanzi karakter dasar mandarin',
    ],
  },

  'SOP Mata Pelajaran Mandarin': {
    branches: [
      { label: 'Persiapan Kelas', children: ['Bawa modul cetak setiap pelajaran', 'Siapkan buku tulis karakter (方格本)', 'Alat tulis berwarna untuk mewarnai hanzi', 'Kartu kosakata flashcard', 'Headphone untuk listening'] },
      { label: 'Prosedur Pembelajaran', children: ['Warm-up pinyin 5 menit', 'Pengajaran kosakata baru dengan gambar', 'Latihan tulisan hanzi di papan tulis', 'Drill pengucapan nada secara bergiliran', 'Diskusi kelompok kecil (3-4 siswa)'] },
      { label: 'Kebijakan Bahasa', children: ['Minimal 60% durasi kelas menggunakan bahasa Mandarin', 'Pertanyaan kompleks boleh dalam Bahasa Indonesia', 'Dorong siswa berbicara Mandarin meski terbatas', 'Gunakan body language untuk membantu pemahaman'] },
      { label: 'Penilaian & Evaluasi', children: ['Tes formatif setiap akhir tema', 'Proyek mini: rekam percakapan video 3 menit', 'Ujian tengah semester (listening + speaking)', 'Ujian akhir semester (reading + writing)', 'Penilaian partisipasi dan kemajuan'] },
      { label: 'Tata Tertib Kelas', children: ['Ketidakhadiran maksimal 3x per semester tanpa surat', 'Penggantian tugas untuk siswa absen dengan bukti', 'Dilarang menggunakan bahasa lain saat drill', 'Kartu kosakata harus dibawa setiap pertemuan', 'Tugas menulis hanzi dikumpulkan tepat waktu'] },
      { label: 'Sumber Daya & Media', children: ['Video pembelajaran dari YouTube (konten terverifikasi)', 'Aplikasi belajar Mandarin: Pleco, HelloChinese', 'Kartu flashcard bergambar', 'Lagu dan video budaya Tiongkok', 'Buku teks HSK 3.0 resmi'] },
      { label: 'Tindak Lanjut & Remedial', children: ['Siswa yang kesulitan diberi latihan tambahan', 'Tutor privat untuk siswa yang tertinggal', 'Pendampingan tugas PR via grup kelas', 'Evaluasi berkala setiap 4 minggu', 'Konsultasi orang tua jika progress kurang'] },
    ],
    youtubeQueries: [
      'belajar bahasa mandarin dasar untuk SMA Indonesia',
      'metode pembelajaran bahasa mandarin yang efektif',
    ],
  },

  'Materi Pembelajaran Ganjil': {
    branches: [
      { label: 'Tema 1: 自我介绍 (Perkenalan Diri)', children: ['15-20 kosakata: 名, 字, 国, 人…', 'Pola kalimat: 我叫…, 我是…人', 'Budaya: cara Tiongkok memperkenalkan diri', 'Dialog: bertemu orang baru di sekolah'] },
      { label: 'Tema 2: 家庭成员 (Anggota Keluarga)', children: ['Kosakata: 爸爸, 妈妈, 哥哥, 姐姐…', 'Pola: 我家有…口人', 'Budaya: penghormatan terhadap keluarga', 'Proyek: buat silsilah keluarga dalam Mandarin'] },
      { label: 'Tema 3: 爱好 (Hobi & Minat)', children: ['Kosakata: 运动, 音乐, 电影, 书…', 'Pola: 我喜欢…, 我不喜欢…', 'Ekspresi: 我会…, 我想…', 'Aktivitas: diskusi hobi dengan pasangan'] },
      { label: 'Tema 4: 时间和日期 (Waktu & Tanggal)', children: ['Hari: 星期一, 星期二…', 'Bulan: 一月, 二月…', 'Pola: 今天几月几号？', 'Aplikasi: jadwal harian dan mingguan'] },
      { label: 'Tata Bahasa Utama', children: ['很 (hěn) - sangat (dalam kalimat predikat)', '有/没有 (yǒu/méiyǒu) - punya/tidak punya', '是 (shì) - adalah', '的 (de) - partikel milik', '了 (le) - penanda selesai/tidak lama'] },
      { label: 'Keterampilan Berbahasa', children: ['Membaca dialog pendek 3-5 baris', 'Menulis karangan 3-5 kalimat per tema', 'Speaking: role-play percakapan harian', 'Listening: audio dari video yang disuplai'] },
      { label: 'Evaluasi & Proyek', children: ['Tes formatif per tema (kuis tertulis)', 'Proyek mini: video percakapan 3 menit', 'Portfolio kosakata: kartu flashcard 8 tema', 'Ujian tengah semester', 'Refleksi diri: jurnal belajar Mandarin'] },
    ],
    youtubeQueries: [
      'belajar bahasa mandarin tema perkenalan keluarga Indonesia',
      'materi bahasa mandarin SMA semester ganjil',
    ],
  },

  'Program Semester Ganjil': {
    branches: [
      { label: 'Target Kompetensi', children: ['Memperkenalkan diri dalam Mandarin', 'Menyebutkan jadwal dan tanggal', 'Memberikan deskripsi sederhana tentang orang/foto', 'Membaca dan menulis 120-150 karakter baru', 'Percakapan 2-3 kalimat untuk situasi sehari-hari'] },
      { label: 'Struktur Kurikulum', children: ['8 tema bahasan dalam 16 minggu efektif', '2 jam belajar per minggu (kelas + PR)', '15-20 kosakata baru per tema', '2 pola kalimat baru per tema', '1 aspek budaya per tema'] },
      { label: 'Beban Belajar', children: ['Kelas tatap muka: 1x per minggu (90 menit)', 'PR terstruktur: vocabulary cards + writing', 'Review mingguan: quizlet/pembacaan dialog', 'Proyek bulanan: 1 video percakapan', 'Self-study: 30 menit/hari dengan aplikasi'] },
      { label: 'Metode Pengajaran', children: ['CLT (Communicative Language Teaching)', 'Task-based learning untuk peran-peran', 'Total Physical Response untuk kosakata baru', 'Drill struktural untuk pinyin dan nada', 'Immersion parsial: 60% Mandarin dalam kelas'] },
      { label: 'Sistem Penilaian', children: ['Penilaian harian (kehadiran, partisipasi) - 10%', 'Tugas mingguan (kartu kosakata, writing) - 15%', 'Tes formatif per tema - 20%', 'Proyek mini (video percakapan) - 15%', 'UTS + UAS - 40%'] },
      { label: 'Strategi Belajar Efektif', children: ['Spaced repetition dengan Anki/Quizlet', 'Watch Mandarin YouTube with Indonesian subs', 'Belajar karakter setiap hari (minimal 5)', 'Praktik speaking dengan partner bahasa', 'Journaling harian 3 kalimat Mandarin'] },
      { label: 'Sumber Belajar', children: ['Buku teks HSK 3.0 Level 1-2', 'HelloChinese app (free tier)', 'YouTube: YoyoChinese, Chinese Zero to Hero', 'Pleco dictionary untuk karakter', 'Podcast: Coffee Break Chinese'] },
    ],
    youtubeQueries: [
      'program pembelajaran bahasa mandarin semester ganjil SMA',
      'kurikulum HSK 3.0 untuk pelajar Indonesia',
    ],
  },
};

// ─── Database helpers ──────────────────────────────────────────────────────────

const { Client } = require('pg');

function queryDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    const client = new Client(DB_CONFIG);
    client.connect();
    client.query(sql, params, (err, res) => {
      client.end();
      if (err) reject(err);
      else resolve(res);
    });
  });
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 generate-mandarin-mindmaps.cjs\n');

  const client = new Client(DB_CONFIG);
  await client.connect();

  const res = await client.query(
    `SELECT id, topic, "subTopic", "gradeLevel"
     FROM "Material"
     WHERE subject = 'Bahasa Mandarin'
     ORDER BY id`
  );

  const materials = res.rows;
  console.log(`📚 Found ${materials.length} Bahasa Mandarin materials\n`);

  let updatedMindmaps = 0;
  let updatedVideos = 0;
  const topicsHandled = new Set();

  for (const mat of materials) {
    const topic = mat.topic;
    const topicDef = MANDARIN_TOPICS[topic];

    if (!topicDef) {
      console.warn(`⚠️  No topic definition for: ${topic}`);
      continue;
    }

    // Generate mindmap
    const mindmapJson = generateMindmap(topic, topicDef.branches);

    await client.query(
      `UPDATE "Material"
       SET metadata = jsonb_set(
         COALESCE(metadata, '{}'::jsonb),
         '{mindmap}',
         $1::jsonb
       ),
       "updatedAt" = NOW()
       WHERE id = $2`,
      [mindmapJson, mat.id]
    );
    updatedMindmaps++;

    // Search YouTube (once per unique topic)
    if (!topicsHandled.has(topic)) {
      topicsHandled.add(topic);
      console.log(`\n🔍 YouTube search for: "${topic}"`);

      let videoUrl = null;
      for (const query of topicDef.youtubeQueries) {
        try {
          const results = await youtubeSearch(`${query} Indonesia`);
          if (results.length > 0) {
            videoUrl = results[0].url;
            console.log(`   ✅ Found: "${results[0].title}" → ${videoUrl}`);
            break;
          }
        } catch (e) {
          console.warn(`   ⚠️  YouTube search error for "${query}": ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 300));
      }

      if (videoUrl) {
        await client.query(
          `UPDATE "Material"
           SET "videoUrl" = $1, "updatedAt" = NOW()
           WHERE subject = 'Bahasa Mandarin' AND topic = $2`,
          [videoUrl, topic]
        );
        updatedVideos++;
        console.log(`   📺 videoUrl set for topic: ${topic}`);
      } else {
        console.warn(`   ❌ No YouTube results found for topic: ${topic}`);
      }
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`✅ Mindmaps updated : ${updatedMindmaps}/8`);
  console.log(`✅ Video URLs set   : ${updatedVideos} topics`);
  console.log('─'.repeat(60));

  await client.end();
}

main().catch(err => {
  console.error('❌ Script error:', err);
  process.exit(1);
});
