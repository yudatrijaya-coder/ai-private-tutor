/**
 * Generate rich slide markdown for SMA IPS/IPA materials:
 *   Bahasa Inggris, Ekonomi, Geografi, Informatika
 * from curriculum 98f0274e-4e39-45f5-9c79-3632c5717b27 (SMA_2).
 *
 * - Fetches materials where slide is empty
 * - Calls SumoPod LLM (deepseek-v4-flash) for each topic to generate 3-5 rich slides
 * - Updates via jsonb_set(metadata, '{slide}', ...)
 *
 * Usage: node gen-slides-ips-infra.cjs
 */
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ── Config
const CURRICULUM_ID = '98f0274e-4e39-45f5-9c79-3632c5717b27';
const SUBJECTS = ['Bahasa Inggris', 'Ekonomi', 'Geografi', 'Informatika'];

// Read raw key from .env to avoid dotenvx truncation
const envRaw = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const keyMatch = envRaw.match(/SUMOPOD_API_KEY="([^"]+)"/);
const API_KEY = keyMatch ? keyMatch[1] : null;
const API_HOST = 'ai.sumopod.com';
const API_PATH = '/v1/chat/completions';
const MODEL = 'deepseek-v4-flash';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;
const RATE_LIMIT_MS = 1200;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ai_private_tutor',
  user: 'tutor',
  password: 'tutor123',
});

// ── Call SumoPod LLM via HTTPS
function callLLM(messages, retries = 0) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: MODEL, messages, temperature: 0.7, max_tokens: 4000 });

    const options = {
      hostname: API_HOST,
      port: 443,
      path: API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message || JSON.stringify(json.error)));
          } else {
            resolve(json.choices[0].message.content);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data.substring(0, 300)}`));
        }
      });
    });

    req.on('error', (e) => {
      if (retries < MAX_RETRIES) {
        console.warn(`  ⚠️  Network error, retrying (${retries + 1}/${MAX_RETRIES})...`);
        setTimeout(() => {
          callLLM(messages, retries + 1).then(resolve).catch(reject);
        }, RETRY_DELAY_MS);
      } else {
        reject(e);
      }
    });

    req.setTimeout(90000, () => {
      req.destroy();
      if (retries < MAX_RETRIES) {
        console.warn(`  ⚠️  Timeout, retrying (${retries + 1}/${MAX_RETRIES})...`);
        setTimeout(() => {
          callLLM(messages, retries + 1).then(resolve).catch(reject);
        }, RETRY_DELAY_MS);
      } else {
        reject(new Error('Request timeout after retries'));
      }
    });

    req.write(body);
    req.end();
  });
}

// ── Subject-specific prompt builders
function buildSlidePrompt(topic, subTopic, subject) {
  const systemContent = buildSystemPrompt(topic, subTopic, subject);
  const userContent = `Buatkan slide markdown lengkap untuk:

**Topik:** ${topic}${subTopic ? ` — ${subTopic}` : ''}
**Sub-Topik:** ${subTopic || '-'}
**Kelas:** XI SMA (Kurikulum Merdeka)
**Mata Pelajaran:** ${subject}

Kembalikan HANYA konten markdown slide tanpa prolog atau epilog. Jangan bungkus dalam blok kode markdown. Langsung mulai dengan heading slide pertama.`;

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ];
}

function buildSystemPrompt(topic, subTopic, subject) {
  if (subject === 'Bahasa Inggris') {
    return `Kamu adalah guru Bahasa Inggris profesional Indonesia yang menulis slide pembelajaran untuk siswa SMA Kelas XI (Kurikulum Merdeka).

Buat slide markdown yang SANGAT LENGKAP dan KOMPREHENSIF untuk topik "${topic}" — ${subTopic || 'subtopik umum'}.

PERSYARATAN:
1. Bahasa pengantar SLIDE TITLE & CONTENT: Bahasa Inggris (titles, body, keywords, poin-poin)
2. Bahasa Indonesia digunakan HANYA untuk:
   - Judul slide: ## Judul Slide (dalam Bahasa Inggris)
   - Tujuan pembelajaran: 🎯 Tujuan: ...
   - Catatan/guru: 💡 Catatan Guru: ... (opsional)
