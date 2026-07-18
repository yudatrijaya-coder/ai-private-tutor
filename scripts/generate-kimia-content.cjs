/**
 * Generate Kimia SMA XI content for SHOFI
 * Kurikulum Merdeka — based on ProSem 2627 Kimia Kelas XI
 * 
 * Topics from ProSem:
 * Ganjil: Termokimia, Laju Reaksi, Kesetimbangan Kimia, Asam Basa
 * Genap: Larutan Penyangga, Hidrolisis Garam, Titrasi Asam Basa, Hidrokarbon & Minyak Bumi
 */

const https = require('https');

const CURRICULUM_ID = '98f0274e-4e39-45f5-9c79-3632c5717b27';
const DB_CONFIG = {
  host: 'localhost',
  user: 'tutor',
  password: 'tutor123',
  database: 'ai_private_tutor',
};

const KIMIA_TOPICS = [
  // ── SEMESTER GANJIL ──
  {
    topic: 'Termokimia',
    subTopics: [
      { subTopic: 'Konsep Termokimia dan Reaksi Eksoterm-Endoterm', jp: 2 },
      { subTopic: 'Penentuan Perubahan Entalpi Reaksi (ΔH)', jp: 4 },
      { subTopic: 'Hukum Hess dan Diagram Siklus Energi', jp: 4 },
      { subTopic: 'Entalpi Pembentukan Standar dan Energi Ikatan', jp: 4 },
      { subTopic: 'Aplikasi Termokimia dalam Kehidupan', jp: 2 },
    ],
  },
  {
    topic: 'Laju Reaksi',
    subTopics: [
      { subTopic: 'Pengertian dan Percobaan Laju Reaksi', jp: 2 },
      { subTopic: 'Faktor-Faktor yang Mempengaruhi Laju Reaksi', jp: 2 },
      { subTopic: 'Teori Tumbukan', jp: 2 },
      { subTopic: 'Orde Reaksi dan Persamaan Laju Reaksi', jp: 4 },
      { subTopic: 'Penentuan Laju Reaksi dari Data Percobaan', jp: 4 },
      { subTopic: 'Hukum Laju Terintegrasi dan Waktu Paruh', jp: 2 },
    ],
  },
  {
    topic: 'Kesetimbangan Kimia',
    subTopics: [
      { subTopic: 'Konsep Kesetimbangan Dinamis', jp: 2 },
      { subTopic: 'Tetapan Kesetimbangan (Kc dan Kp)', jp: 4 },
      { subTopic: 'Hubungan Kc dan Kp', jp: 2 },
      { subTopic: 'Pergeseran Kesetimbangan (Prinsip Le Chatelier)', jp: 4 },
      { subTopic: 'Faktor yang Mempengaruhi Kesetimbangan', jp: 2 },
      { subTopic: 'Aplikasi Kesetimbangan: Proses Haber-Bosch dan Proses Kontak', jp: 2 },
    ],
  },
  {
    topic: 'Asam dan Basa',
    subTopics: [
      { subTopic: 'Teori Asam Basa (Arrhenius, Bronsted-Lowry, Lewis)', jp: 2 },
      { subTopic: 'Kekuatan Asam dan Basa', jp: 2 },
      { subTopic: 'Konstanta Asam (Ka) dan Konstanta Basa (Kb)', jp: 4 },
      { subTopic: 'pH, pOH, dan Skala Keasaman', jp: 4 },
      { subTopic: 'Indikator Asam Basa dan Titrasi Asam Basa', jp: 2 },
      { subTopic: 'Kurva Titrasi dan Titik Ekuivalen', jp: 2 },
      { subTopic: 'Aplikasi Asam Basa dalam Kehidupan dan Industri', jp: 2 },
    ],
  },
  // ── SEMESTER GENAP ──
  {
    topic: 'Larutan Penyangga',
    subTopics: [
      { subTopic: 'Pengertian dan Komposisi Larutan Penyangga', jp: 2 },
      { subTopic: 'Cara Kerja Larutan Penyangga', jp: 2 },
      { subTopic: 'pH Larutan Penyangga', jp: 4 },
      { subTopic: 'Fungsi dan Aplikasi Larutan Penyangga', jp: 2 },
      { subTopic: 'Pembuatan dan Percobaan Larutan Penyangga', jp: 2 },
    ],
  },
  {
    topic: 'Hidrolisis Garam',
    subTopics: [
      { subTopic: 'Reaksi Asam-Basa dan Pembentukan Garam', jp: 2 },
      { subTopic: 'Konsep Hidrolisis Garam', jp: 2 },
      { subTopic: 'Jenis Garam dan Sifat Hidrolisisnya', jp: 2 },
      { subTopic: 'pH Larutan Garam', jp: 4 },
      { subTopic: 'Tetapan Hidrolisis (Kh) dan Hubungannya dengan Ka/Kb', jp: 2 },
    ],
  },
  {
    topic: 'Titrasi Asam-Basa',
    subTopics: [
      { subTopic: 'Prinsip dan Prosedur Titrasi', jp: 2 },
      { subTopic: 'Titrasi Asam Kuat-Basa Kuat', jp: 2 },
      { subTopic: 'Titrasi Asam Kuat-Basa Lemah dan Sebaliknya', jp: 4 },
      { subTopic: 'Kurva Titrasi dan Indikator', jp: 2 },
      { subTopic: 'Perhitungan Kadar/Lembab dalam Titrasi', jp: 4 },
    ],
  },
  {
    topic: 'Hidrokarbon dan Minyak Bumi',
    subTopics: [
      { subTopic: 'Kekhasan Atom Karbon dan Senyawa Hidrokarbon', jp: 2 },
      { subTopic: 'Alkana: Sifat dan Tata Nama', jp: 2 },
      { subTopic: 'Alkena dan Alkuna: Sifat dan Tata Nama', jp: 2 },
      { subTopic: 'Isomeri pada Hidrokarbon', jp: 4 },
      { subTopic: 'Reaksi-Reaksi Hidrokarbon', jp: 4 },
      { subTopic: 'Minyak Bumi dan Proses Penyulingan (Fraksinasi)', jp: 2 },
      { subTopic: 'Bensin, Avtur, dan Produk Olahan Minyak Bumi', jp: 2 },
      { subTopic: 'Dampak Pembakaran Hidrokarbon terhadap Lingkungan', jp: 2 },
    ],
  },
];

