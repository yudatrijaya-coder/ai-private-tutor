/**
 * Generate comprehensive mindmaps + YouTube URLs for all 10 Fisika SMA materials.
 * - Fetches all 10 Fisika materials from the database
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

// The two curriculum IDs for Fisika
const SMP_CURRICULUM_ID = 'e94cf3dd-3fae-4fae-b28f-e7aa899d11e7';
const SMA_CURRICULUM_ID = '98f0274e-4e39-45f5-9c79-3632c5717b27';

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

// ─── Mindmap generator ─────────────────────────────────────────────────────────

/**
 * Generate mindmap JSON: root node + branches with children.
 * Format: [{id, label, children:[{label, children:[...]}]}]
 */
function generateMindmap(topic, branches) {
  // Root
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

// ─── Fisika topic definitions ─────────────────────────────────────────────────

const FISIKA_TOPICS = {
  // ── SMP_1 ────────────────────────────────────────────────────────────────
  'Besaran dan Pengukuran': {
    branches: [
      { label: 'Besaran Pokok', children: ['Panjang', 'Massa', 'Waktu', 'Arus Listrik', 'Suhu', 'Jumlah Zat', 'Intensitas Cahaya'] },
      { label: 'Besaran Turunan', children: ['Luas', 'Volume', 'Kecepatan', 'Percepatan', 'Gaya', 'Energi', 'Daya'] },
      { label: 'Satuan SI', children: ['Meter (m)', 'Kilogram (kg)', 'Sekon (s)', 'Ampere (A)', 'Kelvin (K)', 'Mol (mol)', 'Kandela (cd)'] },
      { label: 'Alat Ukur', children: ['Mistar', 'Jangka Sorong', 'Mikrometer Sekrup', 'Neraca', 'Stopwatch', 'Termometer'] },
      { label: 'Dimensi Besaran', children: ['Dimensi Primer', 'Dimensi Sekunder', 'Analisis Dimensi'] },
      { label: 'Konversi Satuan', children: ['Satuan Panjang', 'Satuan Massa', 'Satuan Waktu', 'Satuan Gabungan'] },
      { label: 'Notasi Ilmiah & Angka Penting', children: ['Bentuk Baku', 'Aturan Angka Penting', 'Pembulatan', 'Operasi Angka Penting'] },
    ],
    youtubeQueries: [
      'besaran dan pengukuran fisika SMP',
      'satuan SI fisika kelas 7',
    ],
  },

  'Gerak Lurus': {
    branches: [
      { label: 'Jarak & Perpindahan', children: ['Skalar vs Vektor', 'Jarak Tempuh', 'Perpindahan', 'Grafik Posisi-Waktu'] },
      { label: 'Kelajuan & Kecepatan', children: ['Kelajuan Rata-rata', 'Kecepatan Rata-rata', 'Kelajuan Sesaat', 'Kecepatan Sesaat'] },
      { label: 'Percepatan', children: ['Percepatan Rata-rata', 'Percepatan Sesaat', 'Gerak Dipercepat', 'Gerak Diperlambat'] },
      { label: 'Gerak Lurus Beraturan (GLB)', children: ['Ciri GLB', 'Persamaan x = vt + x₀', 'Grafik v-t pada GLB', 'Contoh GLB Sehari-hari'] },
      { label: 'Gerak Lurus Berubah Beraturan (GLBB)', children: ['Ciri GLBB', 'Persamaan v = at + v₀', 'Persamaan x = ½at² + v₀t', 'Grafik GLBB'] },
      { label: 'Penerapan GLB & GLBB', children: ['Kendaraan Bermotor', 'Percobaan Ticker Timer', 'Soal Cerita GLB', 'Soal Cerita GLBB'] },
      { label: 'Gerak Jatuh Bebas', children: ['Pengertian GJB', 'Persamaan Gerak Jatuh Bebas', 'Percepatan Gravitasi g', 'Ketinggian dan Waktu'] },
    ],
    youtubeQueries: [
      'gerak lurus fisika SMP kelas 8',
      'GLB GLBB fisika SMP',
    ],
  },

  'Gaya': {
    branches: [
      { label: 'Hukum Newton I (Inersia)', children: ['Konsep Kelembaman', 'Benda Diam', 'Benda Bergerak Lurus Beraturan', 'Contoh Inersia Sehari-hari'] },
      { label: 'Hukum Newton II (F = ma)', children: ['Percepatan Sebanding Gaya', 'Massa vs Berat', 'Satuan Gaya Newton', 'Diagram Gaya Bebas'] },
      { label: 'Hukum Newton III (Aksi-Reaksi)', children: ['Pasangan Gaya Aksi-Reaksi', 'Sifat Pasangan Gaya', 'Contoh Newton III dalam Kehidupan'] },
      { label: 'Jenis-Jenis Gaya', children: ['Gaya Normal', 'Gaya Gesek', 'Gaya Sentuh vs Gaya Jarak Jauh', 'Gaya Gravitasi'] },
      { label: 'Gaya Gesek', children: ['Gaya Gesek Statis', 'Gaya Gesek Kinetis', 'Koefisien Gesekan μ', 'Keuntungan dan Kerugian Gesekan'] },
      { label: 'Diagram Gaya Bebas (Free Body Diagram)', children: ['Cara Menggambar FBD', 'Menyusun Gaya Searah', 'Menyusun Gaya BertEMU', 'Kesetimbangan Gaya'] },
      { label: 'Aplikasi Hukum Newton', children: ['Benda di Atas Meja', 'Katrol Sederhana', 'Tali dan Beban', 'Pesawat Sederhana'] },
    ],
    youtubeQueries: [
      'hukum newton fisika SMP kelas 8',
      'gaya dan hukum newton SMP',
    ],
  },

  'Tekanan': {
    branches: [
      { label: 'Tekanan Zat Padat', children: ['Rumus Tekanan P = F/A', 'Satuan Tekanan (Pa, N/m²)', 'Faktor yang Mempengaruhi Tekanan', 'Contoh Tekanan Padat Sehari-hari'] },
      { label: 'Tekanan Zat Cair (Hidrostatis)', children: ['Rumus P = ρgh', 'Tekanan ke Segala Arah', 'Kedalaman dan Tekanan', 'Aplikasi Tekanan Hidrostatis'] },
      { label: 'Hukum Pascal', children: ['Prinsip Hukum Pascal', 'Persamaan P₁ = P₂', 'Aplikasi: Dongkrak Hidrolik', 'Aplikasi: Rem Hidrolik'] },
      { label: 'Hukum Archimedes', children: ['Gaya Apung (Fa = ρgV)', 'Benda Tenggelam, Melayang, Terapung', 'Syarat Tenggelam dan Terapung', 'Contoh Archimedes dalam Kehidupan'] },
      { label: 'Tekanan Gas', children: ['Tekanan Atmosfer', 'Barometer Torricelli', 'Manometer', 'Satuan Tekanan (atm, Pa, mmHg)'] },
      { label: 'Bejana Berhubungan', children: ['Prinsip Bejana Berhubungan', 'Pipa U (Manometer)', 'Aplikasi dalam Pipa Paralon', 'Hukum Utama Hidrostatika'] },
      { label: 'Kapal Laut & Balon Udara', children: ['Mengapa Kapal Terapung?', 'Kehidupan Ikan di Air', 'Prinsip Archimedes pada Balon', 'Tekanan Udara pada Ketinggian'] },
    ],
    youtubeQueries: [
      'tekanan zat cair fisika SMP kelas 8',
      'hukum archimedes pascal SMP',
    ],
  },

  'Usaha dan Energi': {
    branches: [
      { label: 'Usaha (Kerja)', children: ['Rumus W = F·s·cos θ', 'Satuan Joule', 'Usaha Positif, Negatif, Nol', 'Usaha oleh Gaya Tidak Searah'] },
      { label: 'Energi Kinetik', children: ['Rumus Ek = ½mv²', 'Energi Gerak', 'Hubungan Usaha dan Ek', 'Contoh Energi Kinetik'] },
      { label: 'Energi Potensial Gravitasi', children: ['Rumus Ep = mgh', 'Energi Benda pada Ketinggian', 'Energi Potensial Pegas', 'Ketinggian Acuan'] },
      { label: 'Energi Mekanik', children: ['Em = Ek + Ep', 'Hukum Kekekalan Energi Mekanik', 'Aplikasi EM pada Gerak Jatuh', 'Aplikasi EM pada Ayunan'] },
      { label: 'Daya (Power)', children: ['Rumus P = W/t', 'Satuan Watt', 'Hubungan Daya dan Kecepatan', 'Efisiensi Mesin'] },
      { label: 'Tuas & Katrol', children: ['Pengungkit Jenis 1, 2, 3', 'Keuntungan Mekanis Tuas', 'Katrol Tetap dan Bergerak', 'Kombinasi Katrol (Takal)'] },
      { label: 'Hukum Kekekalan Energi', children: ['Energi Tidak Dapat Dibuat/Dimusnahkan', 'Transformasi Energi', 'Konversi Energi', 'Sumber Energi Terbarukan'] },
    ],
    youtubeQueries: [
      'usaha dan energi fisika SMP kelas 8',
      'energi kinetik potensial SMP',
    ],
  },

  'Getaran dan Gelombang': {
    branches: [
      { label: 'Getaran', children: ['Definisi Getaran', 'Amplitudo (A)', 'Periode (T) dan Frekuensi (f)', 'Hubungan T dan f: f = 1/T'] },
      { label: 'Pegas dan Bandul Sederhana', children: ['Getaran Pegas', 'Konstanta Pegas k', 'Getaran Bandul Sederhana', 'Faktor yang Mempengaruhi Periode'] },
      { label: 'Gelombang Transversal', children: ['Crest (Puncak) dan Trough (Lembah)', 'Panjang Gelombang (λ)', 'Amplitudo Gelombang', 'Arah Rambat vs Arah Getar'] },
      { label: 'Gelombang Longitudinal', children: ['Rapat dan Renggang', 'Panjang Gelombang Longitudinal', 'Sinar Gelombang', 'Contoh: Gelombang Bunyi'] },
      { label: 'Rumus Gelombang', children: ['v = λ × f', 'v = λ / T', 'Menghitung Cepat Rambat', 'Soal-aplikasi Gelombang'] },
      { label: 'Sifat-Sifat Gelombang', children: ['Pemantulan (Refleksi)', 'Pembiasan (Refraksi)', 'Difraksi (Pelenturan)', 'Interferensi (Penggabungan)'] },
      { label: 'Bunyi dan Cahaya sebagai Gelombang', children: ['Bunyi: Gelombang Longitudinal', 'Cahaya: Gelombang Transversal', 'Pemantulan Bunyi dan Cahaya', 'Resonansi dan Echo'] },
    ],
    youtubeQueries: [
      'getaran dan gelombang fisika SMP kelas 8',
      'gelombang transversal longitudinal SMP',
    ],
  },

  // ── SMA_2 ─────────────────────────────────────────────────────────────────
  'Dinamika Gerak': {
    branches: [
      { label: 'Hukum Newton pada Gerak Lurus', children: ['Gaya Net dan Percepatan', 'Diagram Gaya Bebas', 'Aplikasi Hukum Newton II', 'Massa dan Inersia pada Gerak'] },
      { label: 'Gaya Normal dan Gesek pada Bidang Datar/Miring', children: ['Gaya Normal pada Bidang Datar', 'Gaya Normal pada Bidang Miring', 'Gaya Gesek Statis dan Kinetis', 'Koefisien Gesekan μs dan μk'] },
      { label: 'Hukum Newton pada Katrol', children: ['Katrol Tetap', 'Katrol Bergerak', 'Sistem Katrol dan Beban', 'Keuntungan Mekanis Katrol'] },
      { label: 'Gaya Sentripetal', children: ['Arah Menuju Pusat Lingkaran', 'Rumus Fs = mv²/r', 'Contoh Gerak Melingkar Vertikal', 'Gaya Normal pada Lingkaran Vertikal'] },
      { label: 'Dinamika Gerak Melingkar', children: ['Percepatan Sentripetal as = v²/r', 'Hubungan Fs dan as', 'Gerakan di Tikungan Jalan', 'Ayunan Konis'] },
      { label: 'Hukum Gravitasi Newton', children: ['F = G·Mm/r²', 'Konstanta Gravitasi G', 'Percepatan Gravitasi g', 'Variasi g pada Ketinggian dan Kedalaman'] },
      { label: 'Lintasan Parabola (Gerak Proyektil)', children: ['Analisis Gerak Parabola', 'Kecepatan Awal dan Sudut Elevasi', 'Tinggi Maksimum dan Jarak Terjauh', 'Persamaan Parametrik x(t) dan y(t)'] },
    ],
    youtubeQueries: [
      'dinamika gerak fisika SMA kelas 11',
      'hukum newton gerak melingkar SMA',
    ],
  },

  'Fluida': {
    branches: [
      { label: 'Fluida Statis', children: ['Tekanan Hidrostatis', 'Hukum Pascal', 'Hukum Archimedes', 'Kapilaritas dan Viskositas'] },
      { label: 'Tekanan pada Fluida', children: ['Tekanan Hidrostatis P = ρgh', 'Tekanan Mutlak dan Gauge', 'Barometer dan Manometer', 'Satuan Tekanan'] },
      { label: 'Hukum Archimedes', children: ['Gaya Apung Fa = ρf·g·Vf', 'Benda Terapung, Melayang, Tenggelam', 'Massa Jenis Relatif', 'Hidrostatis pada Benda Tercelup'] },
      { label: 'Hukum Pascal & Penerapannya', children: ['Dongkrak Hidrolik', 'Rem Hidrolik', 'Mesin Pengepres', 'Flotation Device'] },
      { label: 'Fluida Dinamis', children: ['Debit Aliran Q = Av', 'Persamaan Kontinuitas A₁v₁ = A₂v₂', 'Hukum Bernoulli', 'Tabung Venturi dan Tabung Pitot'] },
      { label: 'Persamaan Bernoulli', children: ['P + ½ρv² + ρgh = konstan', 'Aplikasi pada Pipa Sempit (Venturi)', 'Gaya Angkat Sayap Pesawat', 'Penyempitan Pipa dan Kecepatan'] },
      { label: 'Viskositas dan Hukum Stokes', children: ['Viskositas Zat Cair', 'Gaya Stokes Fs = 6πηrv', 'Kecepatan Terminal', 'Pengukuran Viskositas dengan Bola Jatuh'] },
    ],
    youtubeQueries: [
      'fluida statis dinamis fisika SMA kelas 11',
      'hukum bernoulli fisika SMA',
    ],
  },

  'Kalor': {
    branches: [
      { label: 'Pengertian Kalor dan Suhu', children: ['Kalor sebagai Energi Panas', 'Satuan Kalor (Joule & Kalori)', 'Hubungan Kalor dan Suhu', 'Kalor Jenis (c)'] },
      { label: 'Perpindahan Kalor', children: ['Konduksi', 'Konveksi (Alami dan Paksa)', 'Radiasi', 'Contoh Sehari-hari Tiap Jenis'] },
      { label: 'Asas Black', children: ['Qlepas = Qterima', 'Kalorimeter Sederhana', 'Kalor Jenis dan Kapasitas Kalor', 'Hukum Kekekalan Energi Termal'] },
      { label: 'Pemuaian Zat', children: ['Pemuaian Panjang ΔL = L₀αΔT', 'Pemuaian Luas ΔA = A₀βΔT', 'Pemuaian Volume ΔV = V₀γΔT', 'Koefisien Muai'] },
      { label: 'Kalor Laten dan Perubahan Wujud', children: ['Kalor Laten Lebur (L)', 'Kalor Laten Uap (U)', 'Grafik Perubahan Wujud', 'Perhitungan Kalor pada Perubahan Wujud'] },
      { label: 'Mesin Kalor dan Effisiensi', children: ['Mesin Carnot', 'Effisiensi η = 1 - Tc/Th', 'Hukum Termodinamika I', 'Hubungan Kalor dan Usaha Mesin'] },
      { label: 'Penerapan Perpindahan Kalor', children: ['Termos (Isolator)', 'Radiator dan Kolektor Surya', 'Pendinginan Evaporatif', 'Konduksi pada Logam dan Isolator'] },
    ],
    youtubeQueries: [
      'kalor dan perpindahan kalor fisika SMA kelas 11',
      'asas black kalorimeter SMA',
    ],
  },
};

// ─── Database helpers ─────────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 generate-fisika-mindmaps.cjs\n');

  const client = new Client(DB_CONFIG);
  await client.connect();

  // Fetch all Fisika materials from both curricula
  const res = await client.query(
    `SELECT id, "topic", "subTopic", "gradeLevel", "curriculumId"
     FROM "Material"
     WHERE subject = 'Fisika'
     AND ("curriculumId" = $1 OR "curriculumId" = $2)
     ORDER BY "curriculumId", "gradeLevel", "weekOrder", "topic", "subTopic"`,
    [SMP_CURRICULUM_ID, SMA_CURRICULUM_ID]
  );

  const materials = res.rows;
  console.log(`📚 Found ${materials.length} Fisika materials\n`);

  let updatedMindmaps = 0;
  let updatedVideos = 0;
  const topicsHandled = new Set();

  for (const mat of materials) {
    const topic = mat.topic;
    const topicDef = FISIKA_TOPICS[topic];

    if (!topicDef) {
      console.warn(`⚠️  No topic definition for: ${topic}`);
      continue;
    }

    // ── Generate mindmap ──
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

    // ── Search YouTube (once per unique topic) ──
    if (!topicsHandled.has(topic)) {
      topicsHandled.add(topic);
      console.log(`\n🔍 YouTube search for: "${topic}"`);

      let videoUrl = null;
      for (const query of topicDef.youtubeQueries) {
        try {
          const results = await youtubeSearch(`${query} kelas 11 IPA Indonesia`);
          if (results.length > 0) {
            videoUrl = results[0].url;
            console.log(`   ✅ Found: "${results[0].title}" → ${videoUrl}`);
            break;
          }
        } catch (e) {
          console.warn(`   ⚠️  YouTube search error for "${query}": ${e.message}`);
        }
        // Small delay to avoid rate limit
        await new Promise(r => setTimeout(r, 300));
      }

      if (videoUrl) {
        // Update all materials with this topic
        await client.query(
          `UPDATE "Material"
           SET "videoUrl" = $1, "updatedAt" = NOW()
           WHERE subject = 'Fisika' AND topic = $2`,
          [videoUrl, topic]
        );
        updatedVideos++;
        console.log(`   📺 videoUrl set for all materials under topic: ${topic}`);
      } else {
        console.warn(`   ❌ No YouTube results found for topic: ${topic}`);
      }
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`✅ Mindmaps updated : ${updatedMindmaps}/10`);
  console.log(`✅ Video URLs set   : ${updatedVideos} topics`);
  console.log('─'.repeat(60));

  await client.end();
}

main().catch(err => {
  console.error('❌ Script error:', err);
  process.exit(1);
});
