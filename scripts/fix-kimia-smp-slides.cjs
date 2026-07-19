/**
 * Fix 6 Kimia SMP (Raihan) empty slides
 * Material IDs: 7d011f61, fe4680b2, 60280a27, dabedf86, 398cc9b8, c2fbb6b0
 */

const DB_CONFIG = {
  host: 'localhost',
  user: 'tutor',
  password: 'tutor123',
  database: 'ai_private_tutor',
};

const MATERIALS = [
  { id: '7d011f61-28ba-47d6-a6e4-a560b05e3d7c', topic: 'Hakikat Kimia', subTopic: 'Metode Ilmiah dan Laboratorium' },
  { id: 'fe4680b2-ef70-4703-b5c2-65a5b26d6145', topic: 'Unsur', subTopic: 'Lambang Unsur dan Tabel Periodik' },
  { id: '60280a27-e138-4ade-b54c-052e0b461382', topic: 'Senyawa', subTopic: 'Rumus Kimia dan Tata Nama' },
  { id: 'dabedf86-8912-42c4-90ed-fac15c87f0c4', topic: 'Campuran', subTopic: 'Larutan dan Konsentrasi' },
  { id: '398cc9b8-a8a8-48d8-ad50-e445dfc40fe1', topic: 'Asam Basa', subTopic: 'Sifat Asam dan Basa' },
  { id: 'c2fbb6b0-64bd-4654-a4c6-ca9d1c5c1880', topic: 'Reaksi Kimia', subTopic: 'Reaksi Kimia Sederhana' },
];

const { Client } = require('pg');
const https = require('https');

function getApiKey() {
  const fs = require('fs');
  const env = fs.readFileSync('/home/ubuntu/ai-private-tutor/.env', 'utf8');
  const match = env.match(/SUMOPOD_API_KEY\s*=\s*["']?([^"'&\n]+)/);
  return match ? match[1].trim() : '';
}

function callLLM(prompt) {
  return new Promise((resolve, reject) => {
    const apiKey = getApiKey();
    const body = JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const options = {
      hostname: 'ai.sumopod.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.choices?.[0]?.message?.content || '');
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function buildPrompt(topic, subTopic) {
  return `Generate rich slide content for a Chemistry (Kimia) lesson for Indonesian SMP students (grade 7/8/9).

Topic: ${topic}
Sub-topic: ${subTopic}
Grade: SMP (middle school)
Language: Indonesian

Create 3-5 slides in markdown format with:
- Slide title and learning objectives
- Theory explanation with examples
- Formulas (in code blocks)
- Worked examples
- Key points summary

Format each slide like this:
📄 **Slide N – Title**

content...

---

Make it comprehensive but appropriate for SMP level. Return ONLY the slide content in markdown format, no extra text.`;
}

async function fixSlides() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  for (const mat of MATERIALS) {
    console.log(`Processing: ${mat.topic} - ${mat.subTopic}`);
    try {
      const prompt = buildPrompt(mat.topic, mat.subTopic);
      const slide = await callLLM(prompt);
      
      if (slide && slide.length > 100) {
        await client.query(
          `UPDATE "Material" SET metadata = jsonb_set(metadata, '{slide}', $1) WHERE id = $2`,
          [JSON.stringify(slide), mat.id]
        );
        console.log(`✅ ${mat.topic}: ${slide.length} chars`);
      } else {
        console.log(`❌ ${mat.topic}: slide too short (${slide.length} chars)`);
      }
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(`❌ ${mat.topic}: ${e.message}`);
    }
  }

  console.log('\nDone!');
  await client.end();
}

fixSlides().catch(console.error);
