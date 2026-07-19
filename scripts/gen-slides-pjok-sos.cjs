#!/usr/bin/env node
/**
 * Generate rich slide markdown for PJOK and Sosiologi SMA materials.
 * - Fetches materials from curriculum 98f0274e-4e39-45f5-9c79-3632c5717b27
 *   where slide IS NULL and subject IN ('PJOK', 'Sosiologi')
 * - Calls SumoPod LLM (deepseek-v4-flash) for each material to generate 3-5 rich slides
 * - Updates the slide field in metadata JSONB (metadata->>'slide')
 *
 * Usage: node gen-slides-pjok-sos.cjs
 */

const https = require('https');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ── Config
const CURRICULUM_ID = '98f0274e-4e39-45f5-9c79-3632c5717b27';
const SUBJECTS = ['PJOK', 'Sosiologi'];

// Read API key directly from .env
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

// ── Build slide prompt for PJOK
function buildPJOKPrompt(topic, subTopic) {
  var topicLabel = (subTopic && subTopic.trim()) ? topic + ' - ' + subTopic : topic;

  var systemPrompt = [
    'Kamu adalah guru PJOK profesional Indonesia yang menulis slide pembelajaran untuk siswa SMA Kurikulum Merdeka.',
    '',
    'Buat slide markdown yang SANGAT LENGKAP dan KOMPREHENSIF untuk materi "' + topicLabel + '".',
    '',
    'PERSYARATAN:',
    '1. Bahasa: Bahasa Indonesia sepenuhnya',
    '2. Format: Markdown dengan heading levels (##, ###, ####)',
    '3. Buat 3-5 slide/section yang SETIAP slide HARUS berisi:',
    '   - Judul slide yang jelas',
    '   - Penjelasan teori yang lengkap dan mendalam',
    '   - Teknik/tahapan gerakan dalam langkah-langkah terstruktur',
    '   - Aturan dan peraturan yang berlaku',
    '   - Minimum 2 CONTOH SOAL LATIHAN dengan PEMBAHASAN (untuk topik teori) ATAU',
    '     langkah-langkah gerakan/praktik (untuk topik keterampilan)',
    '   - Tips keselamatan dan strategi',
    '   - Aplikasi dalam kehidupan sehari-hari',
    '4. Setiap slide harus memiliki struktur:',
    '   - ## [Judul Slide] -- fokus spesifik',
    '   - ### Teori/Pengertian -- penjelasan konsep',
    '   - ### Teknik/Aturan -- langkah atau peraturan',
    '   - ### Latihan/Praktik -- contoh latihan atau soal',
    '   - ### Ringkasan -- poin-poin kunci',
    '5. Gunakan formatting yang kaya: **bold** untuk istilah penting, *italic* untuk penekanan, `inline` untuk istilah外国',
    '6. Sertakan emoji untuk setiap slide (misal: ## 🏃 Slide 1: Pengertian Atletik)',
    '',
    'HINDARI placeholder seperti [Materi utama tentang...] atau [Soal dan pembahasan].',
    'ISI DENGAN KONTEN NYATA. BUAT SANGAT LENGKAP -- setiap slide minimal 300-500 kata.',
  ].join('\n');

  var userPrompt = [
    'Buatkan slide markdown lengkap (3-5 slide) untuk:',
    '',
    'Mata Pelajaran: PJOK (Pendidikan Jasmani, Olahraga, dan Kesehatan)',
    'Topik: ' + topic,
    'Subtopik: ' + (subTopic || '-'),
    'Jenjang: SMA/SMK Kurikulum Merdeka',
    '',
    'Kembalikan HANYA konten markdown slide tanpa prolog atau epilog.',
  ].join('\n');

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ── Build slide prompt for Sosiologi
function buildSosiologiPrompt(topic, subTopic) {
  var topicLabel = (subTopic && subTopic.trim()) ? topic + ' - ' + subTopic : topic;

  var systemPrompt = [
    'Kamu adalah guru Sosiologi profesional Indonesia yang menulis slide pembelajaran untuk siswa SMA Kurikulum Merdeka.',
    '',
    'Buat slide markdown yang SANGAT LENGKAP dan KOMPREHENSIF untuk materi "' + topicLabel + '".',
    '',
    'PERSYARATAN:',
    '1. Bahasa: Bahasa Indonesia sepenuhnya',
    '2. Format: Markdown dengan heading levels (##, ###, ####)',
    '3. Buat 3-5 slide/section yang SETIAP slide HARUS berisi:',
    '   - Judul slide yang jelas',
    '   - Penjelasan teori yang lengkap dan mendalam',
    '   - Konsep-konsep kunci sosiologi',
    '   - Minimum 2 CONTOH KASUSNYA dalam kehidupan masyarakat Indonesia',
    '   - Tokoh-tokoh Sosiologi yang relevan (Durkheim, Weber, Marx, dll)',
    '   - Teori-teori sosiologi yang relevan',
    '   - Ringkasan poin-poin penting',
    '4. Setiap slide harus memiliki struktur:',
    '   - ## [Judul Slide] -- fokus spesifik',
    '   - ### Pengertian & Konsep -- penjelasan teori',
    '   - ### Teori Terkait -- teori sosiologi yang relevan',
    '   - ### Contoh Kasus -- contoh nyata dalam masyarakat',
    '   - ### Ringkasan -- poin-poin kunci',
    '5. Gunakan formatting yang kaya: **bold** untuk istilah penting, *italic* untuk penekanan, `inline` untuk istilah sosiologi',
    '6. Sertakan emoji untuk setiap slide (misal: ## 👥 Slide 1: Pengertian Interaksi Sosial)',
    '',
    'HINDARI placeholder seperti [Materi utama tentang...] atau [Soal dan pembahasan].',
    'ISI DENGAN KONTEN NYATA. BUAT SANGAT LENGKAP -- setiap slide minimal 300-500 kata.',
  ].join('\n');

  var userPrompt = [
    'Buatkan slide markdown lengkap (3-5 slide) untuk:',
    '',
    'Mata Pelajaran: Sosiologi',
    'Topik: ' + topic,
    'Subtopik: ' + (subTopic || '-'),
    'Jenjang: SMA Kurikulum Merdeka',
    '',
    'Kembalikan HANYA konten markdown slide tanpa prolog atau epilog.',
  ].join('\n');

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ── Update slide in metadata JSONB
function updateSlide(materialId, slideMd) {
  return pool.query(
    'UPDATE "Material" SET metadata = jsonb_set(COALESCE(metadata, \'{}\'), \'{slide}\', to_jsonb($1::text)) WHERE id = $2 RETURNING id',
    [slideMd, materialId]
  ).then(function(result) { return result.rowCount; });
}

// ── Main
async function main() {
  console.log('Starting PJOK & Sosiologi Slide Generation\n');
  console.log('API: ' + API_URL + ' | Model: ' + MODEL);
  console.log('API Key: ' + (API_KEY && API_KEY.length > 20 ? 'OK (' + API_KEY.length + ' chars)' : 'MISSING'));

  // 1. Fetch materials with NULL slide
  var res = await pool.query(
    'SELECT id, topic, "subTopic", "gradeLevel", subject, metadata->>\'slide\' as slide FROM "Material" WHERE "curriculumId" = $1 AND subject = ANY($2) AND (metadata->>\'slide\' IS NULL OR metadata->>\'slide\' = \'\' OR metadata->>\'slide\' = \'null\') ORDER BY subject, topic',
    [CURRICULUM_ID, SUBJECTS]
  );

  var materials = res.rows;
  console.log('\nFound ' + materials.length + ' materials needing slides\n');
  console.log('--------------------------------------------------------------');

  var updated = 0;
  var skipped = 0;
  var errors = 0;

  for (var i = 0; i < materials.length; i++) {
    var mat = materials[i];
    var idx = i + 1;
    var topicLabel = (mat.subTopic && mat.subTopic.trim()) ? mat.topic + ' > ' + mat.subTopic : mat.topic;

    console.log('\n[' + idx + '/' + materials.length + '] [' + mat.subject + '] ' + topicLabel);
    console.log('  ID: ' + mat.id);

    // 2. Build prompt based on subject
    var messages;
    if (mat.subject === 'PJOK') {
      messages = buildPJOKPrompt(mat.topic, mat.subTopic);
    } else {
      messages = buildSosiologiPrompt(mat.topic, mat.subTopic);
    }

    // 3. Call LLM
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

    // 4. Update DB
    try {
      var count = await updateSlide(mat.id, slideContent);
      if (count > 0) {
        updated++;
        var preview = slideContent.substring(0, 80).replace(/\n/g, ' ');
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
  console.log('\nRESULTS:');
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
