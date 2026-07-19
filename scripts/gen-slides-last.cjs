/**
 * Generate rich slide markdown for Bahasa Inggris Tingkat Lanjut (SMA_2)
 * Target material: Pengantar Bahasa Inggris Tingkat Lanjut
 * 
 * Usage: node gen-slides-last.cjs
 */
const https = require('https');
const fs = require('fs');
const { Pool } = require('pg');

// ── Config
const MATERIAL_ID = '1126855c-e24e-4408-9c2c-7381d4869884';
const SUBJECT = 'Bahasa Inggris Tingkat Lanjut';

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

// ── Build the prompt for Bahasa Inggris Tingkat Lanjut slide generation
function buildSlidePrompt(topic) {
  return [
    {
      role: 'system',
      content: `You are a professional English teacher creating comprehensive learning slides for SMA/MA Grade 11-12 students (Kurikulum Merdeka).

Create VERY COMPLETE and COMPREHENSIVE markdown slides for the topic "${topic}" in Bahasa Inggris Tingkat Lanjut (Advanced English) for SMA students.

REQUIREMENTS:
1. Language: Bahasa Indonesia for instructions, English for content/examples
2. Format: Markdown with heading levels (##, ###, ####)
3. Generate 3-5 SLIDES with the following structure:

📄 **Slide 1 – Judul & Tujuan Pembelajaran**
   - Main title of the material
   - Learning objectives (🎯) in Bahasa Indonesia

📄 **Slide 2 – Teori / Materi Inti (Core Theory)**
   - Complete and in-depth theory explanation
   - Important concepts and vocabulary
   - Grammar structures relevant to the topic

📄 **Slide 3 – Contoh / Applications**
   - Minimum 2 concrete examples
   - Sample sentences or texts that are illustrative
   - English content with Indonesian explanations

📄 **Slide 4 – Struktur & Unsur Kebahasaan (if relevant)**
   - Text structures being discussed
   - Dominant linguistic elements
   - Specific grammar points

📄 **Slide 5 – Ringkasan & Poin Penting**
   - Material summary (📝)
   - Key points (💡)
   - Important keywords (🔑)

4. Use rich formatting: bold, italic, blockquote for important notes
5. Include relevant emojis for each section
6. AVOID placeholders — FILL WITH REAL CONTENT.
7. Adjust depth based on the topic provided.

Advanced English Topics for SMA:
- Passive Voice & Tenses
- Reported Speech / Indirect Speech
- Conjunctions & Transition Words
- Complex Sentence Structures
- Formal vs Informal Language
- English for Specific Purposes (ESP)
- Text Types: Analytical Exposition, News Item, Narrative, Recount, etc.
- Vocabulary Building & Word Formation
- Reading Comprehension Strategies`,
    },
    {
      role: 'user',
      content: `Create comprehensive markdown slides for:

**Topik:** ${topic}
**Kelas:** XI-XII SMA (Kurikulum Merdeka)
**Mata Pelajaran:** Bahasa Inggris Tingkat Lanjut

Return ONLY the markdown slide content without prolog or epilog.`,
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
  console.log('📚 Starting Bahasa Inggris Tingkat Lanjut Slide Generation\n');
  console.log(`📦 API: ${API_URL} | Model: ${MODEL}`);
  console.log(`🔑 API Key: ${API_KEY ? `✓ Set (${API_KEY.length} chars)` : '✗ MISSING — check .env'}`);
  console.log(`🎓 Material ID: ${MATERIAL_ID}\n`);

  if (!API_KEY) {
    console.error('❌ No valid API key found. Aborting.');
    await pool.end();
    process.exit(1);
  }

  // 1. Fetch the specific material by ID
  const res = await pool.query(
    `SELECT id, topic, "subTopic", metadata
     FROM "Material"
     WHERE id = $1`,
    [MATERIAL_ID]
  );

  const material = res.rows[0];

  if (!material) {
    console.error(`❌ Material with ID ${MATERIAL_ID} not found.`);
    await pool.end();
    process.exit(1);
  }

  console.log(`📋 Found material:`);
  console.log(`   ID: ${material.id}`);
  console.log(`   Topic: ${material.topic}`);
  if (material.subTopic) console.log(`   Sub-Topic: ${material.subTopic}`);
  console.log('');

  // Check current slide status
  const currentSlide = material.metadata?.slide;
  if (currentSlide && currentSlide.trim().length > 100) {
    console.log('⚠️  Material already has slides. Skipping to avoid duplicate.');
    console.log(`   Current slide preview: ${currentSlide.substring(0, 100)}...`);
    await pool.end();
    process.exit(0);
  }

  console.log('─'.repeat(80));

  // 2. Call LLM
  const topic = material.subTopic || material.topic;
  const messages = buildSlidePrompt(topic);
  let slideContent = '';
  let success = false;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      console.log(`\n🤖 Calling SumoPod (attempt ${attempt}/${MAX_RETRIES + 1})...`);
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
    console.error('\n❌ Failed after maximum retries.');
    await pool.end();
    process.exit(1);
  }

  // Ensure content is not empty
  if (!slideContent || slideContent.trim().length < 100) {
    console.error('❌ LLM returned empty/too-short content.');
    await pool.end();
    process.exit(1);
  }

  // Strip markdown code fences if LLM wrapped it
  slideContent = slideContent.replace(/^```markdown\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  // 3. Update DB
  try {
    const count = await updateSlide(material.id, slideContent);
    if (count > 0) {
      const preview = slideContent.substring(0, 120).replace(/\n/g, ' ');
      console.log('\n✅ SUCCESS!');
      console.log(`   Updated ${count} row(s)`);
      console.log(`   Slide content: ${slideContent.length} characters`);
      console.log(`   Preview: "${preview}..."`);
    } else {
      console.warn('⚠️  No rows updated');
    }
  } catch (err) {
    console.error(`❌ DB update failed: ${err.message}`);
    await pool.end();
    process.exit(1);
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n🎉 Bahasa Inggris Tingkat Lanjut slide generated successfully!');
  
  await pool.end();
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
