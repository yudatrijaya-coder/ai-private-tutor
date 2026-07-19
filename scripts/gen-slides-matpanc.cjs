#!/usr/bin/env node
/**
 * Generate rich slide markdown for Matematika, Matematika Tingkat Lanjut,
 * Matematika Penalaran, and Pendidikan Pancasila SMA materials.
 * - Fetches all materials from curriculum SMA_2 where slide is empty
 * - Calls SumoPod LLM (deepseek-v4-flash) for each material to generate 3-5 rich slides
 * - Math formulas in code blocks, Indonesian language
 * - Updates the slide field in metadata JSONB via jsonb_set
 *
 * Usage: node gen-slides-matpanc.cjs
 */

const https = require('https');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ── Config
const SUBJECTS = ['Matematika', 'Matematika Tingkat Lanjut', 'Matematika Penalaran', 'Pendidikan Pancasila'];
const CURRICULUM_ID = '98f0274e-4e39-45f5-9c79-3632c5717b27';
const GRADE_LEVEL = 'SMA_2';

// Read API key from .env
const envPath = path.resolve(process.cwd(), '.env');
let API_KEY = null;
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (t.startsWith('SUMOPOD_API_KEY=')) {
      let v = t.slice('SUMOPOD_API_KEY='.length);
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      API_KEY = v;
      break;
    }
  }
}
if (!API_KEY) {
  console.error('FATAL: SUMOPOD_API_KEY not found in .env');
  process.exit(1);
}

const API_URL = 'https://ai.sumopod.com/v1/chat/completions';
const MODEL = 'deepseek-v4-flash';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ai_private_tutor',
  user: 'tutor',
  password: 'tutor123',
});

