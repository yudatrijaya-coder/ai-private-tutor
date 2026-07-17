const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost", port: 5432, database: "ai_private_tutor",
  user: "tutor", password: "tutor123",
});

async function main() {
  const sres = await pool.query(`SELECT id FROM "Student" WHERE "studentId" = 'STU_MRHLH4LX'`);
  const studentId = sres.rows[0].id;

  const mats = await pool.query(
    `SELECT m.id, m."subTopic", m.topic, m.subject, m.metadata, m."rawContent"
     FROM "Material" m
     JOIN "Curriculum" c ON c.id = m."curriculumId" AND c.version = (SELECT max(version) FROM "Curriculum" WHERE "studentId" = $1)
     WHERE c."studentId" = $1
     ORDER BY m.subject, m."weekOrder"`,
    [studentId]
  );

  let updated = 0;
  for (const m of mats.rows) {
    const meta = (m.metadata && typeof m.metadata === 'object') ? m.metadata : {};
    const slides = m.rawContent || `${m.topic}: ${m.subTopic}`;
    
    const mindmap = [{
      id: "root",
      label: m.topic,
      children: [{ label: m.subTopic }]
    }];

    const newMeta = { ...meta, slides, mindmap };
    await pool.query(`UPDATE "Material" SET metadata = $1 WHERE id = $2`, [JSON.stringify(newMeta), m.id]);
    updated++;
  }

  console.log(`✅ Updated ${updated} materials with slides + mindmap`);
  
  const cnt = await pool.query(
    `SELECT count(*) as n FROM "Material" m
     JOIN "Curriculum" c ON c.id = m."curriculumId" AND c.version = (SELECT max(version) FROM "Curriculum" WHERE "studentId" = $1)
     WHERE c."studentId" = $1 AND m.metadata->>'mindmap' IS NOT NULL`,
    [studentId]
  );
  console.log(`Materials with mindmap: ${cnt.rows[0].n}`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
