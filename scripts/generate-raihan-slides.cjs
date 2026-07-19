/**
 * Generate rich slide markdown for all Raihan SMP_1 materials missing slides.
 * - curriculumId = e94cf3dd-3fae-4fae-b28f-e7aa899d11e7
 * - WHERE metadata->>'slide' IS NULL OR metadata->>'slide' = ''
 * - Calls SumoPod LLM (deepseek-v4-flash) for each material
 * - Updates metadata->>'slide' via jsonb_set
 *
 * Usage: node generate-raihan-slides.cjs
 */

const https = require('https');
const fs = require('fs');
const { Pool } = require('pg');

// ── Config
const CURRICULUM_ID = 'e94cf3dd-3fae-4fae-b28f-e7aa899d11e7';
const API_URL = 'https://ai.sumopod.com/v1/chat/completions';
const MODEL = 'deepseek-v4-flash';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

// Real key extracted from raw .env (dotenvx masks it at runtime)
const envContent = fs.readFileSync('/home/ubuntu/ai-private-tutor/.env', 'utf8');
const apiKeyMatch = envContent.match(/SUMOPOD_API_KEY\s*=\s*["']?([^"'&\n]+)/);
const API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : '';

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

// ── Build the prompt for slide generation (SMP level, Indonesian)
function buildSlidePrompt(topic, subTopic, subject) {
  return [
    {
      role: 'system',
      content: `Kamu adalah guru profesional Indonesia yang menulis slide pembelajaran untuk siswa SMP Kelas VII/VIII/IX (Kurikulum Merdeka).

Buat slide markdown yang SANGAT LENGKAP dan KOMPREHENSIF untuk subtopik "${subTopic}" dalam topik "${topic}" (${subject}).

PERSYARATAN:
1. Bahasa: Bahasa Indonesia sepenuhnya
2. Format: Markdown dengan heading levels (##, ###, ####)
3. Setiap slide/section HARUS berisi:
   - Penjelasan teori yang lengkap dan mendalam (sesuaikan kedalaman dengan level SMP)
   - Minimal 2 CONTOH SOAL dengan PEMBAHASAN LENGKAP (soal + jawaban + cara penyelesaian)
   - Rumus-rumus penting dalam format yang jelas
   - Catatan/poin penting yang perlu diingat
   - Contoh aplikasi dalam kehidupan sehari-hari jika relevan
4. Untuk topik matematika/IPA, TUJUKAN 3-5 contoh soal dengan step-by-step
5. Gunakan formatting yang kaya: bold, italic, code blocks untuk rumus, blockquote untuk catatan penting
6. Sertakan bagian "🎯 Tujuan Pembelajaran", "📖 Materi Inti", "💡 Contoh Soal", "📝 Ringkasan"
7. Berikan 3-5 slide markdown (bisa lebih banyak section dalam 1 file)

HINDARI placeholder seperti [Materi utama tentang...] atau [Soal dan pembahasan].
ISI DENGAN KONTEN NYATA.`,
    },
    {
      role: 'user',
      content: `Buatkan slide markdown lengkap untuk:

**Topik:** ${topic}
**Subtopik:** ${subTopic}
**Kelas:** SMP VII/VIII/IX (Kurikulum Merdeka)
**Mata Pelajaran:** ${subject}

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
  console.log('🎓 Starting Raihan SMP_1 Slide Generation\n');
  console.log(`📦 API: ${API_URL} | Model: ${MODEL}`);
  console.log(`🔑 API Key: ${API_KEY ? `✓ Set (${API_KEY.length} chars, ${API_KEY.substring(0, 8)}...)` : '✗ MISSING'}`);

  // 1. Fetch all materials missing slides
  const res = await pool.query(
    `SELECT id, topic, "subTopic", subject,
            metadata->>'slide' as slide,
            metadata->>'grade' as grade,
            metadata->>'description' as description
     FROM "Material"
     WHERE "curriculumId" = $1
       AND (metadata->>'slide' IS NULL OR metadata->>'slide' = '')
     ORDER BY topic, "subTopic"`,
    [CURRICULUM_ID]
  );

  const materials = res.rows;
  console.log(`📋 Found ${materials.length} materials needing slides\n`);
  console.log('─'.repeat(80));

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < materials.length; i++) {
    const mat = materials[i];
    const idx = i + 1;

    console.log(`\n[${idx}/${materials.length}] ${mat.topic} › ${mat.subTopic}`);
    console.log(`  Subject: ${mat.subject} | Grade: ${mat.grade || 'SMP'}`);
    console.log(`  ID: ${mat.id}`);

    // 2. Build prompt with corrected variable name
    const messages = buildSlidePrompt(mat.topic, mat.subTopic, mat.subject);
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

    // Rate-limit: 1.2s between materials
    if (i < materials.length - 1) {
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n📊 RESULTS:');
  console.log(`  ✅ Updated:  ${updated} materials`);
  console.log(`  ⏭️  Skipped:  ${skipped} materials`);
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