// ── Call SumoPod LLM via HTTPS
function callLLM(messages, retries) {
  retries = retries || 0;
  return new Promise(function(resolve, reject) {
    var body = JSON.stringify({ model: MODEL, messages: messages, temperature: 0.7, max_tokens: 4000 });

    var reqOptions = {
      hostname: 'ai.sumopod.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    var req = https.request(reqOptions, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          var json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message || JSON.stringify(json.error)));
          } else {
            resolve(json.choices[0].message.content);
          }
        } catch (e) {
          reject(new Error('Failed to parse response: ' + data.substring(0, 200)));
        }
      });
    });

    req.on('error', function(e) {
      if (retries < MAX_RETRIES) {
        console.warn('  [W] Network error, retrying (' + (retries + 1) + '/' + MAX_RETRIES + ')...');
        setTimeout(function() {
          callLLM(messages, retries + 1).then(resolve).catch(reject);
        }, RETRY_DELAY_MS);
      } else {
        reject(e);
      }
    });

    req.setTimeout(60000, function() {
      req.destroy();
      if (retries < MAX_RETRIES) {
        console.warn('  [W] Timeout, retrying (' + (retries + 1) + '/' + MAX_RETRIES + ')...');
        setTimeout(function() {
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

// ── Build slide prompt tailored by subject
function buildSlidePrompt(topic, subTopic, subject) {
  var gradeLabel = 'Kelas XI SMA (Kurikulum Merdeka)';
  var topicLabel = (subTopic && subTopic.trim()) ? topic + ' - ' + subTopic : topic;

  var systemContent;

  if (subject === 'Matematika') {
    systemContent = [
      'Kamu adalah guru matematika profesional Indonesia yang menulis slide pembelajaran untuk siswa ' + gradeLabel + '.',
      '',
      'Buat slide markdown yang SANGAT LENGKAP dan KOMPREHENSIF untuk materi "' + topicLabel + '".',
      '',
      'PERSYARATAN:',
      '1. Bahasa: Bahasa Indonesia sepenuhnya',
      '2. Format: Markdown dengan heading levels (##, ###, ####)',
      '3. Buat 3-5 slide/section yang SETIAP slide HARUS berisi:',
      '   - Judul slide yang jelas',
      '   - Penjelasan teori yang lengkap dan mendalam',
      '   - Rumus-rumus matematika PENTING dalam format kode blok (```math``` atau ```latex```)',
      '   - Minimal 2 CONTOH SOAL dengan PEMBAHASAN LENGKAP (soal + jawaban + cara penyelesaian langkah demi langkah)',
      '   - Catatan/tips penting untuk mengerjakan soal',
      '4. Setiap slide harus memiliki struktur:',
      '   - ## [Judul Slide] -- fokus spesifik',
      '   - ### Teori -- penjelasan konsep matematika',
      '   - ### Rumus Penting -- rumus matematika dengan keterangan variabel dalam ```math``` blocks',
      '   - ### Contoh Soal -- soal + pembahasan step-by-step',
      '   - ### Ringkasan -- poin-poin kunci',
      '5. Gunakan formatting yang kaya: **bold** untuk istilah penting, *italic* untuk penekanan, `rumus` inline, ```math blok rumus```',
      '6. Sertakan emoji di judul slide (misal: 📐, 📊, 🔢, 📐)',
      '',
      'TOPIK MATEMATIKA YANG DIBHAS:',
      '- Aljabar: Fungsi, Komposisi Fungsi, Fungsi Invers, Polinomial, Matriks, Determinan, Invers Matriks',
      '- Kalkulus: Limit Fungsi, Limit Fungsi Trigonometri, Turunan, Turunan Trigonometri, Integral, Integral Tak Tentu, Integral Tentu',
      '- Geometri: Lingkaran, Transformasi Geometri, Vektor, Bangun Datar, Bangun Ruang',
      '- Trigonometri: Fungsi Trigonometri, Identitas Trigonometri, Persamaan Trigonometri, Aturan Sinus, Aturan Cosinus, Rumus Jumlah/Selisih, Rumus Sudut Ganda',
      '',
      'HINDARI placeholder seperti [Materi utama tentang...] atau [Soal dan pembahasan].',
      'ISI DENGAN KONTEN NYATA. BUAT SANGAT LENGKAP -- setiap slide minimal 300-500 kata.',
      'Gunakan notasi matematika yang benar dalam blok kode:```math\na^2 + b^2 = c^2\n\\int f(x) dx = F(x) + C\n```',
    ].join('\n');
  } else if (subject === 'Matematika Tingkat Lanjut') {
    systemContent = [
      'Kamu adalah guru matematika tingkat lanjut profesional Indonesia yang menulis slide pembelajaran untuk siswa ' + gradeLabel + '.',
      '',
      'Buat slide markdown yang SANGAT LENGKAP dan KOMPREHENSIF untuk materi "' + topicLabel + '".',
      '',
      'PERSYARATAN:',
      '1. Bahasa: Bahasa Indonesia sepenuhnya',
      '2. Format: Markdown dengan heading levels (##, ###, ####)',
      '3. Buat 3-5 slide/section yang SETIAP slide HARUS berisi:',
      '   - Judul slide yang jelas',
      '   - Penjelasan teori yang lengkap dan mendalam (level yang lebih tinggi dari Matematika reguler)',
      '   - Rumus-rumus matematika PENTING dalam format kode blok (```math``` atau ```latex```)',
      '   - Minimal 2 CONTOH SOAL LANJUT dengan PEMBAHASAN LENGKAP (soal + jawaban + cara penyelesaian)',
      '   - Hubungan dengan konsep matematika lainnya',
      '4. Setiap slide harus memiliki struktur:',
      '   - ## [Judul Slide] -- fokus spesifik',
      '   - ### Teori -- penjelasan konsep matematika mendalam',
      '   - ### Rumus Penting -- rumus matematika lanjut dengan keterangan variabel dalam ```math``` blocks',
      '   - ### Contoh Soal -- soal + pembahasan step-by-step',
      '   - ### Ringkasan -- poin-poin kunci dan hubungan antar konsep',
      '5. Gunakan formatting yang kaya: **bold** untuk istilah penting, *italic* untuk penekanan, ```math blok rumus```',
      '6. Sertakan emoji di judul slide (misal: 🔣, 📈, 🎯, ⚡)',
      '',
      'TOPIK MATEMATIKA TINGKAT LANJUT YANG DIBHAS:',
      '- Fungsi dan Pemodelan: Fungsi Irasional, Fungsi Nilai Mutlak, Fungsi Piecewise, Fungsi Rasional, Fungsi Tangga',
      '- Limit dan Kontinuitas: Limit Fungsi, Limit Fungsi Trigonometri, Menurunkan Rumus Limit, Menentukan Nilai Limit',
      '- Turunan Lanjutan: Turunan Fungsi Trigonometri, Konsep Turunan, Aplikasi Turunan, Persamaan Garis Singgung, Optimasi',
      '- Integral Lanjutan: Integral Tak Tentu, Integral Tentu, Teknik Integrasi',
      '- Trigonometri Lanjut: Rumus Rumus Sudut Ganda, Rumus Jumlah dan Selisih Sinus dan Kosinus, Rumus Perkalian Sinus dan Kosinus',
      '- Polinomial Lanjut: Polinomial dan Fungsi Polinomial, Operasi Aljabar pada Polinomial, Akar-Akar Persamaan Polinomial, Pembagian Sintetik, Teorema Sisa dan Teorema Faktor',
      '',
      'HINDARI placeholder. ISI DENGAN KONTEN NYATA. BUAT SANGAT LENGKAP -- setiap slide minimal 300-500 kata.',
      'Gunakan notasi matematika yang benar dalam blok kode.',
    ].join('\n');
  } else if (subject === 'Matematika Penalaran') {
    systemContent = [
      'Kamu adalah guru matematika penalaran profesional Indonesia yang menulis slide pembelajaran untuk siswa ' + gradeLabel + '.',
      '',
      'Buat slide markdown yang SANGAT LENGKAP dan KOMPREHENSIF untuk materi "' + topicLabel + '".',
      '',
      'PERSYARATAN:',
      '1. Bahasa: Bahasa Indonesia sepenuhnya',
      '2. Format: Markdown dengan heading levels (##, ###, ####)',
      '3. Fokus pada PENALARAN LOGIS dan PEMBUKTIAN MATEMATIS',
      '4. Buat 3-5 slide/section yang SETIAP slide HARUS berisi:',
      '   - Judul slide yang jelas',
      '   - Penjelasan teori yang mendalam tentang logika dan penalaran',
      '   - Contoh penalaran step-by-step dalam format kode blok',
      '   - Minimal 2 CONTOH SOAL PENALARAN dengan PEMBAHASAN LENGKAP',
      '   - Strategi dan tips untuk soal penalaran',
      '5. Setiap slide harus memiliki struktur:',
      '   - ## [Judul Slide] -- fokus spesifik',
      '   - ### Konsep -- penjelasan konsep penalaran matematika',
      '   - ### Logika dan Bukti -- penalaran logis dan bukti matematika dalam ```markdown``` blocks',
      '   - ### Contoh Soal -- soal penalaran + pembahasan step-by-step',
      '   - ### Ringkasan -- strategi dan tips',
      '6. Gunakan formatting yang kaya: **bold** untuk istilah penting, *italic* untuk penekanan, ```markdown blok penalaran```',
      '7. Sertakan emoji di judul slide (misal: 🧠, 🔍, 📝, 💡)',
      '',
      'TOPIK MATEMATIKA PENALARAN YANG DIBHAS:',
      '- Logika Matematika: Pernyataan, Konjungsi, Disjungsi, Implikasi, Biimplikasi, Negasi',
      '- Penalaran Induktif dan Deduktif',
      '- Pembuktian Matematika: Pembuktian Langsung, Pembuktian Tidak Langsung, Induksi Matematika',
      '- Himpunan dan Logika: Operasi Himpunan, Relasi, Fungsi',
      '- Pola dan Deret: Pola Bilangan, Barisan dan Deret, Deret Aritmatika dan Geometri',
      '',
      'HINDARI placeholder. ISI DENGAN KONTEN NYATA. BUAT SANGAT LENGKAP -- setiap slide minimal 300-500 kata.',
      'FOKUS PADA PENALARAN DAN LOGIKA, BUKAN HANYA RUMUS.',
    ].join('\n');
  } else if (subject === 'Pendidikan Pancasila') {
    systemContent = [
      'Kamu adalah guru Pendidikan Pancasila profesional Indonesia yang menulis slide pembelajaran untuk siswa ' + gradeLabel + '.',
      '',
      'Buat slide markdown yang SANGAT LENGKAP dan KOMPREHENSIF untuk materi "' + topicLabel + '".',
      '',
      'PERSYARATAN:',
      '1. Bahasa: Bahasa Indonesia sepenuhnya',
      '2. Format: Markdown dengan heading levels (##, ###, ####)',
      '3. Buat 3-5 slide/section yang SETIAP slide HARUS berisi:',
      '   - Judul slide yang jelas',
      '   - Penjelasan teori yang lengkap tentang Pancasila dan kewarganegaraan',
      '   - Fakta historis dan kontekstual dalam bullet points',
      '   - Minimal 2 CONTOH SOAL dengan PEMBAHASAN (soal PG/esai + jawaban + penjelasan)',
      '   - Catatan penting tentang implementasi dalam kehidupan',
      '4. Setiap slide harus memiliki struktur:',
      '   - ## [Judul Slide] -- fokus spesifik',
      '   - ### Teori -- penjelasan konsep Pancasila dan kewarganegaraan',
      '   - ### Sejarah dan Konteks -- sejarah dan implementasi dalam ```quote``` blocks',
      '   - ### Contoh Soal -- soal + pembahasan',
      '   - ### Ringkasan -- poin-poin penting',
      '5. Gunakan formatting yang kaya: **bold** untuk istilah penting, *italic* untuk penekanan, > blockquote untuk kutipan penting',
      '6. Sertakan emoji di judul slide (misal: 🇮🇩, ⚖️, 🏛️, 📜)',
      '',
      'TOPIK PENDIDIKAN PANCASILA YANG DIBHAS:',
      '- Pancasila: Pancasila sebagai Dasar Negara, Pancasila sebagai Ideologi, Implementasi Pancasila',
      '- Demokrasi: Demokrasi di Indonesia, Pemilu dan Partisipasi Politik',
      '- HAM: Hak Asasi Manusia, Kasus Pelanggaran HAM di Indonesia',
      '- Hukum: Sistem Hukum Indonesia, Sumber Hukum Nasional, Penegakan Hukum',
      '- Globalisasi: Dampak Globalisasi, Identitas Nasional di Era Globalisasi',
      '',
      'HINDARI placeholder. ISI DENGAN KONTEN NYATA. BUAT SANGAT LENGKAP -- setiap slide minimal 300-500 kata.',
      'Sertakan referensi UU dan konstitusi Indonesia jika relevan.',
    ].join('\n');
  }

  var userContent = [
    'Buatkan slide markdown lengkap (3-5 slide) untuk:',
    '',
    'Mata Pelajaran: ' + subject,
    'Topik: ' + topic,
    'Subtopik: ' + (subTopic || '-'),
    gradeLabel,
    '',
    'Kembalikan HANYA konten markdown slide tanpa prolog atau epilog.',
  ].join('\n');

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ];
}

// ── Update slide in metadata JSONB
function updateSlide(materialId, slideMd) {
  return pool.query(
    'UPDATE "Material" SET metadata = jsonb_set(COALESCE(metadata, \'{}\'), \'{slide}\', to_jsonb($1::text)) WHERE id = $2 RETURNING id',
    [slideMd, materialId]
  ).then(function(result) { return result.rowCount; });
}

// ── Check if slide has existing content
function hasExistingContent(slide) {
  if (!slide || typeof slide !== 'string') return false;
  return slide.length >= 200 &&
         slide.indexOf('[Materi utama tentang') === -1 &&
         slide.indexOf('[Soal dan pembahasan]') === -1;
}

// ── Main
async function main() {
  console.log('Starting Matematika/Pendidikan Pancasila Slide Generation\n');
  console.log('API: ' + API_URL + ' | Model: ' + MODEL);
  console.log('API Key: ' + (API_KEY && API_KEY.length > 20 ? 'OK (' + API_KEY.length + ' chars)' : 'MISSING'));
  console.log('Subjects: ' + SUBJECTS.join(', '));
  console.log('Curriculum: ' + CURRICULUM_ID);

  // 1. Fetch all materials for these subjects with empty slides
  var res = await pool.query(
    'SELECT id, topic, "subTopic", subject, "gradeLevel", metadata->>\'slide\' as slide ' +
    'FROM "Material" ' +
    'WHERE "curriculumId" = $1 ' +
    '  AND subject = ANY($2) ' +
    '  AND "gradeLevel" = $3 ' +
    'ORDER BY subject, topic, "subTopic"',
    [CURRICULUM_ID, SUBJECTS, GRADE_LEVEL]
  );

  var materials = res.rows;
  console.log('\nFound ' + materials.length + ' materials total\n');
  console.log('--------------------------------------------------------------');

  var updated = 0;
  var skipped = 0;
  var errors = 0;
  var bySubject = {};

  for (var i = 0; i < materials.length; i++) {
    var mat = materials[i];
    var idx = i + 1;
    var existing = hasExistingContent(mat.slide);

    var topicLabel = (mat.subTopic && mat.subTopic.trim()) ? mat.topic + ' > ' + mat.subTopic : mat.topic;

    // Track by subject
    if (!bySubject[mat.subject]) bySubject[mat.subject] = { total: 0, existing: 0 };
    bySubject[mat.subject].total++;

    console.log('\n[' + idx + '/' + materials.length + '] [' + mat.subject + '] ' + topicLabel);
    console.log('  ID: ' + mat.id);
    console.log('  Status: ' + (existing ? 'Has content (skipping)' : 'Needs generation'));

    if (existing) {
      skipped++;
      bySubject[mat.subject].existing++;
      continue;
    }

    // 2. Call LLM
    var messages = buildSlidePrompt(mat.topic, mat.subTopic, mat.subject);
    var slideContent = '';
    var success = false;

    for (var attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        console.log('  Calling SumoPod (attempt ' + attempt + '/' + (MAX_RETRIES + 1) + ')...');
        slideContent = await callLLM(messages);
        success = true;
        break;
      } catch (err) {
        console.warn('  Attempt ' + attempt + ' failed: ' + err.message);
        if (attempt <= MAX_RETRIES) {
          await new Promise(function(r) { setTimeout(r, RETRY_DELAY_MS * attempt); });
        }
      }
    }

    if (!success) {
      console.error('  FAILED after ' + (MAX_RETRIES + 1) + ' attempts -- skipping');
      errors++;
      continue;
    }

    if (!slideContent || slideContent.trim().length < 100) {
      console.error('  LLM returned empty/too-short content -- skipping');
      errors++;
      continue;
    }

    // Strip markdown code fences if LLM wrapped it
    slideContent = slideContent
      .replace(/^```markdown\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$\s*/i, '')
      .trim();

    // 3. Update DB
    try {
      var count = await updateSlide(mat.id, slideContent);
      if (count > 0) {
        updated++;
        var preview = slideContent.substring(0, 100).replace(/\n/g, ' ');
        console.log('  Updated (' + slideContent.length + ' chars): "' + preview + '..."');
      } else {
        console.warn('  No rows updated');
        errors++;
      }
    } catch (err) {
      console.error('  DB update failed: ' + err.message);
      errors++;
    }

    // Rate-limit: 1.2s between materials
    if (i < materials.length - 1) {
      await new Promise(function(r) { setTimeout(r, 1200); });
    }
  }

  console.log('\n--------------------------------------------------------------');
  console.log('\nRESULTS BY SUBJECT:');
  for (var subj in bySubject) {
    console.log('  ' + subj + ': ' + (bySubject[subj].total - bySubject[subj].existing) + '/' + bySubject[subj].total + ' generated');
  }
  console.log('\nFINAL TOTALS:');
  console.log('  Updated:  ' + updated + ' materials');
  console.log('  Skipped:  ' + skipped + ' materials (already have content)');
  console.log('  Errors:   ' + errors + ' materials');
  console.log('  Total:    ' + materials.length + ' materials');

  await pool.end();

  if (errors > 0) {
    console.log('\n' + errors + ' material(s) failed. Re-run the script to retry.');
    process.exit(1);
  } else {
    console.log('\nAll slides generated successfully!');
  }
}

main().catch(function(err) {
  console.error('\nFatal error: ' + err.message);
  process.exit(1);
});
