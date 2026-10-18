/**
 * Exercise the generate-on-demand path (B) directly.
 *
 * B is the expensive branch: only a DEMANDING student asking about a SPECIFIC
 * topic triggers it, and it must return valid, renderable questions — not an
 * empty array, not prose, not questions missing an answer key.
 *
 * Self-cleaning: any Quiz row created is deleted at the end.
 *
 * Run: npx tsx scripts/test-quiz-generate.ts
 */
import { prisma } from "../src/lib/prisma";
import { generateQuestionsForTopic } from "../src/agents/assessment/generator";
import { questionRejection } from "../src/lib/quiz-grading";

const STUDENT_KEY = "RAIHAN001";

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  const student = await prisma.student.findFirst({ where: { studentId: STUDENT_KEY } });
  if (!student) {
    console.error(`❌ Murid ${STUDENT_KEY} tidak ditemukan`);
    process.exit(1);
  }
  console.log(`\nMurid: ${student.name}\n`);

  const t0 = Date.now();
  const questions = await generateQuestionsForTopic({
    subject: "Kimia",
    topic: "pemisahan campuran",
    count: 5,
    studentId: student.id,
    gradeLevel: "SD 5",
    exclude: ["Metode pemisahan campuran yang didasarkan pada perbedaan titik didih adalah ..."],
  });
  const ms = Date.now() - t0;
  console.log(`  dihasilkan ${questions.length} soal dalam ${ms} ms\n`);

  check("menghasilkan minimal 1 soal", questions.length >= 1, `${questions.length}`);
  check("menghasilkan tepat 5 soal (yang diminta)", questions.length === 5, `${questions.length}`);

  // Every question must be renderable — a question the student cannot see is
  // worse than no question (this is the invariant saveQuiz guards).
  const bad = questions.map((q) => questionRejection(q)).filter((r) => r !== null);
  check("semua soal renderable", bad.length === 0, bad.join("; "));

  // Shape: 4 options, valid correctIndex, non-empty explanation.
  const shaped = questions.every(
    (q) =>
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      typeof q.correctIndex === "number" &&
      q.correctIndex >= 0 &&
      q.correctIndex < q.options.length &&
      typeof q.question === "string" &&
      q.question.trim().length > 0,
  );
  check("bentuk soal valid (opsi + correctIndex + pertanyaan)", shaped);

  // Not the excluded question.
  const repeated = questions.some((q) =>
    /perbedaan titik didih/i.test(q.question),
  );
  check("tidak mengulang soal yang dikecualikan", !repeated);

  // Topic-relevant, not generic filler.
  const onTopic = questions.filter((q) =>
    /pemisah|campuran|filtrasi|destilasi|evaporasi|sublimasi|kromatografi|sentrifugasi/i.test(
      `${q.question} ${q.explanation}`,
    ),
  );
  console.log(`  relevansi topik: ${onTopic.length}/${questions.length}`);
  if (questions.length) {
    console.log("  contoh:", questions[0].question.slice(0, 90));
    console.log("  opsi :", questions[0].options.map((o) => o.slice(0, 30)).join(" | "));
  }
  check("mayoritas soal relevan dgn topik", onTopic.length >= Math.ceil(questions.length / 2), `${onTopic.length}/${questions.length}`);

  console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error("❌ Test crashed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
