/**
 * Set mindmap for all 47 Kimia SMA XI materials for SHOFI
 */

const https = require('https');

const DB_CONFIG = {
  host: 'localhost',
  user: 'tutor',
  password: 'tutor123',
  database: 'ai_private_tutor',
};

const CURRICULUM_ID = '98f0274e-4e39-45f5-9c79-3632c5717b27';

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

function generateMindmap(topic, subTopics) {
  const nodes = [{ id: 'center', text: topic, x: 400, y: 300, color: '#3b82f6', fontSize: 20 }];
  const conns = [];
  subTopics.forEach((s, i) => {
    const angle = (2 * Math.PI * i) / subTopics.length - Math.PI / 2;
    const radius = 180;
    const nx = Math.round(400 + radius * Math.cos(angle));
    const ny = Math.round(300 + radius * Math.sin(angle));
    nodes.push({ id: `n${i}`, text: s, x: nx, y: ny, color: '#6366f1', fontSize: 13 });
    conns.push(['center', `n${i}`]);
  });
  return JSON.stringify({ nodes, connections: conns });
}

// Map topics to their sub-topics (in DB order)
const TOPIC_SUBTOPICS = {
  'Termokimia': [
    'Konsep Termokimia dan Reaksi Eksoterm-Endoterm',
    'Penentuan Perubahan Entalpi Reaksi (ΔH)',
    'Hukum Hess dan Diagram Siklus Energi',
    'Entalpi Pembentukan Standar dan Energi Ikatan',
    'Aplikasi Termokimia dalam Kehidupan',
  ],
  'Laju Reaksi': [
    'Pengertian dan Percobaan Laju Reaksi',
    'Faktor-Faktor yang Mempengaruhi Laju Reaksi',
    'Teori Tumbukan',
    'Orde Reaksi dan Persamaan Laju Reaksi',
    'Penentuan Laju Reaksi dari Data Percobaan',
    'Hukum Laju Terintegrasi dan Waktu Paruh',
  ],
  'Kesetimbangan Kimia': [
    'Konsep Kesetimbangan Dinamis',
    'Tetapan Kesetimbangan (Kc dan Kp)',
    'Hubungan Kc dan Kp',
    'Pergeseran Kesetimbangan (Prinsip Le Chatelier)',
    'Faktor yang Mempengaruhi Kesetimbangan',
    'Aplikasi Kesetimbangan: Proses Haber-Bosch dan Proses Kontak',
  ],
  'Asam dan Basa': [
    'Teori Asam Basa (Arrhenius, Bronsted-Lowry, Lewis)',
    'Kekuatan Asam dan Basa',
    'Konstanta Asam (Ka) dan Konstanta Basa (Kb)',
    'pH, pOH, dan Skala Keasaman',
    'Indikator Asam Basa dan Titrasi Asam Basa',
    'Kurva Titrasi dan Titik Ekuivalen',
    'Aplikasi Asam Basa dalam Kehidupan dan Industri',
  ],
  'Larutan Penyangga': [
    'Pengertian dan Komposisi Larutan Penyangga',
    'Cara Kerja Larutan Penyangga',
    'pH Larutan Penyangga',
    'Fungsi dan Aplikasi Larutan Penyangga',
    'Pembuatan dan Percobaan Larutan Penyangga',
  ],
  'Hidrolisis Garam': [
    'Reaksi Asam-Basa dan Pembentukan Garam',
    'Konsep Hidrolisis Garam',
    'Jenis Garam dan Sifat Hidrolisisnya',
    'pH Larutan Garam',
    'Tetapan Hidrolisis (Kh) dan Hubungannya dengan Ka/Kb',
  ],
  'Titrasi Asam-Basa': [
    'Prinsip dan Prosedur Titrasi',
    'Titrasi Asam Kuat-Basa Kuat',
    'Titrasi Asam Kuat-Basa Lemah dan Sebaliknya',
    'Kurva Titrasi dan Indikator',
    'Perhitungan Kadar/Lembab dalam Titrasi',
  ],
  'Hidrokarbon dan Minyak Bumi': [
    'Kekhasan Atom Karbon dan Senyawa Hidrokarbon',
    'Alkana: Sifat dan Tata Nama',
    'Alkena dan Alkuna: Sifat dan Tata Nama',
    'Isomeri pada Hidrokarbon',
    'Reaksi-Reaksi Hidrokarbon',
    'Minyak Bumi dan Proses Penyulingan (Fraksinasi)',
    'Bensin, Avtur, dan Produk Olahan Minyak Bumi',
    'Dampak Pembakaran Hidrokarbon terhadap Lingkungan',
  ],
};

async function setMindmaps() {
  console.log('🧠 Setting mindmap for all 47 Kimia materials...\n');

  let updated = 0;
  for (const [topic, subTopics] of Object.entries(TOPIC_SUBTOPICS)) {
    const mindmapContent = generateMindmap(topic, subTopics);

    const result = await queryDb(
      `UPDATE "Material"
       SET metadata = jsonb_set(
         COALESCE(metadata, '{}'::jsonb),
         '{mindmap}',
         $1::jsonb
       )
       WHERE "curriculumId" = $2 AND subject = 'Kimia' AND topic = $3`,
      [mindmapContent, CURRICULUM_ID, topic]
    );
    const count = result.rowCount;
    updated += count;
    console.log(`✅ ${topic}: ${count} materials updated`);
  }

  console.log(`\n✅ Total: ${updated} mindmaps set`);
}

setMindmaps().catch(console.error);
