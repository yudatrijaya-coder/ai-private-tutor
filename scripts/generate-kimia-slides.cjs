/**
 * Generate rich slide markdown for all 47 Kimia SMA XI materials for SHOFI.
 * - Fetches all Kimia materials (curriculumId=98f0274e-4e39-45f5-9c79-3632c5717b27, subject='Kimia')
 * - Calls SumoPod LLM (deepseek-v4-flash) for each subTopic to generate comprehensive slides
 * - Updates the slide field in metadata JSONB
 *
 * Usage: node generate-kimia-slides.cjs
 */

const https = require('https');
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// ── Config
const CURRICULUM_ID = '98f0274e-4e39-45f5-9c79-3632c5717b27';
const SUBJECT = 'Kimia';
// Real key extracted from raw .env (dotenvx masks it at runtime)
const API_KEY = process.env.SUMOPOD_API_KEY && process.env.SUMOPOD_API_KEY.length > 20
  ? process.env.SUMOPOD_API_KEY
  : 'sk-we2LhWNDMBvNSi4RZHM0sg';
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
function callLLM(messages, retries = 0) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: MODEL, messages, temperature: 0.7, max_tokens: 4000 });

    const options = {
      hostname: 'ai.sumopod.com',
      port: 443,
      path: '/v1/chat/completions',
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
          reject(new Error(`Failed to parse response: ${data.substring(0, 200)}`));
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

    req.setTimeout(60000, () => {
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

// ── Build the prompt for slide generation
function buildSlidePrompt(topic, subTopic) {
  return [
    {
      role: 'system',
      content: `Kamu adalah guru kimia profesional Indonesia yang menulis slide pembelajaran untuk siswa SMA Kelas XI (Kurikulum Merdeka).

Buat slide markdown yang SANGAT LENGKAP dan KOMPREHENSIF untuk subtopik "${subTopic}" dalam topik "${topic}".

PERSYARATAN:
1. Bahasa: Bahasa Indonesia sepenuhnya
2. Format: Markdown dengan heading levels (##, ###, ####)
3. Setiap slide/section HARUS berisi:
   - Penjelasan teori yang lengkap dan mendalam
   - Minimal 2 CONTOH SOAL dengan PEMBAHASAN LENGKAP (soal + jawaban + cara penyelesaian)
   - Rumus-rumus penting dalam format yang jelas
   - Catatan/poin penting yang perlu diingat
   - Contoh aplikasi dalam kehidupan sehari-hari jika relevan
4. Untuk topik yang melibatkan perhitungan kimia, TUJUKAN 3-5 contoh soal dengan step-by-step
5. Gunakan formatting yang kaya: bold, italic, code blocks untuk rumus, blockquote untuk catatan penting
6. Sertakan bagian "🎯 Tujuan Pembelajaran", "📖 Materi Inti", "💡 Contoh Soal", "📝 Ringkasan"

Topik Kimia yang harusdicakup (sesuaikan kedalaman dengan subtopik):
- Termokimia: sistem/surrounding, eksoterm/endoterm, ΔH, Hukum Hess, diagram siklus, entalpi pembentukan, energi ikatan
- Laju Reaksi: konsep laju, faktor-faktor (konsentrasi, suhu, luas permukaan, katalis), teori tumbukan, orde reaksi, persamaan laju
- Kesetimbangan Kimia: kesetimbangan dinamis, Kc, Kp, hubungan Kc-Kp, Le Chatelier, aplikasi industri
- Asam dan Basa: teori Arrhenius/Bronsted-Lewis/Lewis, Ka, Kb, pH, pOH, indikator, titrasi
- Larutan Penyangga: komposisi, cara kerja, pH penyangga, kapasitas penyangga, aplikasi
- Hidrolisis Garam: reaksi asam-basa, hidrolisis kation/anion, Kh, pH garam
- Titrasi Asam-Basa: prinsip, kurva titrasi, indikator, perhitungan kadar
- Hidrokarbon dan Minyak Bumi: kekhasan atom C, alkana/alkena/alkuna, isomeri, reaksi, penyulingan

HINDARI placeholder seperti [Materi utama tentang...] atau [Soal dan pembahasan].
ISI DENGAN KONTEN NYATA.`,
    },
    {
      role: 'user',
      content: `Buatkan slide markdown lengkap untuk:

**Topik:** ${topic}
**Subtopik:** ${subTopic}
**Kelas:** XI SMA (Kurikulum Merdeka)
**Mata Pelajaran:** Kimia

Kembalikan HANYA konten markdown slide tanpa prolog atau epilog.`,
    },
  ];
}

// ── Update slide in metadata JSONB
async function updateSlide(materialId, slideMd) {
  // Escape single quotes for SQL string literal
  const escaped = slideMd.replace(/'/g, "''");
  const result = await pool.query(
    `UPDATE "Material"
     SET metadata = jsonb_set(metadata, '{slide}', to_jsonb($1::text))
     WHERE id = $2
     RETURNING id`,
    [slideMd, materialId]
  );
  return result.rowCount;
}

// ── Check if slide is still a placeholder
function isPlaceholder(slide) {
  if (!slide || typeof slide !== 'string') return true;
  return slide.includes('[Materi utama tentang') ||
         slide.includes('[Soal dan pembahasan]') ||
         slide.length < 200;
}

// ── Main
async function main() {
  console.log('🔬 Starting Kimia SMA XI Slide Generation for SHOFI\n');
  console.log(`📦 API: ${API_URL} | Model: ${MODEL}`);
  console.log(`🔑 API Key: ${API_KEY ? `✓ Set (${API_KEY.length} chars, ${API_KEY.substring(0,8)}...)` : '✗ MISSING'}`);

  // 1. Fetch all Kimia materials
  const res = await pool.query(
    `SELECT id, topic, "subTopic", metadata->>'slide' as slide
     FROM "Material"
     WHERE "curriculumId" = $1 AND subject = $2
     ORDER BY topic, "subTopic"`,
    [CURRICULUM_ID, SUBJECT]
  );

  const materials = res.rows;
  console.log(`📋 Found ${materials.length} Kimia materials\n`);
  console.log('─'.repeat(80));

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < materials.length; i++) {
    const mat = materials[i];
    const idx = i + 1;
    const isPlaceholderSlide = isPlaceholder(mat.slide);

    console.log(`\n[${idx}/${materials.length}] ${mat.topic} › ${mat.subTopic}`);
    console.log(`  ID: ${mat.id}`);
    console.log(`  Status: ${isPlaceholderSlide ? '⏳ Placeholder (will update)' : '✅ Has content (skipping)'}`);

    if (!isPlaceholderSlide) {
      console.log('  ➜ Skipping — slide already has content');
      skipped++;
      continue;
    }

    // 2. Call LLM
    const messages = buildSlidePrompt(mat.topic, mat.subTopic);
    let slideContent = '';
    let success = false;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        console.log(`  🤖 Calling SumoPod (attempt ${attempt}/${MAX_RETRIES + 1})...`);
        slideContent = await callLLM(messages);
        success = true;
        break;
      } catch (err) {
        console.warn(`  ⚠️  Attempt ${attempt} failed: ${err.message}`);
        if (attempt <= MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
        }
      }
    }

    if (!success) {
      console.error(`  ❌ Failed after ${MAX_RETRIES + 1} attempts — skipping`);
      errors++;
      continue;
    }

    // Ensure content is not empty
    if (!slideContent || slideContent.trim().length < 100) {
      console.error('  ❌ LLM returned empty/too-short content — skipping');
      errors++;
      continue;
    }

    // Strip markdown code fences if LLM wrapped it
    slideContent = slideContent.replace(/^```markdown\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    // 3. Update DB
    try {
      const count = await updateSlide(mat.id, slideContent);
      if (count > 0) {
        updated++;
        const preview = slideContent.substring(0, 80).replace(/\n/g, ' ');
        console.log(`  ✅ Updated (${slideContent.length} chars): "${preview}..."`);
      } else {
        console.warn('  ⚠️  No rows updated');
        errors++;
      }
    } catch (err) {
      console.error(`  ❌ DB update failed: ${err.message}`);
      errors++;
    }

    // Rate-limit: 1 request per second between materials
    if (i < materials.length - 1) {
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n📊 RESULTS:');
  console.log(`  ✅ Updated:  ${updated} materials`);
  console.log(`  ⏭️  Skipped:  ${skipped} materials (already have content)`);
  console.log(`  ❌ Errors:   ${errors} materials`);
  console.log(`  📦 Total:    ${materials.length} materials`);

  await pool.end();

  if (errors > 0) {
    console.log(`\n⚠️  ${errors} material(s) failed. Re-run the script to retry.`);
    process.exit(1);
  } else {
    console.log('\n🎉 All slides generated successfully!');
  }
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
