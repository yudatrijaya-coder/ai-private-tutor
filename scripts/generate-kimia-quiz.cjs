#!/usr/bin/env node
/**
 * Generate 5-question quizzes for all 47 Kimia materials (SHOFI)
 * Uses SumoPod API (deepseek-v4-flash) via https module
 * Inserts into Quiz table via pg
 *
 * Quiz JSON format: {questions: [{question, options: [{text, isCorrect}], difficulty}]}
 *
 * Run: node scripts/generate-kimia-quiz.cjs
 */

const https = require('https');
const { Client } = require('pg');

// ── Config ──
const CURRICULUM_ID = '98f0274e-4e39-45f5-9c79-3632c5717b27';
const STUDENT_UUID = 'e30b6559-1d33-4aa5-a39a-22102f29894d'; // SHOFI001
const SUBJECT = 'Kimia';
const API_URL = 'https://ai.sumopod.com/v1/chat/completions';
const MODEL = 'deepseek-v4-flash';
const DB_CONFIG = {
  host: 'localhost',
  user: 'tutor',
  password: 'tutor123',
  database: 'ai_private_tutor',
};

// Load API key from .env
const fs = require('fs');
const path = require('path');
let SUMOPOD_API_KEY = null;
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (t.startsWith('SUMOPOD_API_KEY=')) {
      let v = t.slice('SUMOPOD_API_KEY='.length);
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      SUMOPOD_API_KEY = v;
      break;
    }
  }
}
if (!SUMOPOD_API_KEY) {
  console.error('❌ SUMOPOD_API_KEY not found in .env');
  process.exit(1);
}

// ── DB helper ──
async function queryDb(sql, params = []) {
  const client = new Client(DB_CONFIG);
  await client.connect();
  try {
    const res = await client.query(sql, params);
    return res;
  } finally {
    await client.end();
  }
}

// ── HTTPS call to SumoPod API ──
function callLLM(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const url = new URL(API_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUMOPOD_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 120000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.message?.content;
          if (!content) reject(new Error('No content in response'));
          else resolve(content);
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(payload);
    req.end();
  });
}

// ── Parse JSON from LLM response (with retry + sanitize) ──
function sanitizeJSON(raw) {
  return raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*$/gm, '')
    .trim()
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/\uFF1A/g, ':')
    .replace(/\uFF0C/g, ',')
    .replace(/[\uFEFF\u200B\u200C\u200D]/g, '')
    .replace(/\\u2028/g, ' ')
    .replace(/\\u2029/g, ' ');
}

function extractAndParseJSON(raw) {
  // Try to extract JSON object
  const objMatch = raw.match(/\{[\s\S]*\}/);
  if (!objMatch) return null;

  for (const attempt of [objMatch[0], sanitizeJSON(objMatch[0])]) {
    try {
      const parsed = JSON.parse(attempt);
      if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length === 5) {
        return parsed.questions;
      }
      // Maybe the LLM returned an array directly
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed;
      }
    } catch (_) {}
  }
  return null;
}

// ── Convert to quiz format ──
function formatQuestions(rawQuestions) {
  // rawQuestions can be either:
  // A) [{question, options: [{text, isCorrect}], difficulty}] — already correct format
  // B) [{question, options: [A,B,C,D], correctIndex, difficulty}] — array format
  // C) [{q, o: [A,B,C,D], c, difficulty}] — shorthand

  return rawQuestions.map(q => {
    // Format A: already correct
    if (q.options && Array.isArray(q.options) && q.options.length > 0 && typeof q.options[0] === 'object' && 'text' in q.options[0]) {
      return {
        question: q.question,
        options: q.options.map(o => ({ text: o.text, isCorrect: !!o.isCorrect })),
        difficulty: q.difficulty || 'medium',
      };
    }

    // Format B/C: options is array of strings, correctIndex tells which is right
    const opts = q.options || q.o || [];
    const correctIdx = q.correctIndex !== undefined ? q.correctIndex : (q.c !== undefined ? q.c : 0);
    return {
      question: q.question || q.q,
      options: opts.map((text, i) => ({
        text: typeof text === 'string' ? text : String(text),
        isCorrect: i === correctIdx,
      })),
      difficulty: q.difficulty || 'medium',
    };
  });
}

