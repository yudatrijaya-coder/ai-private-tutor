/**
 * Regenerate all generic quizzes for SMP_1 (Raihan)
 * - Delete old quiz records
 * - Generate new quizzes via LLM (strict: no fallback)
 * - Report results
 */
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const http = require("http");

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

function isGeneric(q) {
  if (!q || !q.question) return false;
  const qText = (q.question || "").toLowerCase();
  const opts = (q.options || []).map(o => {
    if (typeof o === "string") return o.toLowerCase();
    return JSON.stringify(o).toLowerCase();
  });
  return GENERIC_PATTERNS.some(p => p.test(qText)) ||
    opts.some(o => GENERIC_PATTERNS.some(p => p.test(o)));
}

/** Extract JSON array: robust — strip fences, then find last ']' that closes the array */
function extractQuestions(text) {
  // Strip fences first (removes BOTH opening and closing ``` fences)
  const stripped = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  // Find first '[' — this is the array start
  const firstBracket = stripped.indexOf("[");
  if (firstBracket === -1) return null;

  // Find all ']' positions that are NOT inside strings
  const closePositions = [];
  let inString = false;
  for (let i = firstBracket; i < stripped.length; i++) {
    if (inString) {
      if (stripped[i] === '"' && stripped[i - 1] !== "\\") inString = false;
    } else {
      if (stripped[i] === '"') { inString = true; }
      else if (stripped[i] === "]") closePositions.push(i);
    }
  }

  // Try each close position from the end — first that parses is the correct outer array end
  for (let j = closePositions.length - 1; j >= 0; j--) {
    const candidate = stripped.slice(firstBracket, closePositions[j] + 1).trim();
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* continue */ }
  }

  return null;
}

/** Normalize raw LLM question to standard format */
function normalizeQuestion(q) {
  let options = [];
  if (Array.isArray(q.options)) {
    options = q.options.map(o => typeof o === "string" ? o : JSON.stringify(o));
  } else if (q.options && typeof q.options === "object") {
    options = Object.values(q.options);
  }
  let correctIndex = 0;
  if (typeof q.correctIndex === "number") {
    correctIndex = q.correctIndex;
  } else if (typeof q.answer === "string") {
    const ans = q.answer.toUpperCase().trim();
    const abcIdx = "ABCD".indexOf(ans);
    if (abcIdx >= 0) correctIndex = abcIdx;
    else {
      const found = options.findIndex(o => o.toLowerCase().trim() === ans.toLowerCase().trim());
      if (found >= 0) correctIndex = found;
    }
  }
  if (options.length > 4) options = options.slice(0, 4);
  while (options.length < 4) options.push("Tidak ada jawaban yang benar");
  return {
    question: String(q.question || "").trim(),
    options,
    correctIndex: Math.min(correctIndex, options.length - 1),
    explanation: String(q.explanation || q.reasoning || "").trim()
  };
}

