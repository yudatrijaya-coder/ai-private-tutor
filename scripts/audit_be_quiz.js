/**
 * Audit Bahasa Inggris quiz quality for SMP_2 Raihan
 * Check for generic/duplicate questions across subjects
 */
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const raw = fs.readFileSync(path.resolve(__dirname, "..", ".env"), "utf-8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] = v;
  }
}
loadEnv();

const pool = new Pool({
  host: "localhost", port: 5432, user: "tutor",
  password: process.env.PGPASSWORD || "tutor123", database: "ai_private_tutor",
});

async function main() {
  // Get all Bahasa Inggris quizzes for SMP students
  const res = await pool.query(`
    SELECT q.id as quiz_id, q.questions, m.topic, m."subTopic", st."studentId", st.name as student_name
    FROM "Quiz" q
    JOIN "Material" m ON q."materialId" = m.id
    JOIN "Student" st ON q."studentId" = st.id
    WHERE st."gradeLevel" = 'SMP_1' AND m.subject = 'Bahasa Inggris'
    ORDER BY st.name, m.topic, m."subTopic"
  `);

  let totalQ = 0;
  let genericCount = 0;
  const genericQuestions = [];
  const allQBySubtopic = {};

  for (const row of res.rows) {
    let qs;
    try { qs = (typeof row.questions === 'string') ? JSON.parse(row.questions) : (row.questions || []); } catch { continue; }
    if (!Array.isArray(qs) || qs.length === 0) continue;

    const key = `${row.topic}|||${row.subTopic || ''}`;
    if (!allQBySubtopic[key]) allQBySubtopic[key] = [];

    for (const q of qs) {
      totalQ++;
      const qText = (q.question || "").toLowerCase();
      const opts = (q.options || []).map(o => (o || "").toLowerCase());

      // Detect generic patterns
      const isGeneric =
        qText.includes("penting") ||
        qText.includes("berguna") ||
        qText.includes("ujian") ||
        qText.includes("untuk apa") ||
        qText.includes("mengapa harus") ||
        opts.some(o => o.includes("tidak penting") || o.includes("hanya teori") || o.includes("berguna dalam"));

      allQBySubtopic[key].push({ question: q.question, options: q.options });

      if (isGeneric) {
        genericCount++;
        genericQuestions.push({
          topic: row.topic,
          sub_topic: row.subTopic || '(no sub_topic)',
          student: row.student_name,
          question: q.question,
          options: q.options
        });
      }
    }
  }

  console.log(`\n=== AUDIT Bahasa Inggris SMP_2 ===`);
  console.log(`Total questions: ${totalQ}`);
  console.log(`Generic questions: ${genericCount}`);
  console.log(`\n--- Generic Question Samples ---`);
  for (let i = 0; i < Math.min(genericQuestions.length, 8); i++) {
    const gq = genericQuestions[i];
    console.log(`\n[${gq.sub_topic}] (${gq.student})`);
    console.log(`  Q: ${gq.question}`);
    for (const a of gq.options) {
      console.log(`    A: ${a}`);
    }
  }

  // Also check duplicate questions across different sub_topics
  const qMap = {};
  for (const gq of genericQuestions) {
    const key = gq.question.slice(0, 50);
    if (!qMap[key]) qMap[key] = [];
    qMap[key].push(gq.sub_topic);
  }
  console.log(`\n--- Duplicate Generic Questions (same question, different sub_topic) ---`);
  for (const [q, subs] of Object.entries(qMap)) {
    if (subs.length > 1) {
      console.log(`  "${q}..." => ${subs.join(", ")}`);
    }
  }

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