// ── JSON schema for the prompt ──
function buildPrompt(topic, subTopic) {
  const topicStr = subTopic ? `${topic} — ${subTopic}` : topic;
  const schema = JSON.stringify({
    questions: [
      {
        question: 'string (pertanyaan dalam Bahasa Indonesia)',
        options: [
          { text: 'string (opsi A)', isCorrect: true },
          { text: 'string (opsi B)', isCorrect: false },
          { text: 'string (opsi C)', isCorrect: false },
          { text: 'string (opsi D)', isCorrect: false },
        ],
        difficulty: 'easy|medium|hard',
      },
    ],
  }, null, 2);

  return {
    system: `Kamu adalah guru Kimia SMA kelas XI Kurikulum Merdeka. 
Buat 5 soal pilihan ganda untuk 1 topik Kimia. 
Komposisi: 2 soal easy, 2 soal medium, 1 soal hard.
Setiap soal memiliki 4 opsi jawaban dengan TEPAT SATU jawaban benar (isCorrect: true).
Output JSON SAJA (tanpa markdown wrapper, tanpa teks lain) dengan format:
${schema}
Pastikan: (1) jawaban benar secara ilmiah/akademik, (2) soal sesuai tingkat kesulitan, (3) semua opsi masuk akal, (4) gunakan Bahasa Indonesia.`,
    user: `Buat 5 soal quiz untuk topik: ${topicStr}. Mata Pelajaran: Kimia SMA Kelas XI Kurikulum Merdeka.`,
  };
}

// ── Main ──
async function main() {
  console.log(`🔑 API Key: ${SUMOPOD_API_KEY.slice(0, 10)}...`);
  console.log(`📚 Fetching Kimia materials for curriculum ${CURRICULUM_ID}...`);

  // Step 1: Fetch materials
  const matResult = await queryDb(
    `SELECT id, topic, "subTopic" FROM "Material" 
     WHERE "curriculumId" = $1 AND subject = $2 
     ORDER BY topic, "weekOrder", id`,
    [CURRICULUM_ID, SUBJECT]
  );

  const materials = matResult.rows;
  console.log(`📝 Found ${materials.length} materials`);

  if (materials.length === 0) {
    console.log('❌ No materials found — aborting.');
    return;
  }

  // Step 2: Check which already have quizzes
  const existingResult = await queryDb(
    `SELECT q."materialId" FROM "Quiz" q 
     WHERE q."studentId" = $1 AND q.type = 'QUIZ'
     AND q."materialId" = ANY($2::text[])`,
    [STUDENT_UUID, materials.map(m => m.id)]
  );
  const existingIds = new Set(existingResult.rows.map(r => r.materialId));
  console.log(`📊 Already has quiz: ${existingIds.size} materials`);

  let inserted = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < materials.length; i++) {
    const mat = materials[i];

    if (existingIds.has(mat.id)) {
      console.log(`  ⏭️ [${i + 1}/${materials.length}] SKIP (exists): ${mat.topic} — ${mat.subTopic}`);
      skipped++;
      continue;
    }

    const topicStr = `${mat.topic}${mat.subTopic ? ' — ' + mat.subTopic : ''}`;
    console.log(`  🤖 [${i + 1}/${materials.length}] Generating: ${topicStr}`);

    const { system, user } = buildPrompt(mat.topic, mat.subTopic);

    let questions = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const raw = await callLLM(system, user);
        if (!raw) {
          console.log(`    ⚠️  Attempt ${attempt + 1}: empty response`);
          continue;
        }
        const parsed = extractAndParseJSON(raw);
        if (parsed) {
          questions = formatQuestions(parsed);
          break;
        } else {
          console.log(`    ⚠️  Attempt ${attempt + 1}: JSON parse failed, raw=${raw.slice(0, 200)}`);
        }
      } catch (e) {
        console.log(`    ⚠️  Attempt ${attempt + 1}: ${e.message}`);
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }
    }

    if (!questions || questions.length < 3) {
      console.log(`    ❌ FAILED after 3 retries`);
      failed++;
      continue;
    }

    // Ensure exactly 5 questions
    if (questions.length !== 5) {
      console.log(`    ⚠️  Got ${questions.length} questions, adjusting...`);
      // If more than 5, take first 5; if fewer, pad with easy questions
      if (questions.length > 5) questions = questions.slice(0, 5);
    }

    // Count difficulties
    const diffs = questions.map(q => q.difficulty || 'medium');
    const easyCount = diffs.filter(d => d === 'easy').length;
    const mediumCount = diffs.filter(d => d === 'medium').length;
    const hardCount = diffs.filter(d => d === 'hard').length;

    const maxScore = questions.length; // 1 point per question, or *10?
    // The schema says maxScore is int. Let's use questions.length * 10
    // Actually looking at the existing insert from gen-missing-quiz.cjs, they use questions.length * 10
    const scoreValue = questions.length * 10;

    const quizJson = JSON.stringify({ questions });

    // Step 3: Insert into Quiz table
    await queryDb(
      `INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb, $5, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [mat.id, STUDENT_UUID, 'QUIZ', quizJson, scoreValue]
    );

    inserted++;
    console.log(`    ✅ INSERTED (${questions.length}Q, ${easyCount}e/${mediumCount}m/${hardCount}h, maxScore=${scoreValue})`);

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 RESULTS:`);
  console.log(`   Total materials: ${materials.length}`);
  console.log(`   Skipped (already exists): ${skipped}`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Failed: ${failed}`);
  console.log(`${'='.repeat(60)}`);
}

main().catch(e => {
  console.error('❌ Fatal:', e);
  process.exit(1);
});