// ── APA Citation untuk setiap topik (BM = Buku Mandiri/SIBI, Ref = Referensi)
const APA_CITATIONS = {
  'Termokimia': 'Sudarmo, U. (2021). *Kimia untuk SMA/MA Kelas XI*. Jakarta: Erlangga.',
  'Laju Reaksi': 'Sudarmo, U. (2021). *Kimia untuk SMA/MA Kelas XI*. Jakarta: Erlangga.',
  'Kesetimbangan Kimia': 'Sudarmo, U. (2021). *Kimia untuk SMA/MA Kelas XI*. Jakarta: Erlangga.',
  'Asam dan Basa': 'Sudarmo, U. (2021). *Kimia untuk SMA/MA Kelas XI*. Jakarta: Erlangga.',
  'Larutan Penyangga': 'Sudarmo, U. (2021). *Kimia untuk SMA/MA Kelas XI*. Jakarta: Erlangga.',
  'Hidrolisis Garam': 'Sudarmo, U. (2021). *Kimia untuk SMA/MA Kelas XI*. Jakarta: Erlangga.',
  'Titrasi Asam-Basa': 'Sudarmo, U. (2021). *Kimia untuk SMA/MA Kelas XI*. Jakarta: Erlangga.',
  'Hidrokarbon dan Minyak Bumi': 'Sudarmo, U. (2021). *Kimia untuk SMA/MA Kelas XI*. Jakarta: Erlangga.',
};

// ── Mindmap node templates per topic
function getMindmapTemplate(topic, subTopics) {
  const nodeCount = subTopics.length;
  return {
    center: { text: topic, x: 400, y: 300, color: '#3b82f6', fontSize: 20 },
    branches: subTopics.map((s, i) => {
      const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
      const radius = 180;
      return {
        text: s.subTopic,
        x: Math.round(400 + radius * Math.cos(angle)),
        y: Math.round(300 + radius * Math.sin(angle)),
        color: '#6366f1',
        fontSize: 13,
        parent: topic,
      };
    }),
  };
}

// ── Generate mindmap content
function generateMindmap(topic, subTopics) {
  const template = getMindmapTemplate(topic, subTopics);
  return {
    center: { text: topic, x: 400, y: 300, color: '#3b82f6', fontSize: 20 },
    branches: subTopics.map((s, i) => {
      const angle = (2 * Math.PI * i) / subTopics.length - Math.PI / 2;
      const radius = 180;
      return {
        text: s.subTopic,
        x: Math.round(400 + radius * Math.cos(angle)),
        y: Math.round(300 + radius * Math.sin(angle)),
        color: '#6366f1',
        fontSize: 13,
        parent: topic,
      };
    }),
  };
}

