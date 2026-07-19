/**
 * Generate rich slide markdown for Bahasa Indonesia SMA materials.
 * - Fetches all Bahasa Indonesia materials from curriculum SMA_2
 * - Calls SumoPod LLM (deepseek-v4-flash) for each topic to generate comprehensive slides
 * - Updates the slide field in metadata JSONB
 *
 * Usage: node gen-slides-bahasa-indonesia.cjs
 */
const https = require('https');
const fs = require('fs');
const { Pool } = require('pg');

// ── Config
const CURRICULUM_ID = '98f0274e-4e39-45f5-9c79-3632c5717b27';
const SUBJECT = 'Bahasa Indonesia';

// Read raw key from .env
const envRaw = fs.readFileSync(require('path').join(__dirname, '../.env'), 'utf8');
const keyMatch = envRaw.match(/SUMOPOD_API_KEY="([^"]+)"/);
const API_KEY = keyMatch ? keyMatch[1] : null;
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
function buildSlidePrompt(topic) {
  return [
    {
      role: 'system',
      content: `Kamu adalah guru bahasa Indonesia profesional yang menulis slide pembelajaran untuk siswa SMA Kelas XI (Kurikulum Merdeka).

Buat slide markdown yang SANGAT LENGKAP dan KOMPREHENSIF untuk topik "${topic}" dalam pelajaran Bahasa Indonesia SMA.

PERSYARATAN:
1. Bahasa: Bahasa Indonesia sepenuhnya
2. Format: Markdown dengan heading levels (##, ###, ####)
3. HASILKAN 3-5 SLIDE dengan struktur sebagai berikut:

📄 **Slide 1 – Judul & Tujuan Pembelajaran**
   - Judul utama materi
   - Tujuan pembelajaran (🎯)

📄 **Slide 2 – Teori / Materi Inti**
   - Penjelasan teori yang lengkap dan mendalam
   - Konsep-konsep penting
   - Definisi dan penjelasan yang tepat

📄 **Slide 3 – Contoh / Aplikasi**
   - Minimal 2 contoh konkret
   - Contoh teks atau kalimat yang ilustratif

📄 **Slide 4 – Struktur & Unsur Kebahasaan (jika relevan)**
   - Struktur teks yang dibahas
   - Unsur kebahasaan yang dominan

📄 **Slide 5 – Ringkasan & Poin Penting**
   - Ringkasan materi (📝)
   - Poin-poin kunci (💡)
   - Kata kunci penting (🔑)

4. Gunakan formatting yang kaya: bold, italic, blockquote untuk catatan penting
5. Sertakan emoji yang relevan untuk setiap section
6. HINDARI placeholder — ISI DENGAN KONTEN NYATA.
7. Sesuaikan kedalaman dengan topik yang diberikan.

Materi Bahasa Indonesia SMA yang mungkin dicakup:
- Cerpen (Cerita Pendek): struktur, unsur intrinsik/ekstrinsik, kebahasaan
- Novel: struktur, tokoh, alur, tema, latar
- Teks Argumentasi: struktur, opini/fakta, kebahasaan persuasif
- Teks Eksposisi: struktur, informasi faktual, kebahasaan
- Teks Persuasi/Poster: struktur, ajakan, bahasa persuasif
- Drama: struktur, dialog, peran tokoh
- Berita: struktur, 5W+1H, objektivitas
- Karya Ilmiah: struktur, bahasa formal, sitasi
- Poster: desain, pesan persuasif, visual`,
    },
    {
      role: 'user',
      content: `Buatkan slide markdown lengkap untuk:

**Topik:** ${topic}
**Kelas:** XI SMA (Kurikulum Merdeka)
**Mata Pelajaran:** Bahasa Indonesia

Kembalikan HANYA konten markdown slide tanpa prolog atau epilog.`,
    },
  ];
}

// ── Update slide in metadata JSONB
async function updateSlide(materialId, slideMd) {
  const result = await pool.query(
    `UPDATE "Material"
     SET metadata = jsonb_set(metadata, '{slide}', to_jsonb($1::text))
     WHERE id = $2
     RETURNING id`,
    [slideMd, materialId]
  );
  return result.rowCount;
}

// ── Main
async function main() {
  console.log('📚 Starting Bahasa Indonesia SMA Slide Generation\n');
  console.log(`📦 API: ${API_URL} | Model: ${MODEL}`);
  console.log(`🔑 API Key: ${API_KEY ? `✓ Set (${API_KEY.length} chars)` : '✗ MISSING — check .env'}`);
  console.log(`🎓 Curriculum ID: ${CURRICULUM_ID}\n`);

  if (!API_KEY) {
    console.error('❌ No valid API key found. Aborting.');
    await pool.end();
    process.exit(1);
  }

  // 1. Fetch all Bahasa Indonesia materials from SMA_2 with empty slides
  const res = await pool.query(
    `SELECT id, topic, "subTopic", metadata->>'slide' as slide
     FROM "Material"
     WHERE "curriculumId" = $1
       AND subject = $2
       AND (metadata->>'slide' IS NULL OR metadata->>'slide' = '' OR metadata->>'slide' = '[]')
     ORDER BY topic`,
    [CURRICULUM_ID, SUBJECT]
  );

  const materials = res.rows;
  console.log(`📋 Found ${materials.length} Bahasa Indonesia materials with empty slides\n`);
  console.log('─'.repeat(80));

  if (materials.length === 0) {
    console.log('✅ No materials need slides. All done!');
    await pool.end();
    process.exit(0);
  }

  let updated = 0;
  let errors = 0;

  for (let i = 0; i < materials.length; i++) {
    const mat = materials[i];
    const idx = i + 1;

    console.log(`\n[${idx}/${materials.length}] ${mat.topic}`);
    console.log(`  ID: ${mat.id}`);
    if (mat.subTopic) console.log(`  Sub-Topic: ${mat.subTopic}`);

    // 2. Call LLM
    const messages = buildSlidePrompt(mat.topic);
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

    // Rate-limit: 1.2s between requests
    if (i < materials.length - 1) {
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n📊 RESULTS:');
  console.log(`  ✅ Updated:  ${updated} materials`);
  console.log(`  ❌ Errors:   ${errors} materials`);
  console.log(`  📦 Total:    ${materials.length} materials`);

  await pool.end();

  if (errors > 0) {
    console.log(`\n⚠️  ${errors} material(s) failed. Re-run to retry.`);
    process.exit(1);
  } else {
    console.log('\n🎉 All Bahasa Indonesia slides generated successfully!');
  }
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
