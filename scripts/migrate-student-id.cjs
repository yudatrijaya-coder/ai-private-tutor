const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost", port: 5432, database: "ai_private_tutor",
  user: "tutor", password: "tutor123",
});

/** Bersihin nama: HURUF BESAR, max 6 huruf, minimal 3 */
function cleanName(name) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 6)
    .padEnd(3, "X");
}

async function main() {
  // Ambil semua student active
  const { rows } = await pool.query(
    `SELECT id, "studentId", name FROM "Student" WHERE status != 'ARCHIVED' ORDER BY name`
  );

  // Collect existing (pre-mapped) studentId untuk cek duplikat
  const allIds = rows.map(r => r.studentId);

  console.log("Migration plan:\n");

  const updates = [];
  for (const row of rows) {
    const base = cleanName(row.name);
    // Cari nomor tertinggi untuk base ini (dari yg udah di-mapping maupun existing)
    const sameBase = allIds
      .filter(id => id.startsWith(base))
      .map(id => parseInt(id.replace(/^[A-Z]+/, ""), 10))
      .filter(n => !isNaN(n));

    let nextNum = 1;
    if (sameBase.length > 0) {
      nextNum = Math.max(...sameBase) + 1;
    }

    const newId = `${base}${String(nextNum).padStart(3, "0")}`;
    allIds.push(newId); // biar jadi referensi buat row berikutnya
    updates.push({ dbId: row.id, oldId: row.studentId, newId, name: row.name });
    console.log(`  ${row.studentId.padEnd(18)} → ${newId.padEnd(10)}  (${row.name})`);
  }

  console.log("\nExecuting...");

  for (const u of updates) {
    if (u.oldId === u.newId) continue;
    await pool.query(`UPDATE "Student" SET "studentId" = $1 WHERE id = $2`, [u.newId, u.dbId]);
    console.log(`  ✓ ${u.oldId} → ${u.newId}`);
  }

  console.log("\n✅ Done!");
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