// ── Generate mindmap content field (for DB metadata)
function generateMindmapContent(topic, subTopics) {
  const nodes = [{ id: 'center', text: topic, x: 400, y: 300, color: '#3b82f6', fontSize: 20 }];
  const conns = [];
  subTopics.forEach((s, i) => {
    const angle = (2 * Math.PI * i) / subTopics.length - Math.PI / 2;
    const radius = 180;
    const nx = Math.round(400 + radius * Math.cos(angle));
    const ny = Math.round(300 + radius * Math.sin(angle));
    nodes.push({ id: `n${i}`, text: s.subTopic, x: nx, y: ny, color: '#6366f1', fontSize: 13 });
    conns.push(['center', `n${i}`]);
  });
  return JSON.stringify({ nodes, connections: conns });
}

// ── Generate slide markdown
function generateSlideMd(topic, subTopic, jp) {
  return `# ${subTopic}\n\n**Mata Pelajaran:** Kimia | **Kelas:** XI SMA\n**Topik:** ${topic} | **JP:** ${jp} jp\n\n---\n\n## Tujuan Pembelajaran\n\nSetelah mempelajari materi ini, peserta didik diharapkan mampu:\n\n- Menjelaskan konsep ${subTopic.toLowerCase()}\n- Menganalisis dan menyelesaikan masalah terkait ${subTopic.toLowerCase()}\n\n---\n\n## Materi Inti\n\n### Pengertian\n\n\`\`\`\n[Materi utama tentang ${subTopic}]\n\`\`\`\n\n### Contoh Soal\n\n**Contoh 1:**\n> [Soal dan pembahasan]\n\n---\n\n## Ringkasan\n\n1. Poin utama ${subTopic}\n2. Rumus/formula penting\n3. Catatan kritis\n\n---\n\n*Ditulis untuk Kurikulum Merdeka SMA XI — Kimia*\n`;
}

// ── PostgreSQL helper
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

async function insertMaterials() {
  console.log('🎬 Starting Kimia content generation for SHOFI...\n');

  let totalMaterials = 0;
  let totalQuizzes = 0;

  for (const topicData of KIMIA_TOPICS) {
    const { topic, subTopics } = topicData;
    const mindmapContent = generateMindmapContent(topic, subTopics);
    const apa = APA_CITATIONS[topic] || '';

    console.log(`\n📗 ${topic} (${subTopics.length} sub-topik)`);

    for (const st of subTopics) {
      const { subTopic, jp } = st;
      totalMaterials++;

      // Check if material already exists
      const existing = await queryDb(
        `SELECT id FROM "Material" WHERE "curriculumId" = $1 AND "topic" = $2 AND "subTopic" = $3`,
        [CURRICULUM_ID, topic, subTopic]
      );

      if (existing.rows.length > 0) {
        console.log(`  ⏭️  EXISTS: ${subTopic} — skip`);
        continue;
      }

      const slideMd = generateSlideMd(topic, subTopic, jp);
      const metadataJson = JSON.stringify({
        slide: slideMd,
        mindmap: mindmapContent,
        youtubeUrl: null,
        youtubeTitle: null,
        source: 'Kurikulum Merdeka + ProSem 2627 Kimia XI',
        textbook: apa,
        jp,
        semester: KIMIA_TOPICS.indexOf(topicData) < 4 ? 'ganjil' : 'genap',
      });

      const result = await queryDb(
        `INSERT INTO "Material" ("id", "curriculumId", "subject", "topic", "subTopic", "gradeLevel", "weekOrder", "priority", "delivery", "status", "metadata", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         RETURNING id`,
        [
          CURRICULUM_ID,
          'Kimia',
          topic,
          subTopic,
          'SMA_2',
          0,
          8,
          'TEXT',
          'READY',
          metadataJson,
        ]
      );

      const matId = result.rows[0].id;
      console.log(`  ✅ INSERT: ${subTopic} (id=${matId.substring(0, 8)})`);
    }
  }

  console.log(`\n✅ Done! Total materials: ${totalMaterials}`);
}

insertMaterials().catch(console.error);
