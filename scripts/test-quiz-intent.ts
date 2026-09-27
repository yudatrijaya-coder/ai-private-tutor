/**
 * Assert the deterministic quiz-intent detector against the real corpus of
 * student messages plus the near-misses it must NOT swallow.
 *
 * Run: npx tsx scripts/test-quiz-intent.ts
 */
import {
  isQuizRequest,
  parseQuizTimerRequest,
  hardFirstOrder,
  origIndex,
  buildQuestionMessage,
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

// Verbatim student messages pulled from ChatLog that ARE quiz requests.
const SHOULD_MATCH = [
  "kasih saya quiz",
  "ulang lagi",
  "ulang lagi lah",
  "buatkan aku sepuluh kuis matematika hitung cepat",
  "buatkan soal pancasila",
  "Ayo test aku bahasa Inggris 20 soal",
  "ai bikin quiz unsur dan senyawa pilihan ganda munculkan satu satu soalnya jangan sekaligus masing masing soal 30 detik",
  "Jangan kayak gini, buat soal satu2 dan saya milih pill box",
  "ayo ulang lagi dengan variasi soal berbeda",
  "ulang lagi tapi jadi 10 soal terus tambahkan soal unsur senyawa",
  "Buatkan 10 quiz bahasa Arab untuk kelas 5 sd",
  "mau latihan matematika dong",
  "test aku dong",
  "beri saya soal latihan",
];

// Near-misses: a question ABOUT a topic, or an ordinary sentence.
const SHOULD_NOT_MATCH = [
  "aki mau nanya soal himpunan contoh umum nya tu apa",
  "kak aku mau tanya soal fotosintesis",
  "apa itu soal cerita?",
  "halo kak",
  "makasih ya",
  "besok ulangan matematika",
  "aku suka matematika",
  "jelaskan materi pecahan dong",
];

console.log("── isQuizRequest: real quiz requests ──");
for (const m of SHOULD_MATCH) {
  check(`"${m.slice(0, 55)}"`, isQuizRequest(m));
}

console.log("\n── isQuizRequest: near-misses must NOT match ──");
for (const m of SHOULD_NOT_MATCH) {
  check(`"${m.slice(0, 55)}"`, !isQuizRequest(m), "matched but should not");
}

console.log("\n── parseQuizTimerRequest ──");
const TIMERS: [string, number | null][] = [
  ["masing masing soal 30 detik", 30],
  ["kasih saya quiz 1 menit per soal", 60],
  ["soal 45s", 45],
  ["buat 10 soal", null],
  ["quiz", null],
  ["waktu 5 detik", null], // below MIN
  ["10 menit", null], // above MAX
];
for (const [input, want] of TIMERS) {
  const got = parseQuizTimerRequest(input);
  check(`"${input}" → ${want}`, got === want, `got ${got}`);
}

console.log("\n── hardFirstOrder: hardest first, stable, a pure permutation ──");
{
  const qs = [
    { difficulty: "easy" }, // 0
    { difficulty: "hard" }, // 1
    { difficulty: undefined }, // 2
    { difficulty: "medium" }, // 3
    { difficulty: "hard" }, // 4
  ];
  const order = hardFirstOrder(qs);
  check("hard (1) tampil pertama", order[0] === 1, `order=${order}`);
  check("hard (4) tampil kedua", order[1] === 4, `order=${order}`);
  check("medium (3) sebelum easy", order[2] === 3, `order=${order}`);
  check("easy (0) sebelum unknown (2)", order[3] === 0 && order[4] === 2, `order=${order}`);
  const sorted = [...order].sort((a, b) => a - b);
  check(
    "permutasi murni [0..n) — tidak ada indeks hilang/ganda",
    JSON.stringify(sorted) === JSON.stringify([0, 1, 2, 3, 4]),
    `sorted=${sorted}`,
  );
}

console.log("\n── origIndex: display → original (grading invariant) ──");
{
  const order = [1, 4, 3, 0, 2];
  check("tanpa order = identitas", origIndex(undefined, 3) === 3);
  check("display 0 → original 1", origIndex(order, 0) === 1);
  check("display 4 → original 2", origIndex(order, 4) === 2);
  // Every display position must map to a distinct original index — this is what
  // keeps the grader's `questions[questionIndex]` lookup honest.
  const mapped = order.map((_, d) => origIndex(order, d));
  check(
    "setiap display memetakan ke indeks asli unik",
    new Set(mapped).size === order.length,
    `mapped=${mapped}`,
  );
}

console.log("\n── buildQuestionMessage: buttons + timer (the production regression) ──");
{
  const qs = [
    { question: "Air membeku pada suhu?", options: ["0°C", "100°C", "50°C", "−10°C"], correctIndex: 0 },
  ];
  const withTimer = buildQuestionMessage(0, qs, undefined, 30);
  check("teks memuat 'Soal 1 dari 1'", withTimer.text.includes("Soal 1 dari 1"), withTimer.text);
  check("teks memuat hitungan 30 detik", withTimer.text.includes("30 detik"), withTimer.text);
  // 4 options → 4 answer buttons + 1 exit row = 5 rows.
  check("4 opsi + keluar = 5 baris tombol", withTimer.keyboard.length === 5, `rows=${withTimer.keyboard.length}`);
  check(
    "tombol berlabel A/B/C/D",
    withTimer.keyboard[0][0].text.startsWith("A. ") &&
      withTimer.keyboard[1][0].text.startsWith("B. ") &&
      withTimer.keyboard[2][0].text.startsWith("C. ") &&
      withTimer.keyboard[3][0].text.startsWith("D. "),
    JSON.stringify(withTimer.keyboard.map((r) => r[0].text)),
  );
  check(
    "callback_data = quiz:ans:<display>:<opt>",
    withTimer.keyboard[0][0].callback_data === "quiz:ans:0:0" &&
      withTimer.keyboard[3][0].callback_data === "quiz:ans:0:3",
    JSON.stringify(withTimer.keyboard.map((r) => r[0].callback_data)),
  );
  check(
    "baris terakhir = tombol keluar",
    withTimer.keyboard[4][0].callback_data === "quiz:exit",
    withTimer.keyboard[4][0].callback_data,
  );

  // No timer requested → no countdown line, but buttons still present.
  const noTimer = buildQuestionMessage(0, qs);
  check("tanpa timer: tidak ada baris hitungan", !noTimer.text.includes("detik"), noTimer.text);
  check("tanpa timer: tombol tetap ada", noTimer.keyboard.length === 5, `rows=${noTimer.keyboard.length}`);

  // Open-ended question (no options) → no answer buttons, just exit.
  const open = buildQuestionMessage(0, [{ question: "Jelaskan fotosintesis." }]);
  check("tanpa opsi: hanya 1 baris (keluar)", open.keyboard.length === 1, `rows=${open.keyboard.length}`);
  check("tanpa opsi: minta ketik jawaban", open.text.includes("Ketik jawabanmu"), open.text);
}

console.log("\n── buildQuestionMessage + order: display→original callback mapping ──");
{
  const qs = [
    { question: "EASY q0", options: ["a", "b"], correctIndex: 0 },
    { question: "HARD q1", options: ["x", "y", "z"], correctIndex: 1 },
  ];
  const order = hardFirstOrder([{ difficulty: "easy" }, { difficulty: "hard" }]); // [1, 0]
  const first = buildQuestionMessage(0, qs, order, 20);
  // Display 0 is the hard question (original index 1), which has 3 options.
  check("display 0 menampilkan soal hard (3 opsi)", first.keyboard.length === 4, `rows=${first.keyboard.length}`);
  check("teks = soal hard", first.text.includes("HARD q1"), first.text);
  check(
    "callback menunjuk display 0 (bukan indeks asli)",
    first.keyboard[0][0].callback_data === "quiz:ans:0:0",
    first.keyboard[0][0].callback_data,
  );
  // recordAnswer will map display 0 → original 1, so grading hits the right question.
  check("display 0 → original 1", origIndex(order, 0) === 1);
}

console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);