3. KONSEP & DEFINISI: Bahasa Inggris (bold untuk istilah penting)
4. CONTOH: Bilingual — berikan contoh dalam Bahasa Inggris, penjelasan ringkas dalam tanda kurung () dalam Bahasa Indonesia
5. FORMAT: Markdown dengan heading levels (## Slide Title, ### Section, #### Sub-section)
6. HASILKAN 4-5 SLIDE dengan struktur:

## 📌 Slide 1 – Judul & Tujuan Pembelajaran
   - Judul utama (Bahasa Inggris)
   - 🎯 Tujuan pembelajaran (3-4 poin, bilingual)
   - 📖 Topik & Sub-topik (Bahasa Inggris)

## 📖 Slide 2 – Teori / Materi Inti
   - Penjelasan teori mendalam dalam Bahasa Inggris
   - Konsep-konsep penting (bold untuk terminology)
   - Definisi dan penjelasan detail
   - Structured bullet points

## ✏️ Slide 3 – Contoh & Aplikasi
   - Minimal 2 contoh konkret (dialog, paragraf, atau kalimat Bahasa Inggris nyata)
   - Aplikasi dalam situasi kehidupan nyata
   - Contoh jawaban/sample answer jika relevan

## ❓ Slide 4 – Latihan / Contoh Soal
   - Minimal 2 soal latihan dalam Bahasa Inggris
   - Bisa berupa: fill-in-the-blank, multiple choice, short answer, atau rewrite sentence
   - Brief answer key atau sample answer

## 📝 Slide 5 – Ringkasan & Poin Penting
   - Ringkasan materi (Bahasa Inggris)
   - 💡 Poin-poin kunci yang perlu diingat
   - 🔑 Vocabulary penting (bold)
   - Kata kunci/key phrases (Bahasa Inggris)

TOPIK BAHASA INGGRIS SMA YANG DICAKUP:
- Academic: Essay Structure, Academic Writing (paragraf persuasi/eksposisi, thesis statement, konjungsi)
- Discussion: For and Against, Discussion Text (structuring arguments, opinion phrases, useful expressions)
- Explanation: Cause and Effect, Explanation Text (sequencing, scientific explanation, linking words)
- Narrative: Narrative Text, Story Structure (orientation, complication, resolution, past tense)
- Review: Book/Movie Review, Critical Review (evaluating, adjectives of opinion, recommendation)
- Speech: Persuasive Speech, Public Speaking (rhetoric, call to action, body language cues)

7. Gunakan formatting kaya: bold, italic, blockquote untuk catatan penting
8. Sertakan emoji relevan untuk setiap section
9. HINDARI placeholder — ISI DENGAN KONTEN NYATA dan CONTOH BAHASA INGGRIS BERMAKNA`;
  }

  if (subject === 'Ekonomi') {
    return `Kamu adalah guru Ekonomi profesional Indonesia yang menulis slide pembelajaran untuk siswa SMA Kelas XI (Kurikulum Merdeka).

Buat slide markdown yang SANGAT LENGKAP dan KOMPREHENSIF untuk topik "${topic}" — ${subTopic || 'subtopik umum'}.

PERSYARATAN:
1. Bahasa: Bahasa Indonesia sepenuhnya
2. Format: Markdown dengan heading levels (##, ###, ####)
3. HASILKAN 4-5 SLIDE dengan struktur:

## 📄 Slide 1 – Judul & Tujuan Pembelajaran
   - Judul utama materi
   - 🎯 Tujuan pembelajaran (3-4 poin spesifik dan terukur)
   - 📚 Topik & Sub-topik

## 📖 Slide 2 – Teori / Materi Inti
   - Penjelasan teori lengkap dan mendalam
   - Konsep-konsep penting (bold untuk istilah/kosakata ekonomi)
   - Definisi dari para ahli jika relevan
   - Rumus-rumus jika ada (dalam blockquote atau code block)
   - Tabel perbandingan jika relevan

## 📊 Slide 3 – Contoh Soal & Pembahasan
   - Minimal 2 contoh soal pilihan ganda dengan pembahasan lengkap
   - Minimal 1 soal uraian dengan jawaban model
   - Langkah-langkah penyelesaian yang detail

## 💹 Slide 4 – Aplikasi & Studi Kasus
   - Minimal 1 studi kasus nyata dari ekonomi Indonesia
   - Data/statistik terkini (estimasi wajar jika data spesifik tidak tersedia)
   - Hubungan dengan kebijakan pemerintah atau peristiwa ekonomi

## 📝 Slide 5 – Ringkasan & Poin Penting
   - Ringkasan materi (📝)
   - 💡 Poin-poin kunci (5-7 poin)
   - 🔑 Istilah penting (glossary)
   - Tips belajar/pengingat

TOPIK EKONOMI SMA YANG DICAKUP:
- Ilmu Ekonomi: Pembagian (Mikro/Makro), Konsep Dasar (kebutuhan, barang, jasa, kelangkaan), Biaya Peluang
- Kebijakan Fiskal: Pajak & Retribusi, APBN/APBD (struktur, fungsi, penerimaan & pengeluaran)
- Kebijakan Moneter: Bank & Lembaga Keuangan (Bank Sentral, Bank Umum, Bank Syariat), Inflasi & Deflasi (penyebab, dampak, pengendalian)
- Pasar: Pasar Persaingan Sempurna & Tidak Sempurna (monopoli, oligopoli, monopolistik), Struktur Pasar (determinasi harga)
- Pembangunan: Pertumbuhan Ekonomi (PDB, PNB, pertumbuhan), Pembangunan Berkelanjutan (SDG's, lingkungan)
- Permintaan dan Penawaran: Hukum Permintaan & Penawaran, Keseimbangan Pasar (Ekuilibrium), Elastisitas`;

  }

  if (subject === 'Geografi') {
    return `Kamu adalah guru Geografi profesional Indonesia yang menulis slide pembelajaran untuk siswa SMA Kelas XI (Kurikulum Merdeka).

Buat slide markdown yang SANGAT LENGKAP dan KOMPREHENSIF untuk topik "${topic}" — ${subTopic || 'subtopik umum'}.

PERSYARATAN:
1. Bahasa: Bahasa Indonesia sepenuhnya
2. Format: Markdown dengan heading levels (##, ###, ####)
3. HASILKAN 4-5 SLIDE dengan struktur:

## 🌍 Slide 1 – Judul & Tujuan Pembelajaran
   - Judul utama materi
   - 🎯 Tujuan pembelajaran (3-4 poin spesifik)
   - 📚 Topik & Sub-topik
   - Peta/Gambar ilustrasi topik (deskripsi visual jika perlu)

## 📖 Slide 2 – Teori / Materi Inti
   - Penjelasan teori lengkap dan mendalam
   - Konsep-konsep penting (bold untuk istilah geografi)
   - Definisi dan penjelasan ilmiah
   - Klasifikasi/taksonomi jika relevan
   - Tabel perbandingan atau diagram alir

## 🗺️ Slide 3 – Contoh & Studi Kasus
   - Minimal 2 contoh konkret dari Indonesia atau dunia
   - Studi kasus wilayah spesifik (pulau, provinsi, benua)
   - Data geografis relevan (angka, statistik)
   - Hubungan sebab-akibat

## 🔬 Slide 4 – Proses / Mekanisme (jika relevan)
   - Penjelasan proses secara bertahap (langkah 1, 2, 3...)
   - Diagram alir atau flowchart (dalam text/markdown)
   - Faktor-faktor yang mempengaruhi

## 📝 Slide 5 – Ringkasan & Poin Penting
   - Ringkasan materi (📝)
   - 💡 Poin-poin kunci (5-7 poin)
   - 🔑 Istilah penting (glossary)
   - Relevansi dan hubungan antar topik

TOPIK GEOGRAFI SMA YANG DICAKUP:
- Antroposfer: Dinamika Penduduk (komposisi, pertumbuhan, persebaran), Migration, Demografi Indonesia
- Atmosfer: Cuaca & Iklim (unsur cuaca, klasifikasi iklim), Perubahan Iklim Global (efek rumah kaca, pemanasan global, mitigasi)
- Hidrosfer: Siklus Hidrologi (evaporasi, presipitasi, infiltrasi), Perairan Darat (danau, sungai, rawa) & Laut (lautan, arus, gelombang)
- Litosfer: Struktur Bumi (lapisan kulit bumi), Batuan & Tanah (jenis batuan, pembentukan tanah, kesuburan), Tenaga Endogen (vulkanisme, seismik) & Eksogen (erosi, sedimentasi)
- Peta: Dasar Pemetaan (komponen peta, proyeksi, skala), SIG (Sistem Informasi Geografis — konsep, komponen, aplikasi), Penginderaan Jauh (citra satelit, interpretasi)
- Sumber Daya: SDA & Lingkungan (klasifikasi SDA, pemanfaatannya), Mitigasi Bencana (bencana alam Indonesia, kesiapsiagaan)`;

  }

  if (subject === 'Informatika') {
    return `Kamu adalah guru Informatika profesional Indonesia yang menulis slide pembelajaran untuk siswa SMA Kelas XI (Kurikulum Merdeka).

Buat slide markdown yang SANGAT LENGKAP dan KOMPREHENSIF untuk topik "${topic}" — ${subTopic || 'subtopik umum'}.

PERSYARATAN:
1. Bahasa: Bahasa Indonesia sepenuhnya
2. KODE: Bahasa Inggris/Code dalam backtick atau fenced code block
3. Format: Markdown dengan heading levels (##, ###, ####)
4. HASILKAN 4-5 SLIDE dengan struktur:

## 💻 Slide 1 – Judul & Tujuan Pembelajaran
   - Judul utama materi
   - 🎯 Tujuan pembelajaran (3-4 poin spesifik)
   - 📚 Topik & Sub-topik
   - Ilustrasi/diagram konsep (deskripsi jika perlu)

## 📖 Slide 2 – Teori / Materi Inti
   - Penjelasan teori lengkap dan mendalam
   - Konsep-konsep penting (bold untuk istilah teknis)
   - Definisi dan penjelasan detail
   - Diagram alir atau flowchart (dalam text/markdown)
   - Struktur data atau arsitektur jika relevan

## 👨‍💻 Slide 3 – Contoh Kode / Implementasi
   - Minimal 2 contoh kode/program nyata (dalam fenced code block)
   - Penjelasan baris per baris jika penting
   - Output contoh jika memungkinkan
   - Best practices dan common pitfalls

## 🔧 Slide 4 – Latihan / Soal
   - Minimal 2 soal latihan (coding challenge atau teori)
   - Bisa berupa: trace the algorithm, write pseudo-code, identify errors
   - Hint atau langkah awal

## 📝 Slide 5 – Ringkasan & Poin Penting
   - Ringkasan materi (📝)
   - 💡 Poin-poin kunci (5-7 poin)
   - 🔑 Istilah penting (glossary)
   - Referensi atau link untuk belajar lebih lanjut

TOPIK INFORMATIKA SMA YANG DICAKUP:
- Algoritma: Flowchart & Pseudocode (simbol flowchart, struktur dasar algoritma), Algoritma Lanjutan (sorting, searching, divide & conquer, kompleksitas waktu)
- Basis Data: Konsep Basis Data (DBMS, entitas, relasi, ERD), SQL Dasar (DDL: CREATE/ALTER/DROP, DML: SELECT/INSERT/UPDATE/DELETE, query sederhana)
- Jaringan: Jaringan Komputer (LAN, WAN, Internet, model OSI), Topologi & Protokol (star, bus, ring, TCP/IP, HTTP, DNS)
- Pemrograman: Pemrograman Lanjutan (fungsi, array, string manipulation), Debugging & Testing (jenis error, teknik debugging, unit testing)
- Struktur Data: Array & Matriks (deklarasi, operasi, aplikasi), Stack & Queue (LIFO/FIFO, implementasi, aplikasi nyata)

5. Gunakan formatting kaya: bold, italic, code blocks, blockquote
6. Sertakan emoji relevan untuk setiap section
7. HINDARI placeholder — ISI DENGAN KONTEN NYATA dan CONTOH KODE BERMAKNA`;
  }

  // Fallback
  return `Kamu adalah guru profesional Indonesia yang menulis slide pembelajaran untuk siswa SMA Kelas XI (Kurikulum Merdeka). Buat slide markdown lengkap untuk "${topic}". Bahasa Indonesia. 4-5 slide: Judul & Tujuan, Materi Inti, Contoh, Latihan, Ringkasan. Format markdown, emoji, bold untuk istilah penting.`;
}

// ── Update slide in metadata JSONB
async function updateSlide(materialId, slideMd) {
  const result = await pool.query(
    `UPDATE "Material"
     SET metadata = jsonb_set(metadata, '{slide}', to_jsonb($1::text)),
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id`,
    [slideMd, materialId]
  );
  return result.rowCount;
}

// ── Count materials by subject
async function countBySubject(subject) {
  const res = await pool.query(
    `SELECT COUNT(*) as cnt
     FROM "Material"
     WHERE "curriculumId" = $1
       AND subject = $2
       AND (metadata->>'slide' IS NULL
         OR metadata->>'slide' = ''
         OR metadata->>'slide' = 'null')`,
    [CURRICULUM_ID, subject]
  );
  return parseInt(res.rows[0].cnt, 10);
}

// ── Main
async function main() {
  console.log('📚 Starting IPS/Informatika SMA Slide Generation\n');
  console.log(`📦 API: https://${API_HOST}${API_PATH} | Model: ${MODEL}`);
  console.log(`🔑 API Key: ${API_KEY ? `✓ Set (${API_KEY.length} chars)` : '✗ MISSING — check .env'}`);

  if (!API_KEY) {
    console.error('❌ No valid API key found. Aborting.');
    await pool.end();
    process.exit(1);
  }

  // Show counts per subject
  console.log('\n📊 Materials per subject:');
  for (const subj of SUBJECTS) {
    const cnt = await countBySubject(subj);
    console.log(`   ${subj}: ${cnt} material(s)`);
  }

  // Fetch all materials
  const res = await pool.query(
    `SELECT id, topic, "subTopic", subject, "gradeLevel",
            metadata->>'slide' as slide
     FROM "Material"
     WHERE "curriculumId" = $1
       AND subject = ANY($2)
       AND (metadata->>'slide' IS NULL
         OR metadata->>'slide' = ''
         OR metadata->>'slide' = 'null')
     ORDER BY
       CASE subject
         WHEN 'Bahasa Inggris'  THEN 1
         WHEN 'Ekonomi'        THEN 2
         WHEN 'Geografi'       THEN 3
         WHEN 'Informatika'   THEN 4
       END,
       topic,
       "subTopic"`,
    [CURRICULUM_ID, SUBJECTS]
  );

  const materials = res.rows;
  console.log(`\n📋 Total materials to process: ${materials.length}\n`);
  console.log('─'.repeat(80));

  let updated = 0;
  let errors = 0;
  const stats = {};

  for (let i = 0; i < materials.length; i++) {
    const mat = materials[i];
    const idx = i + 1;
    const subjectLabel = `${mat.subject}`;

    if (!stats[subjectLabel]) stats[subjectLabel] = { updated: 0, errors: 0 };

    console.log(`\n[${idx}/${materials.length}] ${mat.subject} — ${mat.topic}`);
    if (mat.subTopic) console.log(`   Sub-topik: ${mat.subTopic}`);
    console.log(`   ID: ${mat.id}`);

    // Build prompt
    const messages = buildSlidePrompt(mat.topic, mat.subTopic, mat.subject);
    let slideContent = '';
    let success = false;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        console.log(`   🤖 Calling SumoPod (attempt ${attempt}/${MAX_RETRIES + 1})...`);
        slideContent = await callLLM(messages);
        success = true;
        break;
      } catch (err) {
        console.warn(`   ⚠️  Attempt ${attempt} failed: ${err.message}`);
        if (attempt <= MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
        }
      }
    }

    if (!success) {
      console.error(`   ❌ Failed after ${MAX_RETRIES + 1} attempts — skipping`);
      stats[subjectLabel].errors++;
      errors++;
      continue;
    }

    if (!slideContent || slideContent.trim().length < 100) {
      console.error('   ❌ LLM returned empty/too-short content — skipping');
      stats[subjectLabel].errors++;
      errors++;
      continue;
    }

    // Strip markdown code fences if LLM wrapped it
    slideContent = slideContent
      .replace(/^```markdown\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Update DB
    try {
      const count = await updateSlide(mat.id, slideContent);
      if (count > 0) {
        stats[subjectLabel].updated++;
        updated++;
        const preview = slideContent.substring(0, 80).replace(/\n/g, ' ');
        console.log(`   ✅ Updated (${slideContent.length} chars): "${preview}..."`);
      } else {
        console.warn('   ⚠️  No rows updated');
        stats[subjectLabel].errors++;
        errors++;
      }
    } catch (err) {
      console.error(`   ❌ DB update failed: ${err.message}`);
      stats[subjectLabel].errors++;
      errors++;
    }

    // Rate-limit
    if (i < materials.length - 1) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n📊 RESULTS:');
  console.log(`   ✅ Updated: ${updated} materials`);
  console.log(`   ❌ Errors:  ${errors} materials`);
  console.log(`   📦 Total:  ${materials.length} materials`);
  console.log('\n   Breakdown by subject:');
  for (const [subj, s] of Object.entries(stats)) {
    console.log(`     ${subj}: ${s.updated} updated, ${s.errors} errors`);
  }

  await pool.end();

  if (errors > 0) {
    console.log(`\n⚠️  ${errors} material(s) failed. Re-run to retry.`);
    process.exit(1);
  } else {
    console.log('\n🎉 All IPS/Informatika SMA slides generated successfully!');
  }
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
