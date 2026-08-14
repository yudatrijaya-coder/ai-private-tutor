/**
 * Audit generic quiz questions across all grade levels (SD_5, SMP_1, SMA_2)
 * Pattern: generic "penting dipelajari" / "berguna" / "ujian" template questions
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
  /penting dipelajari/i, /penting untuk/i, /berguna dalam/i, /berguna bagi/i,
  /berguna untuk/i, /untuk ujian/i, /hanya teori/i, /hanya untuk ujian/i,
  /tidak penting/i, /tidak berguna/i
];

async function main() {
  const grades = ["SD_5", "SMA_2"];

  for (const grade of grades) {
    const res = await pool.query(`
      SELECT q.id as quiz_id, q.questions, m.topic, m."subTopic", m.subject, st.name as student_name
      FROM "Quiz" q
      JOIN "Material" m ON q."materialId" = m.id
      JOIN "Student" st ON q."studentId" = st.id
      WHERE st."gradeLevel" = $1
      ORDER BY m.subject, m.topic
    `, [grade]);

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
      if (!Array.isArray(qs)) continue;

      for (const q of qs) {
        if (!q || !q.question) continue;
        bySubject[row.subject].total++;
        grandTotal++;
        const qText = (q.question || "").toLowerCase();
        const opts = (q.options || []).map(o => {
          if (typeof o === "string") return o.toLowerCase();
          if (typeof o === "object") return JSON.stringify(o).toLowerCase();
          return String(o).toLowerCase();
        });

        const isGeneric = GENERIC_PATTERNS.some(p => p.test(qText)) ||
          opts.some(o => GENERIC_PATTERNS.some(p => p.test(o)));

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

    console.log(`\n=== GENERIC QUIZ AUDIT — ${grade} ===\n`);
    for (const subj of Object.keys(bySubject).sort()) {
      const s = bySubject[subj];
      const pct = s.total > 0 ? Math.round(s.generic / s.total * 100) : 0;
      const flag = pct > 10 ? "⚠️" : "  ";
      console.log(flag + " " + subj.padEnd(22) + " | " + String(s.generic).padStart(4) + " / " + String(s.total).padStart(4) + " generic (" + pct + "%)");
      if (s.generic > 0 && genericBySubject[subj].length > 0) {
        const samples = genericBySubject[subj].slice(0, 2);
        for (const sq of samples) {
          console.log("     └─ [" + sq.sub_topic + "] " + sq.question.slice(0, 80));
        }
      }
    }
    const totalPct = grandTotal > 0 ? Math.round(grandGeneric / grandTotal * 100) : 0;
    console.log("\n──────────────────────────────────────────");
    console.log("  TOTAL                                | " + String(grandGeneric).padStart(4) + " / " + String(grandTotal).padStart(4) + " generic (" + totalPct + "%)");
    console.log("  GRADE_LEVEL=" + grade);
    console.log("  TIMESTAMP=" + new Date().toISOString());
  }

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
