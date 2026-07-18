const https = require('https');
const { Pool } = require('pg');

const API_KEY = 'sk-we2LhWNDMBvNSi4RZHM0sg';
const MODEL = 'deepseek-v4-flash';
const pool = new Pool({ host: 'localhost', port: 5432, database: 'ai_private_tutor', user: 'tutor', password: 'tutor123' });

function callLLM(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: MODEL, messages, temperature: 0.7, max_tokens: 4000 });
    const opts = {
      hostname: 'ai.sumopod.com', port: 443, path: '/v1/chat/completions', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data).choices[0].message.content);
        } catch (e) {
          reject(new Error('Parse error: ' + data.substring(0, 300)));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function fixMaterial(id, topic, subTopic) {
  process.stdout.write('Fixing: ' + subTopic + ' ... ');
  const msgs = [
    {
      role: 'system',
      content: 'Kamu guru kimia profesional Indonesia. Buat slide markdown LENGKAP untuk siswa SMA XI Kurikulum Merdeka. Bahasa Indonesia sepenuhnya. WAJIB ada: tujuan pembelajaran, teori lengkap dengan penjelasan mendalam, minimal 2 contoh soal dengan pembahasan step-by-step, rumus dalam format jelas, dan ringkasan. TIDAK boleh pakai placeholder seperti [Materi utama tentang...].'
    },
    {
      role: 'user',
      content: 'Topik: ' + topic + '\nSubtopik: ' + subTopic + '\nKelas: XI SMA Kurikulum Merdeka\nMata Pelajaran: Kimia\nKembalikan HANYA konten markdown slide tanpa prolog atau epilog.'
    },
  ];

  const slide = await callLLM(msgs);
  const clean = slide
    .replace(/```markdown\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim()
    .replace(/'/g, "''");

  await pool.query(
    'UPDATE "Material" SET metadata = jsonb_set(metadata, $1, to_jsonb($2::text)) WHERE id = $3',
    ['{slide}', clean, id]
  );
  console.log('OK (' + slide.length + ' chars)');
}

async function main() {
  const fixes = [
    { id: 'bf68e94c-9ada-41aa-9258-e148bb2f00df', topic: 'Kesetimbangan Kimia', subTopic: 'Hubungan Kc dan Kp' },
    { id: '6c5b10a2-8a71-485e-8223-5d6572c818e9', topic: 'Asam dan Basa', subTopic: 'Indikator Asam Basa dan Titrasi Asam Basa' },
  ];

  for (const f of fixes) {
    try {
      await fixMaterial(f.id, f.topic, f.subTopic);
    } catch (err) {
      console.error('FAILED:', err.message);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  // Verify
  const res = await pool.query(
    "SELECT \"subTopic\", length(metadata->>'slide') as chars FROM \"Material\" WHERE \"curriculumId\"='98f0274e-4e39-45f5-9c79-3632c5717b27' AND subject='Kimia' AND \"subTopic\" IN ('Hubungan Kc dan Kp', 'Indikator Asam Basa dan Titrasi Asam Basa')"
  );
  console.log('\nVerification:');
  res.rows.forEach(r => console.log(' ', r.subTopic, ':', r.chars, 'chars'));
  await pool.end();
}

main().catch(console.error);
