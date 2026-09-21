#!/usr/bin/env node
/**
 * Fill missing videoUrl + metadata.mindmap across the ACTIVE curricula
 * (highest version per student) only — legacy v1 rows are excluded.
 *
 * Serial, idempotent, additive. Source for the mindmap is
 * metadata.slide ? rawContent ? processedContent (first non-empty).
 *
 * Usage:
 *   node scripts/fill-gaps-video-mindmap.cjs            # all active curricula
 *   node scripts/fill-gaps-video-mindmap.cjs <studentId>  # one student (UUID or code)
 */
require("dotenv/config");
const { Pool } = require("pg");

const MODEL = "sumopod/gpt-4.1-mini";
const ROUTER = "http://127.0.0.1:20128/v1/chat/completions";
const KEY = process.env.LLM_API_KEY;

const pool = new Pool({
  host: "localhost", port: 5432, database: "ai_private_tutor",
  user: "tutor", password: process.env.PGPASSWORD,
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function videoSearchUrl(subject, topic, subTopic) {
  const q = `${subject} untuk ${subTopic || topic}`.replace(/\s+/g, " ").trim();
  return "https://www.youtube.com/results?search_query=" +
    encodeURIComponent(`Rekomendasi video YouTube: “${q}”`);
}

async function callLLM(messages, maxTokens = 2500) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 70000);
      const res = await fetch(ROUTER, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ model: MODEL, messages, temperature: 0.2, max_tokens: maxTokens }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const raw = (await res.text()).replace(/\s*data:\s*\[DONE\]\s*$/, "").trim();
      const body = JSON.parse(raw);
      const ch = body?.choices?.[0];
      const content = ch?.message?.content;
      if (content && content.trim()) {
        if (ch.finish_reason === "length") console.log("  ⚠️ finish_reason=length (truncated)");
        return content.trim();
      }
      console.log(`  ⚠️ empty content (attempt ${attempt})`);
    } catch (e) {
      console.log(`  ⚠️ attempt ${attempt}: ${e.message}`);
    }
    await sleep(2500);
  }
  return null;
}

function extractJSON(text) {
  const cleaned = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
  const start = cleaned.search(/[[{]/);
  if (start < 0) return null;
  const open = cleaned[start], close = open === "{" ? "}" : "]";
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) {
      try { return JSON.parse(cleaned.slice(start, i + 1)); } catch { return null; }
    } }
  }
  return null;
}

function normalizeMindmap(obj) {
  const root = Array.isArray(obj) ? obj[0] : obj;
  if (!root || typeof root !== "object" || !root.label) return null;
  const walk = (node, prefix) => {
    const out = { id: prefix || "root", label: String(node.label).slice(0, 120), children: [] };
    const kids = Array.isArray(node.children) ? node.children : [];
    out.children = kids.map((c, i) => walk(c, `${prefix || "n"}${i + 1}`));
    return out;
  };
  const tree = walk(root, "root");
  if (!tree.children || tree.children.length < 2) return null;
  return tree;
}

(async () => {
  const arg = process.argv[2] || null;
  // Active curriculum = highest version per student. Exclude templates if a filter is given.
  const params = [];
  let studentFilter = "";
  if (arg) {
    studentFilter = `AND (s.id = $1 OR s."studentId" = $1)`;
    params.push(arg);
  }
  const rows = (await pool.query(`
    WITH active AS (
      SELECT DISTINCT ON (c."studentId") c.id
      FROM "Curriculum" c
      ORDER BY c."studentId", c.version DESC, c."createdAt" DESC
    )
    SELECT m.id, s.name AS student, m.subject, m.topic, m."subTopic",
           COALESCE(NULLIF(m.metadata->>'slide',''), m."rawContent", m."processedContent", '') AS src,
           (COALESCE(m."videoUrl",'') = '') AS need_video,
           (m.metadata->'mindmap' IS NULL) AS need_mindmap
    FROM "Material" m
    JOIN active a ON a.id = m."curriculumId"
    JOIN "Curriculum" c ON c.id = m."curriculumId"
    JOIN "Student" s ON s.id = c."studentId"
    WHERE (m.metadata->'mindmap' IS NULL OR COALESCE(m."videoUrl",'') = '')
      ${studentFilter}
    ORDER BY s.name, m.subject, m.topic`, params)).rows;

  console.log(`Found ${rows.length} gap rows in active curricula.\n`);
  let vDone = 0, mDone = 0, mFail = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    console.log(`[${i + 1}/${rows.length}] ${r.student} | ${r.subject} → ${r.topic}${r.subTopic ? " → " + r.subTopic : ""}`);
    const sets = [], vals = [];
    let p = 1;

    if (r.need_video) {
      sets.push(`"videoUrl"=$${p++}`); vals.push(videoSearchUrl(r.subject, r.topic, r.subTopic));
      vDone++; console.log("  🎬 videoUrl set");
    }

    if (r.need_mindmap) {
      const ctx = r.src && r.src.length > 50 ? r.src.slice(0, 2000) : `${r.topic} - ${r.subTopic || ""}`;
      const prompt =
`Buat mindmap hierarkis untuk materi pelajaran berikut.
Mata pelajaran: ${r.subject}
Topik: ${r.topic}${r.subTopic ? `\nSubtopik: ${r.subTopic}` : ""}

Konteks materi:
${ctx}

Balas HANYA objek JSON (tanpa penjelasan, tanpa markdown) dengan bentuk:
{"id":"root","label":"<judul topik>","children":[{"id":"a","label":"<cabang 1>","children":[{"id":"a1","label":"<sub-cabang>","children":[]}]}]}

Aturan: root label = judul topik singkat; 3-5 cabang utama; tiap cabang 1-3 sub-cabang ringkas (max ~8 kata). WAJIB sertakan field "children":[] di setiap node (termasuk daun). Jangan lebih dari 4 cabang utama dan 3 anak per cabang.`;
      const txt = await callLLM([
        { role: "system", content: "Kamu menghasilkan mindmap terstruktur. Balas HANYA JSON valid." },
        { role: "user", content: prompt },
      ]);
      if (txt) {
        const parsed = extractJSON(txt);
        const tree = parsed ? normalizeMindmap(parsed) : null;
        if (tree) {
          sets.push(`metadata=jsonb_set(COALESCE(metadata,'{}'::jsonb),'{mindmap}',$${p++}::jsonb,true)`);
          vals.push(JSON.stringify(tree)); mDone++;
          console.log(`  🗺️ mindmap set (${tree.children.length} cabang)`);
        } else { mFail++; console.log("  ❌ mindmap: JSON tak bisa dipakai"); }
      } else { mFail++; console.log("  ❌ mindmap: LLM gagal"); }
    }

    if (sets.length) {
      sets.push(`"updatedAt"=NOW()`);
      vals.push(r.id);
      await pool.query(`UPDATE "Material" SET ${sets.join(", ")} WHERE id=$${p}`, vals);
    } else console.log("  ⏭️  sudah lengkap");
    await sleep(700);
  }

  console.log(`\n✅ Selesai. videoUrl: ${vDone}, mindmap: ${mDone} ok / ${mFail} gagal.`);
  await pool.end();
})();
