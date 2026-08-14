/**
 * Step 1: Find all materials for SMP_1 that need quiz regeneration
 * - Materials with no quiz at all, OR
 * - Materials with generic quiz questions
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
  /penting dipelajari/i, /penting untuk/i, /berguna dalam/i,
  /berguna bagi/i, /berguna untuk/i, /untuk ujian/i, /hanya teori/i,
  /hanya untuk ujian/i, /tidak penting/i, /tidak berguna/i
];

function isGenericQ(q) {
  if (!q || !q.question) return false;
  const qText = (q.question || "").toLowerCase();
  const opts = (q.options || []).map(o => {
    if (typeof o === "string") return o.toLowerCase();
    return JSON.stringify(o).toLowerCase();
  });
  return GENERIC_PATTERNS.some(p => p.test(qText)) ||
    opts.some(o => GENERIC_PATTERNS.some(p => p.test(o)));
}

async function main() {
  console.log("=== STEP 1: FIND MATERIALS NEEDING REGENERATION -- SMP_1 ===\n");

  // Get SMP_1 student UUID and curriculum
  const studentRes = await pool.query(`
    SELECT s.id as student_id, c.id as curriculum_id
    FROM "Student" s
    JOIN "Curriculum" c ON c."gradeLevel" = s."gradeLevel"
    WHERE s."gradeLevel" = 'SMP_1'
    LIMIT 1
  `);
  const { student_id: studentId, curriculum_id: curriculumId } = studentRes.rows[0];
  console.log("Student:", studentId, "| Curriculum:", curriculumId);

  // Get all materials with processedContent
  const matRes = await pool.query(`
    SELECT m.id, m.topic, m."subTopic", m.subject, m."processedContent"
    FROM "Material" m
    WHERE m."curriculumId" = $1
      AND m."processedContent" IS NOT NULL
      AND LENGTH(m."processedContent") > 50
    ORDER BY m.subject, m.topic
  `, [curriculumId]);

  // Get existing quizzes for this student
  const quizRes = await pool.query(`
    SELECT q."materialId", q.questions, m.topic, m."subTopic", m.subject
    FROM "Quiz" q
    JOIN "Material" m ON q."materialId" = m.id
    WHERE q."studentId" = $1
  `, [studentId]);

  const quizMap = {}; // materialId -> {questions, topic, subTopic, subject}
  for (const row of quizRes.rows) {
    let qs;
    try { qs = (typeof row.questions === "string") ? JSON.parse(row.questions) : (row.questions || []); }
    catch { qs = []; }
    quizMap[row.materialId] = { questions: qs, topic: row.topic, subTopic: row.subTopic, subject: row.subject };
  }

  // Classify materials
  const needRegen = []; // {id, topic, subTopic, subject, reason}
  const genericQuizIds = [];

  for (const mat of matRes.rows) {
    const existing = quizMap[mat.id];
    if (!existing) {
      needRegen.push({ id: mat.id, topic: mat.topic, subTopic: mat.subTopic, subject: mat.subject, reason: "no quiz" });
    } else {
      const qs = existing.questions;
      const hasGeneric = Array.isArray(qs) && qs.some(q => isGenericQ(q));
      if (hasGeneric) {
        needRegen.push({ id: mat.id, topic: mat.topic, subTopic: mat.subTopic, subject: mat.subject, reason: "generic quiz" });
        // Find quiz ID to delete
        for (const qr of quizRes.rows) {
          if (qr.materialId === mat.id) { genericQuizIds.push(qr); break; }
        }
      }
    }
  }

  console.log("\nMaterials needing regeneration:", needRegen.length);
  console.log("\nBy subject:");
  const bySubject = {};
  for (const m of needRegen) {
    bySubject[m.subject] = (bySubject[m.subject] || 0) + 1;
  }
  for (const [subj, cnt] of Object.entries(bySubject).sort()) {
    console.log("  " + subj + ": " + cnt);
  }

  // Save state
  const state = {
    genericQuizIds: genericQuizIds.map(q => q.id || null).filter(Boolean),
    materialIds: needRegen.map(m => m.id),
    materialMap: {}
  };
  for (const m of needRegen) {
    state.materialMap[m.id] = { topic: m.topic, subTopic: m.subTopic, subject: m.subject };
  }

  fs.writeFileSync(path.join(__dirname, "regen_generic_state.json"), JSON.stringify(state, null, 2));
  console.log("\nState saved: " + needRegen.length + " materials (" + genericQuizIds.length + " with generic quizzes to delete)");

  // Also save quiz IDs for deletion
  const deleteState = {
    genericQuizIds: genericQuizIds.map(q => q.id).filter(Boolean),
    materialIds: needRegen.map(m => m.id),
    materialMap: state.materialMap
  };
  fs.writeFileSync(path.join(__dirname, "regen_generic_delete.json"), JSON.stringify(deleteState, null, 2));

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
