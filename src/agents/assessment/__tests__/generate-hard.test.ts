/**
 * Uji generator soal hard: pastikan output valid, bertanda hard, dan tidak
 * mengulang soal yang di-exclude.
 *
 * Jalankan: npx tsx src/agents/assessment/__tests__/generate-hard.test.ts
 */
import { generateQuestionsForTopic } from "../generator";

async function main() {
  console.log("\n=== UJI GENERATE SOAL HARD ===\n");

  const exclude = [
    "Apa ibu kota Indonesia?",
    "Berapa hasil 2 + 2?",
  ];

  const t0 = Date.now();
  let qs: any[] = [];
  try {
    qs = await generateQuestionsForTopic({
      subject: "Matematika",
      topic: "Persamaan Kuadrat",
      count: 3,
      studentId: "test-generate-hard",
      gradeLevel: "SMA 11",
      exclude,
      difficulty: "hard",
    });
  } catch (e) {
    console.log("  ✗ generate melempar error:", (e as Error).message);
    process.exit(1);
  }
  const dt = ((Date.now() - t0) / 1000).toFixed(1);

  let pass = 0;
  let fail = 0;
  const check = (name: string, cond: boolean, detail = "") => {
    if (cond) { pass++; console.log(`  ✓ ${name}`); }
    else { fail++; console.log(`  ✗ ${name} ${detail}`); }
  };

  check("menghasilkan soal", qs.length > 0, `n=${qs.length}`);
  check("jumlah mendekati permintaan (>=1)", qs.length >= 1, `n=${qs.length}`);

  const badShape = qs.filter(
    (q) =>
      !q.question ||
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      typeof q.correctIndex !== "number" ||
      q.correctIndex < 0 ||
      q.correctIndex >= q.options.length,
  );
  check("semua soal punya bentuk valid", badShape.length === 0, `invalid=${badShape.length}`);

  const notHard = qs.filter((q) => (q.difficulty ?? "").toLowerCase() !== "hard");
  check("semua berlabel hard", notHard.length === 0,
        `bukan hard: ${notHard.map((q) => q.difficulty).join(",")}`);

  const excludedKeys = new Set(exclude.map((s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()));
  const dup = qs.filter((q) =>
    excludedKeys.has(String(q.question).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()));
  check("tidak mengulang soal yang di-exclude", dup.length === 0, `dup=${dup.length}`);

  console.log(`\n  Dihasilkan dalam ${dt}s:`);
  qs.forEach((q, i) => {
    console.log(`    ${i + 1}. [${q.difficulty}] ${String(q.question).slice(0, 70)}`);
    console.log(`       opsi: ${q.options.length}, benar: #${q.correctIndex}`);
  });

  console.log(`\n══════ HASIL: ${pass} PASS / ${fail} FAIL ══════\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
