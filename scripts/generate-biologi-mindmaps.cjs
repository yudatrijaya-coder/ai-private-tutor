/**
 * Generate comprehensive mindmaps + YouTube URLs for all 5 Biologi SMA materials.
 * 
 * 1. Fetches all 5 Biologi SMA materials from the database
 * 2. Generates rich mindmap JSON (root=topic, 5-8 branches with children)
 * 3. Searches YouTube Data API v3 for working video URLs
 * 4. Updates metadata->>'mindmap' and videoUrl in the database
 * 
 * YouTube Data API key: AIzaSyDoLUc4CO2oeRTR-fd2iu_0Elb11htyx0Q
 * DB: localhost / tutor / tutor123 / ai_private_tutor
 */

const https = require('https');

const DB_CONFIG = {
  host: 'localhost',
  user: 'tutor',
  password: 'tutor123',
  database: 'ai_private_tutor',
};

const YOUTUBE_API_KEY = 'AIzaSyDoLUc4CO2oeRTR-fd2iu_0Elb11htyx0Q';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

const CURRICULUM_ID = '98f0274e-4e39-45f5-9c79-3632c5717b27';

// ── Rich mindmap definitions for each Biologi SMA topic ──────────────────────
// Format: root label + 5-8 branches, each branch may have 2-4 child nodes
const TOPIC_MINDMAPS = {
  'Sistem Pencernaan': {
    root: 'Sistem Pencernaan',
    branches: [
      {
        label: 'Organ Pencernaan',
        children: [
          'Mulut (gigi, lidah, kelenjar ludah)',
          'Kerongkongan (Esofagus)',
          'Lambung (Ventrikel)',
          'Usus Halus (Duodenum, Jejunum, Ileum)',
          'Usus Besar (Kolon)',
          'Rektum dan Anus',
        ],
      },
      {
        label: 'Enzim Pencernaan',
        children: [
          'Ptialin (amilase liur) – memecah pati',
          'Pepsin – memecah protein di lambung',
          'Tripsin – memecah protein di usus halus',
          'Lipase – memecah lemak',
          'Maltase, Laktase, Sukrase – memecah disakarida',
        ],
      },
      {
        label: 'Proses Pencernaan',
        children: [
          'Ingesti – masuknya makanan ke mulut',
          'Digesti mekanik – pengunyahan & peristaltik',
          'Digesti kimiawi – kerja enzim',
          'Absorpsi – penyerapan nutrien di usus halus',
          'Defekasi – pengeluaran sisa makanan',
        ],
      },
      {
        label: 'Nutrisi yang Diserap',
        children: [
          'Glukosa & asam amino – dinding usus halus',
          'Asam lemak & gliserol – saluran limfa',
          'Vitamin & mineral – difusi & transport aktif',
          'Air – absorbsi di usus besar',
        ],
      },
      {
        label: 'Gangguan Sistem Pencernaan',
        children: [
          'Gastritis (radang lambung)',
          'Maag / GERD',
          'Konstipasi (sembelit)',
          'Diare',
          'Usus buntu (apendisitis)',
        ],
      },
    ],
  },

  'Sistem Sirkulasi': {
    root: 'Sistem Sirkulasi',
    branches: [
      {
        label: 'Jantung',
        children: [
          'Atrium kanan & kiri (serambi)',
          'Ventrikel kanan & kiri (bilik)',
          'Katup jantung (bikuspidal, trikuspidal)',
          'Siklus jantung (sistol & diastol)',
          'Denyut jantung & curah jantung',
        ],
      },
      {
        label: 'Pembuluh Darah',
        children: [
          'Arteri – membawa darah dari jantung',
          'Vena – membawa darah ke jantung',
          'Kapiler – pertukaran zat di jaringan',
          'Aorta, vena cava, arteri pulmonalis',
        ],
      },
      {
        label: 'Darah',
        children: [
          'Eritrosit (sel darah merah) – transportasi O₂',
          'Leukosit (sel darah putih) – imunitas',
          'Trombosit (keping darah) – pembekuan',
          'Plasma darah – medium transportasi',
          'Hemoglobin & gondongan (Hb)',
        ],
      },
      {
        label: 'Golongan Darah',
        children: [
          'Sistem ABO (A, B, AB, O)',
          'Rhesus (Rh+) dan (Rh-)',
          'Transfusi darah yang kompatibel',
          'Antigen & antibodi dalam plasma',
        ],
      },
      {
        label: 'Sirkulasi Darah',
        children: [
          'Sirkulasi sistemik (jantung → tubuh → jantung)',
          'Sirkulasi pulmonal (jantung → paru → jantung)',
          'Peredaran darah kapiler',
          'Tekanan darah sistol & diastol',
        ],
      },
      {
        label: 'Gangguan Sistem Sirkulasi',
        children: [
          'Anemia – kekurangan hemoglobin',
          'Leukemia – kanker sel darah putih',
          'Varises – pelebaran vena',
          'Hipertensi – tekanan darah tinggi',
          'Aterosklerosis – penyempitan pembuluh darah',
        ],
      },
    ],
  },

  'Sistem Respirasi': {
    root: 'Sistem Respirasi',
    branches: [
      {
        label: 'Organ Respirasi',
        children: [
          'Hidung – filtrasi, penyaringan udara',
          'Faring – persimpangan udara & makanan',
          'Laring – mengandung pita suara',
          'Trakea – saluran udara utama',
          'Bronkus & bronkiolus',
          'Alveolus – tempat pertukaran gas',
          'Paru-paru – organ utama respirasi',
        ],
      },
      {
        label: 'Mekanisme Pernapasan',
        children: [
          'Inspirasi – udara masuk ke paru-paru',
          'Ekspirasi – udara keluar dari paru-paru',
          'Peran otot diafragma & interkostal',
          'Volume udara pernapasan (TV, IRV, ERV, RV)',
          'Kapasitas vital paru-paru',
        ],
      },
      {
        label: 'Pertukaran Gas',
        children: [
          'Diffusi O₂ dari alveolus ke darah kapiler',
          'Diffusi CO₂ dari darah ke alveolus',
          'Pengikatan O₂ oleh hemoglobin (oksioglobin)',
          'Pelepasan CO₂ dari darah ke alveolus',
          'Tekanan parsial gas (Hukum Henry)',
        ],
      },
      {
        label: 'Regulasi Pernapasan',
        children: [
          'Pusat pernapasan di medulla oblongata',
          'Reseptor kimia – CO₂ dalam darah',
          'Reseptor regang paru-paru',
          'Pengaruh olahraga & ketinggian',
        ],
      },
      {
        label: 'Gangguan Sistem Respirasi',
        children: [
          'Asma – penyempitan bronkus',
          'Bronkitis – radang bronkus',
          'Pneumonia – radang paru-paru',
          'TBC (Tuberkulosis) – infeksi Mycobacterium',
          'Emfisema – kerusakan alveolus',
        ],
      },
    ],
  },

  'Sistem Gerak': {
    root: 'Sistem Gerak',
    branches: [
      {
        label: 'Tulang (Sistem Rangka)',
        children: [
          'Tulang axial – tengkorak, vertebra, rusuk, sternum',
          'Tulang appendikular – ekstremitas atas & bawah',
          'Jenis tulang – pipa, pipih, pendek, tidak beraturan',
          'Tulang rawan (kartilago) vs tulang keras',
          'Proses osifikasi – pembentukan tulang',
          'Sendi: engsel, peluru, geser, putar, luncur',
        ],
      },
      {
        label: 'Otot',
        children: [
          'Otot lurik (rangka) – bergerak sadar',
          'Otot polos – bergerak tidak sadar (organ dalam)',
          'Otot jantung (miokardium) – kontraksi jantung',
          'Mekanisme kontraksi otot (aktin-miosin)',
          'ATP sebagai sumber energi kontraksi',
          'Kelelahan otot & recovery',
        ],
      },
      {
        label: 'Sendi',
        children: [
          'Sendi sinartrosis – tidak bergerak (tengkorak)',
          'Sendi amfiartrosis – sedikit bergerak (vertebra)',
          'Sendi diartrosis – bebas bergerak',
          'Ligamen – pengikat tulang di sendi',
          'Cairan sinovial – pelumas sendi',
          ' Bursa – bantalan sendi',
        ],
      },
      {
        label: 'Proses Gerak',
        children: [
          'Stimulus saraf → kontraksi otot',
          'Pasangan otot antagonis (biceps & triceps)',
          'Tuas / tuas type 1, 2, 3 pada tubuh',
          'Koordinasi otot untuk gerakan kompleks',
        ],
      },
      {
        label: 'Gangguan Sistem Gerak',
        children: [
          'Osteoporosis – kepadatan tulang menurun',
          'Artritis – radang sendi',
          'Skoliosis – kelainan lengkung tulang belakang',
          'Lordosis & Kifosis',
          'Keseleo / terkilir (sprain)',
          'Dislokasi – tulang keluar dari sendi',
        ],
      },
    ],
  },

  'Sistem Ekskresi': {
    root: 'Sistem Ekskresi',
    branches: [
      {
        label: 'Organ Ekskresi',
        children: [
          'Ginjal – organ utama penyaring darah',
          'Kulit – mengeluarkan keringat',
          'Paru-paru – mengeluarkan CO₂ & H₂O',
          'Hati – mendetoksifikasi & mengubah amonia',
        ],
      },
      {
        label: 'Ginjal',
        children: [
          'Korteks ginjal – tempat filtrasi (nefron)',
          'Medula ginjal – mengandung piramida renal',
          'Pelvis renalis – rongga pengumpul urine',
          'Nefron – unit fungsional ginjal',
          'Kapsul Bowman – filtrasi darah',
          'Tubulus kontortus proksimal – reabsorpsi',
          'Lengkung Henle – konsentrasi urine',
          'Tubulus kontortus distal & duktus kolektivus',
        ],
      },
      {
        label: 'Proses Pembentukan Urine',
        children: [
          'Filtrasi – darah disaring di glomerulus',
          'Reabsorpsi – zat útil dikembalikan ke darah',
          'Augmentasi – penambahan zat sisa di tubulus',
          'Konsentrasi urine – peran Lengkung Henle',
          'Hormon ADH mengatur volume urine',
        ],
      },
      {
        label: 'Kulit (Integumen)',
        children: [
          'Epidermis – lapisan luar (melanin, keratin)',
          'Dermis – lapisan dalam (kelenjar keringat)',
          'Hipodermis – jaringan ikat & lemak',
          'Kelenjar keringat – ekskresi air & garam',
          'Pori-pori – saluran keringat ke permukaan',
          'Termoregulasi melalui keringat',
        ],
      },
      {
        label: 'Paru-paru & Hati',
        children: [
          'Paru-paru – ekskresi CO₂ hasil respirasi sel',
          'Hati – mengubah amonia → ureum (siklus ornitin)',
          'Detoksifikasi obat & racun di hati',
          'Empedu – hasil ekskresi hati (warna kuning kecoklatan)',
        ],
      },
      {
        label: 'Gangguan Sistem Ekskresi',
        children: [
          'Nefritis – radang ginjal',
          'Batu ginjal – kristal di saluran kemih',
          'Gagal ginjal – ginjal tidak berfungsi',
          'Diabetes insipidus – gangguan ADH',
          'Keringat berlebih (hiperhidrosis)',
          'Ikterus – gangguan pada hati (kulit kuning)',
        ],
      },
    ],
  },
};

