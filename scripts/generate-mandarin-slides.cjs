/**
 * Generate rich slide markdown for all 8 Bahasa Mandarin materials.
 * - Fetches all Mandarin materials
 * - Calls SumoPod LLM (deepseek-v4-flash) for each topic to generate comprehensive slides
 * - Updates the slide field in metadata JSONB via jsonb_set
 *
 * Usage: node generate-mandarin-slides.cjs
 */
const https = require('https');
const fs = require('fs');
const { Pool } = require('pg');

// ── Config
const SUBJECT = 'Bahasa Mandarin';
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

// ── Build slide prompt per topic
function buildSlidePrompt(topic) {
  const systemContent = `Kamu adalah guru Bahasa Mandarin profesional Indonesia yang menulis slide pembelajaran interaktif untuk siswa SMA/Paket (Kurikulum Merdeka).

Buat slide markdown yang SANGAT LENGKAP untuk topik "${topic}" dalam Bahasa Mandarin.

PERSYARATAN:
1. Buat 3-5 SLIDE dengan struktur berikut:

📄 **Slide 1 – Judul & Tujuan Pembelajaran**
   - Judul utama materi
   - Tujuan pembelajaran (🎯)
   - Pengenalan topik

📄 **Slide 2 – Kosakata & Karakter (HSK Vocabulary)**
   - Tabel kosakata: Hanzi | Pinyin | Arti (Indonesia)
   - Minimal 8-12 kosakata per slide set
   - Stroke order hint jika relevan
   - Contoh kalimat dengan kosakata tersebut

📄 **Slide 3 – Contoh Kalimat & Dialog**
   - Minimal 4-6 contoh kalimat lengkap
   - Format: [Hanzi] /pinyin/ → Arti Indonesia
   - Dialog pendek untuk情境 (situasi) nyata
   - Terjemahkan ke Bahasa Indonesia

📄 **Slide 4 – Latihan & Tantangan**
   - Exercise 1: Isi huruf kosong (fill in the blank)
   - Exercise 2: Terjemahkan kalimat
   - Exercise 3: Cocokkan pinyin dengan hanzi
   - Sajikan dalam bahasa Indonesia AND Mandarin

📄 **Slide 5 – Ringkasan & Tips**
   - Ringkasan poin-poin penting (📝)
   - Tips mengingat karakter (💡)
   - Kata kunci yang perlu diingat (🔑)

2. Bahasa: Penjelasan dalam Bahasa Indonesia, contoh kalimat bilingual (Mandarin + Indonesia)
3. Format markdown: bold, italic, tables, blockquote
4. Gunakan emoji yang relevan
5. KONTEN NYATA — tidak ada placeholder seperti [isi di sini]
6. Untuk HSK Levels: fokuskan pada kosakata dan struktur kalimat HSK yang sesuai level
7. Untuk Fondasi: fokus pada pengenalan nada, struktur kalimat dasar, sapaan
8. Untuk SOP/Semester: fokus pada outline pembelajaran dan tujuan kurikulum

Contoh format tabel kosakata:
| No | Hanzi | Pinyin | Arti |
|----|-------|--------|------|
| 1 | 你好 | nǐ hǎo | Halo |
| 2 | 谢谢 | xiè xie | Terima kasih |

Contoh format kalimat:
- 你好，我叫小明。 /nǐ hǎo, wǒ jiào Xiǎo Míng./ → Halo, nama saya Xiao Ming.`;

  return [
    { role: 'system', content: systemContent },
    {
      role: 'user',
      content: `Buatkan slide markdown lengkap untuk:

**Topik:** ${topic}
**Kelas:** SMA / Paket (Kurikulum Merdeka)
**Mata Pelajaran:** Bahasa Mandarin

Kembalikan HANYA konten markdown slide tanpa prolog, epilog, atau penjelasan tambahan. Langsung mulai dengan heading slide.`,
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
  console.log('🇨🇳 Starting Bahasa Mandarin Slide Generation\n');
  console.log(`📦 API: ${API_URL} | Model: ${MODEL}`);
  console.log(`🔑 API Key: ${API_KEY ? `✓ Set (${API_KEY.length} chars)` : '✗ MISSING — check .env'}`);

  if (!API_KEY) {
    console.error('❌ No valid API key found. Aborting.');
    await pool.end();
    process.exit(1);
  }

  // 1. Fetch all Mandarin materials
  const res = await pool.query(
    `SELECT id, topic, metadata FROM "Material"
     WHERE subject = $1
     ORDER BY id`,
    [SUBJECT]
  );

  const materials = res.rows;
  console.log(`📋 Found ${materials.length} Bahasa Mandarin materials\n`);
  console.log('─'.repeat(80));

  let updated = 0;
  let errors = 0;

  for (let i = 0; i < materials.length; i++) {
    const mat = materials[i];
    const idx = i + 1;

    console.log(`\n[${idx}/${materials.length}] ${mat.topic}`);
    console.log(`  ID: ${mat.id}`);

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

    // Rate-limit: 1.5s between requests
    if (i < materials.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
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
    console.log('\n🎉 All Bahasa Mandarin slides generated successfully!');
  }
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
