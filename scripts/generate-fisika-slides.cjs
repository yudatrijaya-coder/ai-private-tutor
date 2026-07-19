#!/usr/bin/env node
/**
 * Generate rich slide markdown for all 10 Fisika SMA/SMP materials.
 * - Fetches all Fisika materials (subject='Fisika')
 * - Calls SumoPod LLM (deepseek-v4-flash) for each material to generate 3-5 rich slides
 * - Updates the slide field in metadata JSONB (metadata->>'slide')
 * - Handles both SMA_2 (SHOFI) and SMP_1 (Raihan) grade levels
 *
 * Usage: node generate-fisika-slides.cjs
 */

const https = require('https');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ── Config
const SUBJECT = 'Fisika';
// Read API key directly from .env to bypass dotenvx masking
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

// ── Build the prompt for slide generation — tailored by grade level
function buildSlidePrompt(topic, subTopic, gradeLevel) {
  var gradeLabel = gradeLevel === 'SMA_2' ? 'Kelas XI SMA (Kurikulum Merdeka)' : 'Kelas VII SMP (Kurikulum Merdeka)';
  var topicLabel = (subTopic && subTopic.trim()) ? topic + ' - ' + subTopic : topic;

  var depthLines;
  if (gradeLevel === 'SMA_2') {
    depthLines = [
      '- Gerak Lurus: GLB, GLBB, grafik gerak, persamaan posisi/kecepatan/percepatan',
      '- Dinamika Gerak: Hukum Newton, gaya, massa, percepatan, gaya gesek, gaya normal, tegangan tali',
      '- Fluida: tekanan hidrostatis, hukum Pascal, hukum Archimedes, tegangan permukaan, viskositas',
      '- Kalor: kalor jenis, kapasitas kalor, perubahan wujud, asas Black, perpindahan kalor (konduksi, konveksi, radiasi)',
      '- Getaran dan Gelombang: frekuensi, periode, amplitudo, panjang gelombang, cepat rambat',
      '- Usaha dan Energi: usaha, energi kinetik, energi potensial, hukum kekekalan energi, daya',
      '- Besaran dan Pengukuran: besaran pokok/turunan, satuan SI, dimensi, alat ukur, ketelitian, angka penting',
    ].join('\n');
  } else {
    depthLines = [
      '- Besaran dan Pengukuran: besaran pokok & turunan, satuan baku, alat ukur (penggaris, neraca, stopwatch, termometer)',
      '- Gerak Lurus: jarak, perpindahan, kelajuan, kecepatan, percepatan, GLB, GLBB',
      '- Gaya: Hukum Newton, gaya gesek, gaya berat, gaya normal, aplikasi sehari-hari',
      '- Tekanan: tekanan zat padat, zat cair (tekanan hidrostatis, hukum Pascal, hukum Archimedes), tekanan gas',
      '- Usaha dan Energi: usaha, energi kinetik, energi potensial, energi mekanik, kekekalan energi',
      '- Getaran dan Gelombang: getaran, gelombang transversal/longitudinal, frekuensi, periode, cepat rambat',
    ].join('\n');
  }

  var systemPrompt = [
    'Kamu adalah guru fisika profesional Indonesia yang menulis slide pembelajaran untuk siswa ' + gradeLabel + '.',
    '',
    'Buat slide markdown yang SANGAT LENGKAP dan KOMPREHENSIF untuk materi "' + topicLabel + '".',
    '',
    'PERSYARATAN:',
    '1. Bahasa: Bahasa Indonesia sepenuhnya',
    '2. Format: Markdown dengan heading levels (##, ###, ####)',
    '3. Buat 3-5 slide/section yang SETIAP slide HARUS berisi:',
    '   - Judul slide yang jelas',
    '   - Penjelasan teori yang lengkap dan mendalam',
    '   - Rumus-rumus penting dalam format kode blok (```blok kode```) atau `inline code`',
    '   - Minimal 2 CONTOH SOAL dengan PEMBAHASAN LENGKAP (soal + jawaban + cara penyelesaian langkah demi langkah)',
    '   - Aplikasi dalam kehidupan sehari-hari',
    '4. Setiap slide harus memiliki struktur:',
    '   - ## [Judul Slide] -- fokus spesifik',
    '   - ### Teori -- penjelasan konsep',
    '   - ### Rumus Penting -- rumus dengan keterangan variabel',
    '   - ### Contoh Soal -- soal + pembahasan step-by-step',
    '   - ### Ringkasan -- poin-poin kunci',
    '5. Gunakan formatting yang kaya: **bold** untuk istilah penting, *italic* untuk penekanan, `rumus` inline, ```blok rumus```, > blockquote untuk catatan penting',
    '6. Sertakan emoji untuk setiap slide (misal: ## Slide 1: Pengertian Kinematika)',
    '',
    depthLines,
    '',
    'HINDARI placeholder seperti [Materi utama tentang...] atau [Soal dan pembahasan].',
    'ISI DENGAN KONTEN NYATA. BUAT SANGAT LENGKAP -- setiap slide minimal 300-500 kata.',
  ].join('\n');

  var userPrompt = [
    'Buatkan slide markdown lengkap (3-5 slide) untuk:',
    '',
    'Mata Pelajaran: Fisika',
    'Topik: ' + topic,
    'Subtopik: ' + (subTopic || '-'),
    gradeLabel,
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

// ── Check if slide is still a placeholder or empty
function hasExistingContent(slide) {
  if (!slide || typeof slide !== 'string') return false;
  return slide.length >= 200 &&
         slide.indexOf('[Materi utama tentang') === -1 &&
         slide.indexOf('[Soal dan pembahasan]') === -1;
}

// ── Main
async function main() {
  console.log('Starting Fisika Slide Generation\n');
  console.log('API: ' + API_URL + ' | Model: ' + MODEL);
  console.log('API Key: ' + (API_KEY && API_KEY.length > 20 ? 'OK (' + API_KEY.length + ' chars)' : 'MISSING'));

  // 1. Fetch all Fisika materials
  var res = await pool.query(
    'SELECT id, topic, "subTopic", "gradeLevel", "curriculumId", metadata->>\'slide\' as slide FROM "Material" WHERE subject = $1 ORDER BY "gradeLevel", topic, "subTopic"',
    [SUBJECT]
  );

  var materials = res.rows;
  console.log('\nFound ' + materials.length + ' Fisika materials\n');
  console.log('--------------------------------------------------------------');

  var updated = 0;
  var skipped = 0;
  var errors = 0;

  for (var i = 0; i < materials.length; i++) {
    var mat = materials[i];
    var idx = i + 1;
    var existing = hasExistingContent(mat.slide);

    var topicLabel = (mat.subTopic && mat.subTopic.trim()) ? mat.topic + ' > ' + mat.subTopic : mat.topic;
    var levelLabel = mat.gradeLevel === 'SMA_2' ? 'SMA XI' : 'SMP VII';

    console.log('\n[' + idx + '/' + materials.length + '] [' + levelLabel + '] ' + topicLabel);
    console.log('  ID: ' + mat.id);
    console.log('  Status: ' + (existing ? 'Has content (skipping)' : 'Needs generation'));

    if (existing) {
      skipped++;
      continue;
    }

    // 2. Call LLM
    var messages = buildSlidePrompt(mat.topic, mat.subTopic, mat.gradeLevel);
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
    console.log('\nAll Fisika slides generated successfully!');
  }
}

main().catch(function(err) {
  console.error('\nFatal error: ' + err.message);
  process.exit(1);
});
