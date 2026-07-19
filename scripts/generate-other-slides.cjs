const https = require('https');
const fs = require('fs');
const { Pool } = require('pg');

// Load API key from .env file
const envContent = fs.readFileSync('/home/ubuntu/ai-private-tutor/.env', 'utf8');
const apiKeyMatch = envContent.match(/SUMOPOD_API_KEY\s*=\s*["']?([^"'&\n]+)/);
const API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : '';
const MODEL = 'deepseek-v4-flash';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ai_private_tutor',
  user: 'tutor',
  password: 'tutor123',
});

// Excluded curricula (SHOFI SMA_2 and Raihan SMP_1)
const EXCLUDED_CURRICULA = [
  '98f0274e-4e39-45f5-9c79-3632c5717b27',
  'e94cf3dd-3fae-4fae-b28f-e7aa899d11e7',
];

function callLLM(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: MODEL, messages, temperature: 0.7, max_tokens: 4000 });
    const opts = {
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
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.choices[0].message.content);
        } catch (e) {
          reject(new Error('Parse error: ' + data.substring(0, 500)));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getGradePrompt(gradeLevel) {
  const grades = {
    'SD_1': 'kelas 1 SD',
    'SD_2': 'kelas 2 SD',
    'SD_3': 'kelas 3 SD',
    'SD_4': 'kelas 4 SD',
    'SD_5': 'kelas 5 SD Kurikulum Merdeka',
    'SD_6': 'kelas 6 SD Kurikulum Merdeka',
    'SMP_1': 'kelas 7 SMP Kurikulum Merdeka',
    'SMP_2': 'kelas 8 SMP',
    'SMP_3': 'kelas 9 SMP',
    'SMA_1': 'kelas 10 SMA',
    'SMA_2': 'kelas 11 SMA',
    'SMA_3': 'kelas 12 SMA',
  };
  return grades[gradeLevel] || gradeLevel;
}

function getSystemPrompt(gradeLevel) {
  const grade = getGradePrompt(gradeLevel);
  return `Kamu adalah guru profesional Indonesia yang ahli dalam membuat materi pembelajaran. Buat slide markdown yang kaya dan lengkap untuk siswa ${grade}. 

Kriteria slide:
- 3-5 paragraf slide markdown yang kaya dan mendalam
- Setiap slide harus memiliki judul (##), poin-poin utama, dan contoh jika relevan
- Sesuaikan bahasa dan konsep dengan tingkat ${grade}
- Bahasa Indonesia sepenuhnya
- Include contoh soal/aplikasi praktis untuk subjek Matematika, IPA, IPAS
- Include kosakata Bahasa Inggris untuk subjek Bahasa Inggris
- Include kegiatan/latihan yang sesuai
- TIDAK boleh pakai placeholder seperti [materi tentang...]
- Struktur markdown yang bersih dan terorganisir`;
}

async function generateSlide(topic, subTopic, subject, gradeLevel) {
  const grade = getGradePrompt(gradeLevel);
  
  const msgs = [
    {
      role: 'system',
      content: getSystemPrompt(gradeLevel),
    },
    {
      role: 'user',
      content: `Topik: ${topic}\nSub-topik: ${subTopic || 'Umum'}\nMata Pelajaran: ${subject}\nKelas: ${grade}\n\nBuat slide markdown yang kaya (3-5 paragraf slide) untuk materi ini. Kembalikan HANYA konten markdown slide tanpa prolog atau epilog.`,
    },
  ];

  return await callLLM(msgs);
}

async function updateMaterialSlide(id, slide) {
  // Escape single quotes for SQL
  const clean = slide
    .replace(/```markdown\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim()
    .replace(/'/g, "''");

  await pool.query(
    'UPDATE "Material" SET metadata = jsonb_set(metadata, $1, to_jsonb($2::text)) WHERE id = $3',
    ['{slide}', clean, id]
  );
}

async function processMaterials() {
  console.log('Fetching materials without slides...\n');

  // Get all materials that need slides (excluding specified curricula)
  const result = await pool.query(`
    SELECT m.id, m.topic, m."subTopic", m.subject, m."gradeLevel", c.id as curriculum_id, s.name as student_name
    FROM "Material" m
    JOIN "Curriculum" c ON m."curriculumId" = c.id
    JOIN "Student" s ON c."studentId" = s.id
    WHERE (m.metadata->>'slide' IS NULL OR m.metadata->>'slide' = '' OR m.metadata->>'slide' = 'null')
    AND c.id NOT IN ($1, $2)
    ORDER BY s.name, m.subject, m.topic, m."weekOrder"
  `, EXCLUDED_CURRICULA);

  const materials = result.rows;
  console.log(`Found ${materials.length} materials to process\n`);

  // Group by curriculum/student
  const byStudent = {};
  for (const m of materials) {
    if (!byStudent[m.student_name]) {
      byStudent[m.student_name] = { count: 0, subjects: new Set(), materials: [] };
    }
    byStudent[m.student_name].count++;
    byStudent[m.student_name].subjects.add(m.subject);
    byStudent[m.student_name].materials.push(m);
  }

  console.log('Materials by student:');
  for (const [name, data] of Object.entries(byStudent)) {
    console.log(`  ${name}: ${data.count} materials (${[...data.subjects].join(', ')})`);
  }
  console.log('');

  // Process materials
  const stats = {
    success: 0,
    failed: 0,
    skipped: 0,
    byStudent: {},
    failures: [],
  };

  for (const m of materials) {
    if (!stats.byStudent[m.student_name]) {
      stats.byStudent[m.student_name] = { success: 0, failed: 0 };
    }

    // Check if slide already exists (double-check)
    const checkResult = await pool.query(
      `SELECT metadata->>'slide' as slide FROM "Material" WHERE id = $1`,
      [m.id]
    );
    const currentSlide = checkResult.rows[0]?.slide;
    
    if (currentSlide && currentSlide.length > 50 && currentSlide !== 'null') {
      console.log(`SKIP [${m.student_name}] ${m.subject} - ${m.topic}: slide already exists`);
      stats.skipped++;
      stats.byStudent[m.student_name].success++;
      continue;
    }

    process.stdout.write(`[${m.student_name}] ${m.subject} - ${m.topic}${m.subTopic ? ' / ' + m.subTopic : ''}... `);

    try {
      const slide = await generateSlide(m.topic, m.subTopic, m.subject, m.gradeLevel);
      
      if (!slide || slide.length < 100) {
        throw new Error('Generated slide too short or empty');
      }

      await updateMaterialSlide(m.id, slide);
      
      console.log(`OK (${slide.length} chars)`);
      stats.success++;
      stats.byStudent[m.student_name].success++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      stats.failed++;
      stats.byStudent[m.student_name].failed++;
      stats.failures.push({
        id: m.id,
        topic: m.topic,
        subject: m.subject,
        student: m.student_name,
        error: err.message,
      });
    }

    // Rate limiting - wait between requests
    await new Promise(r => setTimeout(r, 1200));
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total materials processed: ${materials.length}`);
  console.log(`  ✓ Success: ${stats.success}`);
  console.log(`  ✗ Failed: ${stats.failed}`);
  console.log(`  ⊘ Skipped (already had slides): ${stats.skipped}`);
  console.log('');

  console.log('By student:');
  for (const [name, data] of Object.entries(stats.byStudent)) {
    console.log(`  ${name}: ${data.success} success, ${data.failed} failed`);
  }

  if (stats.failures.length > 0) {
    console.log('\nFailed materials:');
    for (const f of stats.failures) {
      console.log(`  - [${f.student}] ${f.subject} - ${f.topic}: ${f.error}`);
    }
  }

  await pool.end();
  console.log('\nDone!');
}

processMaterials().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
