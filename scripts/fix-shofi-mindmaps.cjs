const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost", port: 5432, database: "ai_private_tutor",
  user: "tutor", password: "tutor123",
});

async function main() {
  const studentId = "e30b6559-1d33-4aa5-a39a-22102f29894d";
  
  // Set slides in MTL metadata for mindmap
  const mats = await pool.query(
    `SELECT m.id, m."subTopic", m.topic, m.metadata, m."rawContent"
     FROM "Material" m
     JOIN "Curriculum" c ON c.id = m."curriculumId" AND c.version = (SELECT max(version) FROM "Curriculum" WHERE "studentId" = $1)
     WHERE c."studentId" = $1 AND m.subject = 'Matematika Tingkat Lanjut'
     ORDER BY m."weekOrder"`,
    [studentId]
  );

  let fixed = 0;
  for (const m of mats.rows) {
    const meta = (m.metadata && typeof m.metadata === 'object') ? m.metadata : {};
    const slides = m.rawContent || `${m.topic}: ${m.subTopic}`;
    const mindmap = [{ id: "root", label: m.topic, children: [{ label: m.subTopic }] }];
    const newMeta = { ...meta, slides, mindmap };
    await pool.query(`UPDATE "Material" SET metadata = $1 WHERE id = $2`, [JSON.stringify(newMeta), m.id]);
    fixed++;
  }
  console.log(`✅ MTL: ${fixed} materials — slides+mindmap set`);

  // Fix Kimia — 1 material missing mindmap
  const kimiaMats = await pool.query(
    `SELECT m.id, m."subTopic", m.topic, m.metadata, m."rawContent"
     FROM "Material" m
     JOIN "Curriculum" c ON c.id = m."curriculumId" AND c.version = (SELECT max(version) FROM "Curriculum" WHERE "studentId" = $1)
     WHERE c."studentId" = $1 AND m.subject = 'Kimia'
     ORDER BY m."weekOrder"`,
    [studentId]
  );
  let kfixed = 0;
  for (const m of kimiaMats.rows) {
    const meta = (m.metadata && typeof m.metadata === 'object') ? m.metadata : {};
    if (meta.mindmap) continue; // already has it
    const slides = m.rawContent || `${m.topic}: ${m.subTopic}`;
    const mindmap = [{ id: "root", label: m.topic, children: [{ label: m.subTopic }] }];
    const newMeta = { ...meta, slides, mindmap };
    await pool.query(`UPDATE "Material" SET metadata = $1 WHERE id = $2`, [JSON.stringify(newMeta), m.id]);
    kfixed++;
  }
  console.log(`✅ Kimia: ${kfixed} materials — mindmap fixed`);

  // Fix Bahasa Inggris Tingkat Lanjut — 0 slides
  const ingMats = await pool.query(
    `SELECT m.id, m."subTopic", m.topic, m.metadata, m."rawContent"
     FROM "Material" m
     JOIN "Curriculum" c ON c.id = m."curriculumId" AND c.version = (SELECT max(version) FROM "Curriculum" WHERE "studentId" = $1)
     WHERE c."studentId" = $1 AND m.subject = 'Bahasa Inggris Tingkat Lanjut'
     ORDER BY m."weekOrder"`,
    [studentId]
  );
  let ifixed = 0;
  for (const m of ingMats.rows) {
    const meta = (m.metadata && typeof m.metadata === 'object') ? m.metadata : {};
    const slides = m.rawContent || `${m.topic}: ${m.subTopic}`;
    const newMeta = { ...meta, slides };
    if (!meta.mindmap) newMeta.mindmap = [{ id: "root", label: m.topic, children: [{ label: m.subTopic }] }];
    await pool.query(`UPDATE "Material" SET metadata = $1 WHERE id = $2`, [JSON.stringify(newMeta), m.id]);
    ifixed++;
  }
  console.log(`✅ Inggris TL: ${ifixed} materials — slides fixed`);

  // Final audit
  console.log("\n=== FINAL AUDIT ===");
  const audit = await pool.query(
    `SELECT m.subject,
            count(*) as mats,
            count(*) filter (where m.metadata->>'mindmap' is not null) as mm,
            count(*) filter (where length(m."rawContent") > 50) as slides
     FROM "Material" m
     JOIN "Curriculum" c ON c.id = m."curriculumId" AND c.version = (SELECT max(version) FROM "Curriculum" WHERE "studentId" = $1)
     WHERE c."studentId" = $1
     GROUP BY m.subject ORDER BY m.subject`,
    [studentId]
  );
  let total = { mats: 0, mm: 0, slides: 0 };
  for (const r of audit.rows) {
    console.log(`${r.subject.padEnd(30)} | ${String(r.mats).padStart(3)} mats | ${String(r.mm).padStart(3)} mm | ${String(r.slides).padStart(3)} slides`);
    total.mats += parseInt(r.mats);
    total.mm += parseInt(r.mm);
    total.slides += parseInt(r.slides);
  }
  console.log(`-`.repeat(60));
  console.log(`${"TOTAL".padEnd(30)} | ${String(total.mats).padStart(3)} mats | ${String(total.mm).padStart(3)} mm | ${String(total.slides).padStart(3)} slides`);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
