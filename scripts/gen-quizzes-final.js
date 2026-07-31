/**
 * Retry last 2 failed quizzes — verbose mode.
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
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.SUMOPOD_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          temperature: 0.3,
          max_tokens: 3000,
        }),
        signal: AbortSignal.timeout(180000),
      });
      if (!r.ok) { console.warn(`  HTTP ${r.status}`); await new Promise(r => setTimeout(r, 5000)); continue; }
      let rawText = await r.text();
      rawText = rawText.replace(/\s*data:\s*\[DONE\]\s*$/, "").trim();
      const d = JSON.parse(rawText);
      const choices = d.data?.choices || d.choices;
      const content = choices?.[0]?.message?.content ?? null;
      if (!content) {
        const finish = choices?.[0]?.finish_reason;
        console.warn(`  finish_reason=${finish}, content empty`);
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      console.warn(`  raw response preview: ${content.slice(0, 120)}`);
      return content;
    } catch (e) { console.warn(`  Error: ${e.message?.slice(0, 200)}`); await new Promise(r => setTimeout(r, 5000)); }
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

  if (!rows.length) { console.log("All done!"); return; }
  console.log(`${rows.length} remaining\n`);

  for (const mat of rows) {
    const topicStr = `${mat.subject} — ${mat.topic}${mat.subTopic ? " — " + mat.subTopic : ""}`;
    process.stdout.write(`[${mat.student}] ${topicStr}... `);

    const system = `Kamu adalah pembuat soal pilihan ganda untuk SMA Kelas 11.
BUAT 5 SOAL PILIHAN GANDA untuk 1 topik pembelajaran.
KETAT: output HARUS JSON array valid. Tidak boleh markdown, tidak boleh code fences, tidak boleh teks di luar array.
Format: [{"question":"teks soal","options":["A. pilihan","B. pilihan","C. pilihan","D. pilihan"],"correctIndex":0,"difficulty":"medium","explanation":"penjelasan"}]
- correctIndex: 0=A, 1=B, 2=C, 3=D
- 2 easy, 2 medium, 1 hard
- Bahasa Indonesia`;

    const result = await callLLM(system, `Buat 5 soal pilihan ganda: ${topicStr}`);

    if (!result) { console.log("LLM failed after 4 retries"); continue; }

    const start = result.indexOf("[");
    const end = result.lastIndexOf("]");
    if (start === -1 || end === -1) { console.log("No JSON array in response"); continue; }

    const jsonStr = result.slice(start, end + 1);
    let questions;
    try {
      questions = JSON.parse(jsonStr);
    } catch(_) {
      const clean = jsonStr.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'").replace(/[\uFEFF\u200B]/g, "");
      try { questions = JSON.parse(clean); } catch(__) { console.log("Parse failed"); continue; }
    }

    if (!Array.isArray(questions) || questions.length < 3) { console.log("Not enough questions"); continue; }

    questions = questions.map(q => ({ ...q, difficulty: q.difficulty || "medium", explanation: q.explanation || "" }));

    await pool.query(
      `INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, 'QUIZ', $3::jsonb, $4, NOW(), NOW())`,
      [mat.id, mat.student_uuid, JSON.stringify(questions), questions.length]
    );
    console.log(`OK ${questions.length}q`);
    await new Promise(r => setTimeout(r, 500));
  }

  await pool.end();
  console.log("Done!");
}

main().catch(e => { console.error(e); process.exit(1); });