// ── YouTube search queries per topic ─────────────────────────────────────────
const YOUTUBE_QUERIES = {
  'Sistem Pencernaan': [
    'Sistem Pencernaan Manusia Biologi SMA',
    'Organ Pencernaan Manusia kelas 11',
  ],
  'Sistem Sirkulasi': [
    'Sistem Sirkulasi Darah Manusia Biologi SMA',
    'Jantung dan Pembuluh Darah kelas 11',
  ],
  'Sistem Respirasi': [
    'Sistem Pernapasan Manusia Biologi SMA',
    'Mekanisme Pernapasan kelas 11',
  ],
  'Sistem Gerak': [
    'Sistem Gerak Manusia Tulang Otot Sendi SMA',
    'Tulang dan Otot Manusia kelas 11',
  ],
  'Sistem Ekskresi': [
    'Sistem Ekskresi Manusia Biologi SMA',
    'Ginjal dan Pembentukan Urine kelas 11',
  ],
};

// ── DB helper ────────────────────────────────────────────────────────────────
function queryDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    const { Client } = require('pg');
    const client = new Client(DB_CONFIG);
    client.connect();
    client.query(sql, params, (err, res) => {
      client.end();
      if (err) reject(err);
      else resolve(res);
    });
  });
}

// ── YouTube Data API v3 search ───────────────────────────────────────────────
function youtubeApiGet(method, params) {
  return new Promise((resolve, reject) => {
    const queryStr = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const path = `/youtube/v3/${method}?${queryStr}&key=${YOUTUBE_API_KEY}`;
    const options = {
      hostname: 'www.googleapis.com',
      path,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('YouTube API parse error: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('YouTube API timeout')); });
    req.end();
  });
}

async function searchYoutubeVideo(query) {
  try {
    const res = await youtubeApiGet('search', {
      part: 'snippet',
      q: query,
      type: 'video',
      videoDuration: 'medium',
      relevanceLanguage: 'id',
      maxResults: 5,
    });
    if (!res.items || res.items.length === 0) return null;
    // Pick the first result
    const item = res.items[0];
    return {
      videoId: item.id.videoId,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
    };
  } catch(e) {
    console.warn(`  ⚠️  YouTube search failed for "${query}": ${e.message}`);
    return null;
  }
}

// ── Verify video is playable via YouTube oembed ───────────────────────────────
function verifyVideoPlayable(videoId) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'www.youtube.com',
      path: `/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(true);
        else resolve(false);
      });
    });
    req.on('error', () => resolve(false));
    req.setTimeout(8000, () => { req.destroy(); resolve(false); });
    req.end();
  });
}

// ── Build rich mindmap JSON structure ────────────────────────────────────────
function buildMindmapJson(topicName, mindmapDef) {
  const { root, branches } = mindmapDef;

  // Root node
  const nodes = [{ id: 'root', label: root }];

  // Branch nodes with children
  branches.forEach((branch, bi) => {
    const branchId = `branch-${bi}`;
    nodes.push({ id: branchId, label: branch.label, parentId: 'root' });

    branch.children.forEach((childLabel, ci) => {
      nodes.push({
        id: `branch-${bi}-child-${ci}`,
        label: childLabel,
        parentId: branchId,
      });
    });
  });

  return JSON.stringify(nodes);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🧠 Starting Biologi SMA mindmap + YouTube generation...\n');

  // Step 1: Fetch all Biologi SMA materials from DB
  console.log('📡 Fetching Biologi SMA materials from database...');
  const mats = await queryDb(
    `SELECT id, "topic", "subTopic", "weekOrder", status, metadata, "videoUrl"
     FROM "Material"
     WHERE subject = 'Biologi' AND "gradeLevel" = 'SMA_2'
     ORDER BY "weekOrder"`
  );

  if (mats.rows.length === 0) {
    console.error('❌ No Biologi SMA materials found!');
    process.exit(1);
  }

  console.log(`✅ Found ${mats.rows.length} Biologi SMA materials:\n`);
  mats.rows.forEach(r => console.log(`   • ${r.topic}`));

  let updated = 0;
  let videoUpdated = 0;
  let mindmapUpdated = 0;

  for (const mat of mats.rows) {
    const topic = mat.topic;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📗 Topic: ${topic}`);
    console.log(`${'='.repeat(60)}`);

    const mindmapDef = TOPIC_MINDMAPS[topic];
    if (!mindmapDef) {
      console.warn(`⚠️  No mindmap definition for "${topic}" — skipping`);
      continue;
    }

    // ── Step 2: Build & set rich mindmap JSON ─────────────────────────────────
    const mindmapJson = buildMindmapJson(topic, mindmapDef);
    const branchCount = mindmapDef.branches.length;
    const totalChildren = mindmapDef.branches.reduce((sum, b) => sum + b.children.length, 0);

    // Update metadata->>'mindmap' using jsonb_set
    await queryDb(
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
    mindmapUpdated++;
    console.log(`  ✅ Mindmap set: ${branchCount} branches + ${totalChildren} child nodes`);

    // Print mindmap preview
    console.log(`  📋 Mindmap structure:`);
    mindmapDef.branches.forEach((b, i) => {
      console.log(`     ${i + 1}. ${b.label} (${b.children.length} children)`);
      b.children.forEach(c => console.log(`        ↳ ${c}`));
    });

    // ── Step 3: Search YouTube for video URLs ─────────────────────────────────
    const queries = YOUTUBE_QUERIES[topic] || [`${topic} Biologi SMA kelas 11`];
    let foundVideo = null;

    for (const query of queries) {
      if (foundVideo) break;
      console.log(`  🔍 Searching YouTube: "${query}"`);

      const result = await searchYoutubeVideo(query);
      if (!result) continue;

      // Verify the video is actually playable
      const playable = await verifyVideoPlayable(result.videoId);
      if (playable) {
        foundVideo = result;
        console.log(`     ✅ Found: "${result.title}"`);
        console.log(`        Channel: ${result.channel}`);
        console.log(`        URL: ${result.url}`);
      } else {
        console.log(`     ⚠️  Video not playable: ${result.url}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    // Fallback hardcoded URLs if API search fails
    if (!foundVideo) {
      console.log(`  ⚠️  YouTube search returned no playable video — using fallback`);
      const FALLBACK_VIDEOS = {
        'Sistem Pencernaan': 'https://www.youtube.com/watch?v=Kq9c6CL0p9E',
        'Sistem Sirkulasi': 'https://www.youtube.com/watch?v=4S8EzWsHNFg',
        'Sistem Respirasi': 'https://www.youtube.com/watch?v=2Y2aDb5aG40',
        'Sistem Gerak': 'https://www.youtube.com/watch?v=OIQsC0GpryU',
        'Sistem Ekskresi': 'https://www.youtube.com/watch?v=P3QVq4KT8Xw',
      };
      const fallbackUrl = FALLBACK_VIDEOS[topic];
      if (fallbackUrl) {
        const vidId = fallbackUrl.match(/watch\?v=([a-zA-Z0-9_-]{11})/)?.[1];
        const playable = vidId ? await verifyVideoPlayable(vidId) : false;
        if (playable) {
          foundVideo = { url: fallbackUrl, title: 'Biologi SMA', channel: 'EduChannel' };
          console.log(`     🔄 Fallback OK: ${fallbackUrl}`);
        }
      }
    }

    // ── Step 4: Update videoUrl in DB ──────────────────────────────────────────
    if (foundVideo) {
      await queryDb(
        `UPDATE "Material" SET "videoUrl" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [foundVideo.url, mat.id]
      );
      videoUpdated++;
      console.log(`  🎬 videoUrl updated: ${foundVideo.url}`);
    } else {
      console.log(`  ⚠️  No video URL available for ${topic}`);
    }

    updated++;
    console.log(`  ✅ Done: ${topic} (${updated}/${mats.rows.length})`);
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`   Materials processed : ${updated}`);
  console.log(`   Mindmaps set        : ${mindmapUpdated}`);
  console.log(`   YouTube URLs set    : ${videoUpdated}`);
  console.log(`\n✅ Script completed successfully!`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
