/**
 * Assert the count-aware quiz parser: how many questions a student asked for,
 * and whether they are insisting. Both drive the A+C/B strategy, so getting
 * them wrong either under-delivers (the Raihan bug: asked 20, got 6) or
 * over-generates (calling the LLM on a casual "kasih quiz").
 *
 * Run: npx tsx scripts/test-quiz-count.ts
 */
import {
  parseQuizCount,
  isDemandingQuizRequest,
  MAX_QUIZ_QUESTIONS,
} from "../src/bot/handlers/quiz";

let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("── parseQuizCount: reads an explicit number of questions ──");
{
  // The exact message Raihan sent (verbatim, minus the trailing topic list).
  check("'buat 20 soal kimia Pemisahan Campuran' → 20", parseQuizCount("buat 20 soal kimia Pemisahan Campuran") === 20);
  check("'kasih saya 10 soal ipas' → 10", parseQuizCount("kasih saya 10 soal ipas") === 10);
  check("'buat 3 soal' → 3", parseQuizCount("buat 3 soal") === 3);
  check("'soal 15 dong' → 15", parseQuizCount("soal 15 dong") === 15);
  check("'bikin 8 pertanyaan' → 8", parseQuizCount("bikin 8 pertanyaan") === 8);
  check("'minta 7 butir soal' → 7", parseQuizCount("minta 7 butir soal") === 7);
}

console.log("\n── parseQuizCount: must NOT invent a count ──");
{
  check("'kasih saya quiz' → null", parseQuizCount("kasih saya quiz") === null);
  check("'mau latihan matematika' → null", parseQuizCount("mau latihan matematika") === null);
  // A bare number is what a student types when they think the bot asked them
  // something — it is NOT a question count.
  check("bare '20' → null", parseQuizCount("20") === null);
  check("'aku kelas 5' → null (not a count)", parseQuizCount("aku kelas 5") === null);
  check("'30 detik' → null (that's the timer)", parseQuizCount("kasih quiz 30 detik") === null);
}

console.log("\n── parseQuizCount: clamps absurd asks ──");
{
  check("'buat 1000 soal' → clamped to MAX", parseQuizCount("buat 1000 soal") === MAX_QUIZ_QUESTIONS);
  check("'buat 0 soal' → null", parseQuizCount("buat 0 soal") === null);
}

console.log("\n── isDemandingQuizRequest: insisting vs. asking once ──");
{
  check("naming a count is a demand", isDemandingQuizRequest("buat 20 soal kimia") === true);
  check("'baca yang benar 6 bukan 20' is a demand", isDemandingQuizRequest("baca yang benar 6 bukan 20") === true);
  check("'pokoknya harus 20' is a demand", isDemandingQuizRequest("pokoknya harus 20 soal") === true);
  check("'masa cuma segini' is a demand", isDemandingQuizRequest("masa cuma segini kak") === true);
  check("'kasih saya quiz' is NOT a demand", isDemandingQuizRequest("kasih saya quiz") === false);
  check("'mau latihan ipas' is NOT a demand", isDemandingQuizRequest("mau latihan ipas") === false);
}

console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
