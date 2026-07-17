const { Pool } = require("pg");
const crypto = require("crypto");

const pool = new Pool({
  host: "localhost", port: 5432, database: "ai_private_tutor",
  user: "tutor", password: "tutor123",
});

async function main() {
  const sres = await pool.query(`SELECT id FROM "Student" WHERE "studentId" = 'STU_MRHLH4LX'`);
  const studentId = sres.rows[0].id;

  // Get ALL curriculum IDs for Raihan
  const currs = await pool.query(
    `SELECT id FROM "Curriculum" WHERE "studentId" = $1`, [studentId]
  );
  const currIds = currs.rows.map(r => r.id);
  console.log(`Raihan curriculum IDs: ${currIds.join(", ")}`);

  // Count materials per curriculum
  for (const cid of currIds) {
    const cnt = await pool.query(
      `SELECT count(*) as n FROM "Material" WHERE "curriculumId" = $1`, [cid]
    );
    console.log(`  Curriculum ${cid.slice(0,8)}: ${cnt.rows[0].n} materials`);
  }

  // Use the LATEST curriculum only
  const latestCurr = currIds[0]; // ordered DESC by version
  console.log(`\nUsing latest curriculum: ${latestCurr}`);

  // Check all subjects in latest curriculum
  const subs = await pool.query(
    `SELECT subject, count(*) as n FROM "Material" WHERE "curriculumId" = $1 GROUP BY subject ORDER BY subject`,
    [latestCurr]
  );
  console.log("\nSubjects in latest curriculum:");
  for (const r of subs.rows) {
    console.log(`  ${r.subject}: ${r.n} materials`);
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