/** Call LLM via 9Router HTTP */
async function callLLM(materialId, topic, subTopic, subject, processedContent) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "hermes",
      messages: [
        {
          role: "system",
          content: `Kamu adalah pembuat soal quiz pilihan ganda.
- Buat TEPAT 5 soal untuk materi ini.
- 4 pilihan jawaban (A, B, C, D) -- pilih yang paling tepat.
- Bahasa Indonesia untuk soal dan penjelasan.
- Setiap soal menguji SATU konsep spesifik dari materinya.
- DILARANG keras: soal template generic seperti "Mengapa penting dipelajari?", "Apa manfaat dalam kehidupan sehari-hari?", "Apakah berguna?"
- Gunakan fakta dan istilah yang ada di dalam materi.

IMPORTANT: Return HANYA plain JSON array, TANPA markdown formatting. Tidak boleh ada:
- backtick (\`) di anywhere
- kata "json" atau "javascript"  
- teks sebelum atau sesudah array JSON

Format WAJIB:
[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]`
        },
        {
          role: "user",
          content: `Materi: ${subject} -- ${topic}${subTopic ? " / " + subTopic : ""}\n\n${(processedContent || "").slice(0, 3000)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2500
    });

    const req = http.request(
      {
        hostname: "localhost",
        port: 20128,
        path: "/v1/chat/completions",
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        timeout: 120000
      },
      (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.message?.content || "";
            const raw = extractQuestions(text);
            if (!raw || !Array.isArray(raw) || raw.length === 0) {
              reject(new Error("No parseable JSON array. Got: " + text.slice(0, 150)));
              return;
            }
            const questions = raw.map(normalizeQuestion);
            resolve(questions);
          } catch (e) {
            reject(new Error("Parse error: " + e.message));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("LLM timeout")); });
    req.write(body);
    req.end();
  });
}

async function saveQuiz(pool, materialId, studentId, questions) {
  const validQs = questions.map(q => ({
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation
  }));
  await pool.query(`
    INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "timeLimit", "createdAt", "updatedAt")
    VALUES (uuid_generate_v4(), $1, $2, 'QUIZ', $3, $4, 10, NOW(), NOW())
  `, [materialId, studentId, JSON.stringify(validQs), validQs.length]);
}

async function main() {
  const statePath = path.join(__dirname, "regen_generic_state.json");
  const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
  const { genericQuizIds, materialIds } = state;

  // Get student ID for SMP_1
  const studentRes = await pool.query(`SELECT id FROM "Student" WHERE "gradeLevel" = 'SMP_1' LIMIT 1`);
  const studentId = studentRes.rows[0]?.id;
  if (!studentId) throw new Error("SMP_1 student not found");
  console.log("Student ID:", studentId, "| Materials:", materialIds.length);

  // Fetch processedContent
  const contentRes = await pool.query(
    `SELECT id, topic, "subTopic", subject, "processedContent" FROM "Material" WHERE id = ANY($1)`,
    [materialIds]
  );
  const contentMap = {};
  for (const row of contentRes.rows) contentMap[row.id] = row;

  // Regenerate via LLM
  let success = 0, failed = 0, skipped = 0;
  const errors = [];
  const startTime = Date.now();

  console.log("\nRegenerating " + materialIds.length + " materials via LLM...\n");

  for (let i = 0; i < materialIds.length; i++) {
    const mid = materialIds[i];
    const mat = contentMap[mid];
    if (!mat || !mat.processedContent || mat.processedContent.trim().length < 50) {
      skipped++;
      console.log("  [" + (i+1) + "/" + materialIds.length + "] SKIP empty: " + (mat?.topic || mid));
      continue;
    }

    process.stdout.write("  [" + (i+1) + "/" + materialIds.length + "] " + mat.subject + " -- " + mat.topic + " / " + mat.subTopic + " ... ");

    try {
      const questions = await callLLM(mid, mat.topic, mat.subTopic, mat.subject, mat.processedContent);
      await saveQuiz(pool, mid, studentId, questions);
      success++;
      const hasGen = questions.some(q => isGeneric(q));
      console.log("OK (" + questions.length + " q" + (hasGen ? " [WARN:generic]" : "") + ")");
      if (hasGen) errors.push({ topic: mat.topic, issue: "still generic" });
    } catch (e) {
      failed++;
      console.log("FAIL: " + e.message.slice(0, 100));
      errors.push({ topic: mat.topic, issue: e.message.slice(0, 150) });
    }

    if (i < materialIds.length - 1) await new Promise(r => setTimeout(r, 1500));
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log("\n=== DONE ===");
  console.log("Time: " + Math.floor(elapsed/60) + "m " + (elapsed%60) + "s | Success: " + success + " | Failed: " + failed + " | Skipped: " + skipped);

  // Verify
  console.log("\n=== VERIFICATION ===");
  const verifyRes = await pool.query(`
    SELECT q.questions, m.topic, m."subTopic"
    FROM "Quiz" q
    JOIN "Material" m ON q."materialId" = m.id
    JOIN "Student" st ON q."studentId" = st.id
    WHERE st."gradeLevel" = 'SMP_1'
  `);

  let remainingGeneric = 0;
  const samples = [];
  for (const row of verifyRes.rows) {
    let qs;
    try { qs = (typeof row.questions === "string") ? JSON.parse(row.questions) : (row.questions || []); } catch { continue; }
    if (!Array.isArray(qs)) continue;
    for (const q of qs) {
      if (isGeneric(q)) {
        remainingGeneric++;
        if (samples.length < 5) samples.push({ topic: row.topic, subTopic: row.subTopic, question: q.question });
      }
    }
  }
  console.log("Remaining generic questions: " + remainingGeneric);
  if (samples.length > 0) {
    console.log("Samples still generic:");
    for (const s of samples) console.log("  [" + s.subTopic + "] " + s.question.slice(0, 100));
  } else {
    console.log("All clean!");
  }

  await pool.end();
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
