const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost", port: 5432, database: "ai_private_tutor",
  user: "tutor", password: "tutor123",
});

async function main() {
  const students = [
    { id: "STU_MRHQL6KX", name: "SHOFI" },
    { id: "STU_MRHLH4LX", name: "Raihan" },
  ];

  for (const s of students) {
    const res = await pool.query(
      `SELECT s.name, s."studentId",
              c.version as curr_ver,
              m.subject, count(*) as mats,
              count(DISTINCT q.id) as quizzes,
              count(*) filter (where m.metadata->>'mindmap' is not null) as with_mindmap,
              count(*) filter (where length(m."rawContent") > 50) as with_slides
       FROM "Student" s
       JOIN "Curriculum" c ON c."studentId" = s.id AND c.version = (SELECT max(version) FROM "Curriculum" WHERE "studentId" = s.id)
       JOIN "Material" m ON m."curriculumId" = c.id
       LEFT JOIN "Quiz" q ON q."materialId" = m.id
       WHERE s."studentId" = $1
       GROUP BY m.subject, s.name, s."studentId", c.version
       ORDER BY m.subject`,
      [s.id]
    );
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`${s.name} (${s.id})`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Subject | Mats | Quiz | Mindmap | Slides`);
    console.log(`--------|------|------|---------|-------`);
    let tm = 0, tq = 0, tmm = 0, tsl = 0;
    for (const r of res.rows) {
      console.log(`${r.subject.padEnd(25)} | ${String(r.mats).padStart(3)} | ${String(r.quizzes).padStart(3)} | ${String(r.with_mindmap).padStart(3)} | ${String(r.with_slides).padStart(3)}`);
      tm += parseInt(r.mats); tq += parseInt(r.quizzes); tmm += parseInt(r.with_mindmap); tsl += parseInt(r.with_slides);
    }
    console.log(`--------|------|------|---------|-------`);
    console.log(`TOTAL   | ${String(tm).padStart(3)} | ${String(tq).padStart(3)} | ${String(tmm).padStart(3)} | ${String(tsl).padStart(3)}`);
  }
  
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
