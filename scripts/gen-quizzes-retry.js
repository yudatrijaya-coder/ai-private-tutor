/**
 * Retry failed quizzes (6 materials).
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

const API_URL = "http://localhost:20128/v1/chat/completions";
const MODEL = "hermes";

async function callLLM(system, user) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.SUMOPOD_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          temperature: 0.5,
          max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!r.ok) { console.warn(`  HTTP ${r.status}`); await new Promise(r => setTimeout(r, 5000)); continue; }
      let rawText = await r.text();
      rawText = rawText.replace(/\s*data:\s*\[DONE\]\s*$/, "").trim();
      const d = JSON.parse(rawText);
      const choices = d.data?.choices || d.choices;
      return choices?.[0]?.message?.content ?? null;
    } catch (e) { console.warn(`  Error: ${e.message?.slice(0, 80)}`); await new Promise(r => setTimeout(r, 5000)); }
  }
  return null;
}

async function main() {
  const { rows } = await pool.query(`
    SELECT m.id, m.subject, m.topic, m."subTopic", s.name as student, s.id as student_uuid
    FROM "Material" m
    JOIN "Curriculum" cur ON cur.id = m."curriculumId"
    JOIN "Student" s ON s.id = cur."studentId"
    WHERE NOT EXISTS (SELECT 1 FROM "Quiz" q WHERE q."materialId" = m.id)
    ORDER BY s.name, m.subject, m.topic
  `);

  if (!rows.length) { console.log("✅ Nothing to retry!"); return; }
  console.log(`Retrying ${rows.length} materials\n`);

  let total = 0, failed = 0;
  for (const mat of rows) {
    const grade = mat.student === "Syifa" ? "SD Kelas 5" : "SMA Kelas 11";
    const topicStr = `${mat.subject} — ${mat.topic}${mat.subTopic ? " — " + mat.subTopic : ""}`;
    process.stdout.write(`[${mat.student}] ${topicStr}... `);

    const result = await callLLM(
      `Kamu adalah pembuat soal pilihan ganda untuk ${grade}. Buat 5 soal untuk 1 topik. Output JSON array ONLY (start with [ and end with ]), no markdown, no code fences. Example: [{"question":"text","options":["A. x","B. y","C. z","D. w"],"correctIndex":0,"difficulty":"easy","explanation":"..."}]`,
      `Buat 5 soal pilihan ganda untuk: ${topicStr}`
    );

    if (!result) { console.log("LLM failed"); failed++; continue; }

    // Try to extract JSON array
    const start = result.indexOf("[");
    const end = result.lastIndexOf("]");
    if (start === -1 || end === -1) { console.log("No JSON array"); failed++; continue; }
    const jsonStr = result.slice(start, end + 1);

    let questions = null;
    try {
      questions = JSON.parse(jsonStr);
      if (!Array.isArray(questions) || questions.length < 3) throw new Error("bad array");
    } catch (_) {
      // strict sanitize
      const clean = jsonStr.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'").replace(/[\uFEFF\u200B]/g, "");
      try { questions = JSON.parse(clean); if (!Array.isArray(questions) || questions.length < 3) questions = null; } catch(__) {}
    }
    if (!questions) { console.log("Parse failed"); failed++; continue; }

    questions = questions.map(q => ({ ...q, difficulty: q.difficulty || "medium", explanation: q.explanation || "" }));

    try {
      await pool.query(
        `INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, 'QUIZ', $3::jsonb, $4, NOW(), NOW())`,
        [mat.id, mat.student_uuid, JSON.stringify(questions), questions.length]
      );
      total++;
      console.log(`OK ${questions.length}q`);
    } catch (e) { console.log(`DB err`); failed++; }

    await new Promise(r => setTimeout(r, 500));
  }

  await pool.end();
  console.log(`\nRetry: ${total} created, ${failed} failed`);
}

main().catch(e => { console.error(e); process.exit(1); });
