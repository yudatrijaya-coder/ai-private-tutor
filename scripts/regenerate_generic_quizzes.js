/**
 * Regenerate generic quizzes for SMP_1 (Raihan)
 * - Find all quiz IDs with generic questions
 * - Delete old generic quizzes from DB
 * - Regenerate via LLM (or new content-aware fallback)
 * - Report results
 */
const { Pool } = require("pg");
const { execSync } = require("child_process");
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

async function main() {
  console.log("=== REGENERATE GENERIC QUIZZES — SMP_1 ===\n");

  // Step 1: Find all quiz IDs with generic questions
  const res = await pool.query(`
    SELECT q.id, q.\"materialId\", m.topic, m.\"subTopic\", m.subject, m.\"processedContent\"
    FROM "Quiz" q
    JOIN "Material" m ON q."materialId" = m.id
    JOIN "Student" st ON q."studentId\" = st.id
    WHERE st."gradeLevel" = 'SMP_1'
  `);

  const genericQuizIds = [];
  const quizMap = {}; // materialId -> [{id, topic, subTopic, subject, questions}]

  for (const row of res.rows) {
    let qs;
    try { qs = (typeof row.questions === "string") ? JSON.parse(row.questions) : (row.questions || []); }
    catch { continue; }
    if (!Array.isArray(qs)) continue;

    let hasGeneric = false;
    for (const q of qs) {
      if (!q || !q.question) continue;
      const qText = (q.question || "").toLowerCase();
      const opts = (q.options || []).map(o => {
        if (typeof o === "string") return o.toLowerCase();
        if (typeof o === "object") return JSON.stringify(o).toLowerCase();
        return String(o).toLowerCase();
      });
      if (GENERIC_PATTERNS.some(p => p.test(qText)) ||
          opts.some(o => GENERIC_PATTERNS.some(p => p.test(o)))) {
        hasGeneric = true;
        break;
      }
    }

    if (hasGeneric) {
      genericQuizIds.push(row.id);
      if (!quizMap[row.materialId]) {
        quizMap[row.materialId] = { topic: row.topic, subTopic: row.subTopic, subject: row.subject };
      }
    }
  }

  console.log(`Found ${genericQuizIds.length} generic quiz records across ${Object.keys(quizMap).length} materials`);
  console.log("\nMaterials needing regeneration:");
  for (const [mid, info] of Object.entries(quizMap)) {
    console.log(`  - [${info.subject}] ${info.topic} / ${info.subTopic} (${mid.slice(0,8)}...)`);
  }

  if (genericQuizIds.length === 0) {
    console.log("\nNo generic quizzes found. Nothing to regenerate.");
    await pool.end();
    return;
  }

  // Step 2: Delete old generic quizzes
  console.log(`\nDeleting ${genericQuizIds.length} generic quiz records...`);
  const deleteChunk = 50;
  for (let i = 0; i < genericQuizIds.length; i += deleteChunk) {
    const chunk = genericQuizIds.slice(i, i + deleteChunk);
    await pool.query(`DELETE FROM "Quiz" WHERE id = ANY($1)`, [chunk]);
  }
  console.log("Deleted.");

  // Step 3: Regenerate via script
  const materialIds = Object.keys(quizMap);
  console.log(`\nRegenerating ${materialIds.length} quizzes...`);

  const scriptContent = `
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("./src/generated/prisma");

function loadEnv() {
  const raw = fs.readFileSync(path.resolve(__dirname, "..", ".env"), "utf-8");
  for (const line of raw.split("\\n")) {
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

async function regenerate(materialIds) {
  const { generateQuiz } = await import("./src/agents/assessment/generator.ts");
  const prisma = new PrismaClient();
  let success = 0, failed = 0;
  for (const mid of materialIds) {
    try {
      await generateQuiz(mid);
      success++;
      console.log("OK: " + mid);
    } catch (e) {
      failed++;
      console.error("FAIL: " + mid + " - " + e.message);
    }
  }
  console.log("\\nDone: " + success + " regenerated, " + failed + " failed");
  await prisma.$disconnect();
}

const ids = ${JSON.stringify(materialIds)};
regenerate(ids).catch(console.error);
`;

  const scriptPath = path.join(__dirname, "regen_generic_quizzes_temp.js");
  fs.writeFileSync(scriptPath, scriptContent);

  console.log("\nRunning regeneration (this may take a few minutes)...\n");
  try {
    execSync("node " + scriptPath, { cwd: path.resolve(__dirname, ".."), stdio: "inherit", timeout: 300000 });
  } catch (e) {
    console.error("Regeneration script error:", e.message);
  } finally {
    fs.unlinkSync(scriptPath);
  }

  // Step 4: Verify
  console.log("\n=== VERIFICATION ===");
  const verifyRes = await pool.query(`
    SELECT q.id, m.topic, m."subTopic", m.subject
    FROM "Quiz" q
    JOIN "Material" m ON q."materialId" = m.id
    JOIN "Student" st ON q."studentId" = st.id
    WHERE st."gradeLevel" = 'SMP_1'
  `);

  let stillGeneric = 0;
  const checkedMap = {};
  for (const row of verifyRes.rows) {
    let qs;
    try { qs = (typeof row.questions === "string") ? JSON.parse(row.questions) : (row.questions || []); }
    catch { continue; }
    if (!Array.isArray(qs)) continue;
    for (const q of qs) {
      if (!q || !q.question) continue;
      const qText = (q.question || "").toLowerCase();
      const opts = (q.options || []).map(o => {
        if (typeof o === "string") return o.toLowerCase();
        if (typeof o === "object") return JSON.stringify(o).toLowerCase();
        return String(o).toLowerCase();
      });
      if (GENERIC_PATTERNS.some(p => p.test(qText)) ||
          opts.some(o => GENERIC_PATTERNS.some(p => p.test(o)))) {
        stillGeneric++;
        if (!checkedMap[row.id]) {
          checkedMap[row.id] = { topic: row.topic, subTopic: row.subTopic, question: q.question };
        }
      }
    }
  }

  console.log(`Remaining generic questions: ${stillGeneric}`);
  if (stillGeneric > 0) {
    console.log("Still generic:");
    for (const [id, info] of Object.entries(checkedMap)) {
      console.log(`  [${info.subTopic}] ${info.question.slice(0, 80)}`);
    }
  } else {
    console.log("All clean!");
  }

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
