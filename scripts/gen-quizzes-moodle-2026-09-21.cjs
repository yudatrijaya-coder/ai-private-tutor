/**
 * Generate quizzes for the 21 materials added 2026-09-21 (metadata.addedBy).
 * Serial, one LLM call per material, via 9Router (LLM_API_KEY).
 * Idempotent: only targets materials with NO existing quiz.
 */
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const raw = fs.readFileSync(path.resolve("/home/ubuntu/ai-private-tutor", ".env"), "utf-8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] = v;
  }
}
loadEnv();

const pool = new Pool({
  host: "localhost", port: 5432, database: "ai_private_tutor",
  user: "tutor", password: process.env.PGPASSWORD,
});

const API_URL = "http://localhost:20128/v1/chat/completions";
// deepseek-v4.1-flash (behind the "hermes" combo) ignores "JSON only"
// instructions and writes prose. gpt-4.1-mini obeys the format reliably.
const MODEL = "sumopod/gpt-4.1-mini";
const KEY = process.env.LLM_API_KEY;

const GRADE_MAP = { Raihan: "SMP Kelas 7", SHOFI: "SMA Kelas 11" };

function sanitizeJSON(raw) {
  return raw.replace(/```json\s*/gi, "").replace(/```\s*$/gm, "").trim()
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/\uFF1A/g, ":").replace(/\uFF0C/g, ",")
    .replace(/[\uFEFF\u200B\u200C\u200D]/g, "");
}

async function callLLM(system, user) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: 0.7, max_tokens: 4096 }),
        signal: AbortSignal.timeout(150000),
      });
      if (!r.ok) { console.warn(`  HTTP ${r.status}`); await new Promise(r => setTimeout(r, 5000)); continue; }
      let rawText = await r.text();
      rawText = rawText.replace(/\s*data:\s*\[DONE\]\s*$/, "").trim();
      const d = JSON.parse(rawText);
      return (d.data?.choices || d.choices)?.[0]?.message?.content ?? null;
    } catch (e) { console.warn(`  Err: ${e.message?.slice(0, 70)}`); await new Promise(r => setTimeout(r, 5000)); }
  }
  return null;
}

async function main() {
  const { rows: mats } = await pool.query(`
    SELECT m.id, m.subject, m.topic, m."subTopic",
           COALESCE(m.metadata->>'slide', m."rawContent") AS content,
           s.name AS student, s.id AS student_uuid
    FROM "Material" m
    JOIN "Curriculum" cur ON cur.id = m."curriculumId"
    JOIN "Student" s ON s.id = cur."studentId"
    WHERE m.metadata->>'addedBy' = 'moodle-2026-09-21'
      AND NOT EXISTS (SELECT 1 FROM "Quiz" q WHERE q."materialId" = m.id)
    ORDER BY s.name, m.subject
  `);
  console.log(`${mats.length} materials to quiz\n`);

  let ok = 0, fail = 0;
  for (const m of mats) {
    const grade = GRADE_MAP[m.student] ?? "SMP Kelas 7";
    process.stdout.write(`[${m.student}] ${m.subject} — ${m.subTopic} ... `);
    const sys = `Kamu pembuat soal pilihan ganda untuk ${grade}. Buat 5 soal (2 mudah, 2 sedang, 1 sulit) berdasarkan materi berikut. Balas HANYA dengan JSON array, tanpa markdown atau teks lain: [{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctIndex":0,"difficulty":"medium","explanation":"..."}]. Bahasa Indonesia. Soal harus sesuai materi.`;
    const user = `Materi: ${m.topic} — ${m.subTopic}\n\n${String(m.content || "").slice(0, 2500)}`;
    const result = await callLLM(sys, user);
    if (!result) { console.log("LLM failed"); fail++; continue; }
    // Tolerant extraction: strip markdown fences, then take the FIRST
    // complete top-level JSON array (handles prose preamble/epilogue).
    let questions = null;
    const candidates = [];
    const fenced = result.replace(/```json\s*/gi, "").replace(/```/g, "");
    candidates.push(fenced, result);
    // Extract the first balanced [...] block
    const start = fenced.indexOf("[");
    if (start !== -1) {
      let depth = 0, inStr = false, esc = false, end = -1;
      for (let i = start; i < fenced.length; i++) {
        const ch = fenced[i];
        if (esc) { esc = false; continue; }
        if (ch === "\\") { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === "[") depth++;
        else if (ch === "]") { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end !== -1) candidates.push(fenced.slice(start, end + 1));
    }
    for (const raw of candidates) {
      for (const attempt of [raw, sanitizeJSON(raw)]) {
        try { const p = JSON.parse(attempt); if (Array.isArray(p) && p.length >= 3) { questions = p; break; } } catch (_) {}
      }
      if (questions) break;
    }
    if (!questions) { console.log("no JSON"); fail++; continue; }
    questions = questions.map(q => ({ ...q, difficulty: q.difficulty || "medium", explanation: q.explanation || "" }));
    try {
      await pool.query(
        `INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, 'QUIZ', $3::jsonb, $4, NOW(), NOW())`,
        [m.id, m.student_uuid, JSON.stringify(questions), questions.length]);
      ok++; console.log(`OK ${questions.length}q`);
    } catch (e) { console.log(`DB err: ${e.message}`); fail++; }
    await new Promise(r => setTimeout(r, 600));
  }
  await pool.end();
  console.log(`\nDone: ${ok} quizzes created, ${fail} failed`);
}
main().catch(e => { console.error(e); process.exit(1); });
