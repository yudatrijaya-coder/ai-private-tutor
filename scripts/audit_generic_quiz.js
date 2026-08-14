/**
 * Audit generic quiz questions across all subjects for SMP_1 (Raihan)
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

const GENERIC_PATTERNS = [
  /penting/i, /berguna/i, /ujian/i, /untuk apa/i, /mengapa harus/i,
  /hanya teori/i, /tidak penting/i
];

async function main() {
  // Get all quizzes for SMP_1
  const res = await pool.query(`
    SELECT q.id as quiz_id, q.questions, m.topic, m."subTopic", m.subject, st.name as student_name
    FROM "Quiz" q
    JOIN "Material" m ON q."materialId" = m.id
    JOIN "Student" st ON q."studentId" = st.id
    WHERE st."gradeLevel" = 'SMP_1'
    ORDER BY m.subject, m.topic, m."subTopic"
  `);

  const bySubject = {};
  const genericBySubject = {};
  let grandTotal = 0;
  let grandGeneric = 0;

  for (const row of res.rows) {
    if (!bySubject[row.subject]) {
      bySubject[row.subject] = { total: 0, generic: 0, samples: [] };
      genericBySubject[row.subject] = [];
    }

    let qs;
    try { qs = (typeof row.questions === "string") ? JSON.parse(row.questions) : (row.questions || []); }
    catch { continue; }
    if (!Array.isArray(qs) || qs.length === 0) continue;

    for (const q of qs) {
      if (!q || !q.question) continue;
      bySubject[row.subject].total++;
      grandTotal++;
      const qText = (q.question || "").toLowerCase();
      const opts = (q.options || []).map(o => (o || "").toLowerCase());

      const isGeneric = GENERIC_PATTERNS.some(p => p.test(qText)) ||
        opts.some(o => /tidak penting|hanya teori|berguna dalam/i.test(o));

      if (isGeneric) {
        bySubject[row.subject].generic++;
        grandGeneric++;
        genericBySubject[row.subject].push({
          topic: row.topic,
          sub_topic: row.subTopic || "(none)",
          question: q.question,
          options: q.options
        });
      }
    }
  }

  console.log("\n=== GENERIC QUIZ AUDIT — SMP_1 (Raihan) ===\n");
  for (const subj of Object.keys(bySubject).sort()) {
    const s = bySubject[subj];
    const pct = s.total > 0 ? Math.round(s.generic / s.total * 100) : 0;
    const flag = pct > 10 ? "⚠️" : "  ";
    console.log(flag + " " + subj.padEnd(20) + " | " + String(s.generic).padStart(4) + " / " + String(s.total).padStart(4) + " generic (" + pct + "%)");
    if (s.generic > 0) {
      const samples = genericBySubject[subj].slice(0, 2);
      for (const sq of samples) {
        console.log("     └─ [" + sq.sub_topic + "] " + sq.question.slice(0, 80));
      }
    }
  }
  console.log("\n───────────────────────────────────────");
  console.log("  TOTAL                              | " + String(grandGeneric).padStart(4) + " / " + String(grandTotal).padStart(4) + " generic (" + Math.round(grandGeneric/grandTotal*100) + "%)");

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
