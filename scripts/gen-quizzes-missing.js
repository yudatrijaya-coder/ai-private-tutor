/**
 * Generate quizzes for 59 materials without quizzes.
 * Uses raw PostgreSQL + fetch for SumoPod API via 9Router.
 */
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// ── ENV loader (manual) ──────────────────────────────────────
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
  host: "localhost",
  port: 5432,
  user: "tutor",
  password: process.env.PGPASSWORD || "tutor123",
  database: "ai_private_tutor",
});

const API_URL = "http://localhost:20128/v1/chat/completions";
const MODEL = "hermes";

function sanitizeJSON(raw) {
  return raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*$/gm, "")
    .trim()
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/\uFF1A/g, ":")
    .replace(/\uFF0C/g, ",")
    .replace(/[\uFEFF\u200B\u200C\u200D]/g, "");
}

async function callLLM(system, user) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.SUMOPOD_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          temperature: 0.7,
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!r.ok) { console.warn(`  HTTP ${r.status}`); await new Promise(r => setTimeout(r, 5000)); continue; }
      // 9Router appends "data: [DONE]" after JSON — strip it
      let rawText = await r.text();
      // Remove trailing "data: [DONE]" line if present
      rawText = rawText.replace(/\s*data:\s*\[DONE\]\s*$/, "").trim();
      const d = JSON.parse(rawText);
      const choices = d.data?.choices || d.choices;
      return choices?.[0]?.message?.content ?? null;
    } catch (e) { console.warn(`  Error: ${e.message?.slice(0, 80)}`); await new Promise(r => setTimeout(r, 5000)); }
  }
  return null;
}

const GRADE_MAP = {
  anton: "SD Kelas 5",
  Raihan: "SMP Kelas 7",
  SHOFI: "SMA Kelas 11",
  Syifa: "SD Kelas 5",
};

async function main() {
  const key = process.env.SUMOPOD_API_KEY ?? "";
  if (!key) { console.error("SUMOPOD_API_KEY not set"); process.exit(1); }
  console.log(`Key: ${key.slice(0, 10)}...`);

  // Get materials without quizzes
  const { rows: materials } = await pool.query(`
    SELECT m.id, m.subject, m.topic, m."subTopic", s.name as student, s.id as student_uuid
    FROM "Material" m
    JOIN "Curriculum" cur ON cur.id = m."curriculumId"
    JOIN "Student" s ON s.id = cur."studentId"
    WHERE NOT EXISTS (SELECT 1 FROM "Quiz" q WHERE q."materialId" = m.id)
    ORDER BY s.name, m.subject, m.topic
  `);

  console.log(`\n${materials.length} materials without quizzes\n`);

  let total = 0, failed = 0;
  for (const mat of materials) {
    const grade = GRADE_MAP[mat.student] ?? "SMP Kelas 7";
    const topicStr = `${mat.subject} — ${mat.topic}${mat.subTopic ? " — " + mat.subTopic : ""}`;
    process.stdout.write(`[${mat.student}] ${topicStr}... `);

    const result = await callLLM(
      `Kamu adalah pembuat soal pilihan ganda untuk ${grade}. Buat 5 soal untuk 1 topik. Output JSON array ONLY: [{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctIndex":0,"difficulty":"medium","explanation":"..."}]. 2 easy, 2 medium, 1 hard. Bahasa Indonesia.`,
      `Buat 5 soal pilihan ganda untuk: ${topicStr}`
    );

    if (!result) { console.log("LLM failed"); failed++; continue; }

    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) { console.log("No JSON"); failed++; continue; }

    let questions = null;
    for (const raw of [jsonMatch[0], sanitizeJSON(jsonMatch[0])]) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length >= 3) { questions = parsed; break; }
      } catch (_) {}
    }

    if (!questions) { console.log("Parse failed"); failed++; continue; }

    questions = questions.map(q => ({
      ...q,
      difficulty: q.difficulty || "medium",
      explanation: q.explanation || "",
    }));

    try {
      await pool.query(
        `INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, 'QUIZ', $3::jsonb, $4, NOW(), NOW())`,
        [mat.id, mat.student_uuid, JSON.stringify(questions), questions.length]
      );
      total++;
      console.log(`OK ${questions.length}q`);
    } catch (e) {
      console.log(`DB err: ${e.message}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  await pool.end();
  console.log(`\nDone: ${total} created, ${failed} failed`);
}

main().catch(e => { console.error(e); process.exit(1); });
