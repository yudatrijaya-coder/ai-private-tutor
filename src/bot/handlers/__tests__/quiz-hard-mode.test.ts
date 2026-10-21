/**
 * Tes untuk perbaikan "ulang, lebih sulit":
 * mode hard harus memberi soal BERBEDA, bukan sekadar mengurutkan ulang.
 *
 * Jalankan: npx tsx src/bot/handlers/__tests__/quiz-hard-mode.test.ts
 */
import { pickHarderQuestions, hardFirstOrder } from "../quiz";

interface Q {
  question: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  difficulty?: string;
}

/** Samakan dengan questionKey() di quiz.ts agar test tidak salah asumsi. */
const keyOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${detail}`);
  }
}

const bank: Q[] = [
  { question: "Q1 easy", difficulty: "easy", options: ["a", "b"], correctIndex: 0 },
  { question: "Q2 easy", difficulty: "easy", options: ["a", "b"], correctIndex: 0 },
  { question: "Q3 medium", difficulty: "medium", options: ["a", "b"], correctIndex: 0 },
  { question: "Q4 hard", difficulty: "hard", options: ["a", "b"], correctIndex: 0 },
  { question: "Q5 hard", difficulty: "hard", options: ["a", "b"], correctIndex: 0 },
  { question: "Q6 medium", difficulty: "medium", options: ["a", "b"], correctIndex: 0 },
];

console.log("\n=== T1: soal yang sudah dilihat dilewati ===");
{
  const seen = new Set(["Q1 easy", "Q2 easy", "Q3 medium"].map(keyOf));
  const { picked } = pickHarderQuestions(bank as never, seen, 2);
  const texts = picked.map((q) => q.question);
  check("tidak mengulang soal yang sudah dilihat", !texts.includes("Q1 easy"), JSON.stringify(texts));
  check("mengambil soal hard lebih dulu", texts[0]?.includes("hard") ?? false, JSON.stringify(texts));
}

console.log("\n=== T2: tanpa riwayat, hard tetap diprioritaskan ===");
{
  const { picked, hardCount } = pickHarderQuestions(bank as never, new Set(), 3);
  check("2 soal hard masuk", hardCount === 2, `hardCount=${hardCount}`);
  check("hard ada di posisi terdepan", picked[0]?.difficulty === "hard", String(picked[0]?.difficulty));
}

console.log("\n=== T3: fallback saat soal baru habis ===");
{
  const seen = new Set(bank.map((q) => keyOf(q.question))); // semua sudah dilihat
  const { picked, usedFallback } = pickHarderQuestions(bank as never, seen, 3);
  check("fallback dipakai", usedFallback === true);
  check("masih mengembalikan soal (tidak kosong)", picked.length === 3, `n=${picked.length}`);
  check("fallback tetap hard dulu", picked[0]?.difficulty === "hard", String(picked[0]?.difficulty));
}

console.log("\n=== T4: dedup soal kembar ===");
{
  const dup = [...bank, { question: "Q1 easy", difficulty: "easy", options: ["a"], correctIndex: 0 }];
  const { picked } = pickHarderQuestions(dup as never, new Set(), 10);
  const texts = picked.map((q) => q.question);
  check("tidak ada duplikat", new Set(texts).size === texts.length, JSON.stringify(texts));
}

console.log("\n=== T5: PERILAKU LAMA (bukti bug) ===");
{
  // Distribusi mirip bank SMA11 (mayoritas easy, hard sedikit)
  const easyOnly: Q[] = [
    { question: "E1", difficulty: "easy", options: ["a"], correctIndex: 0 },
    { question: "E2", difficulty: "easy", options: ["a"], correctIndex: 0 },
    { question: "E3", difficulty: "easy", options: ["a"], correctIndex: 0 },
  ];
  const before = hardFirstOrder(easyOnly as never);
  check(
    "hardFirstOrder TIDAK mengubah urutan bila semua easy (bug lama)",
    JSON.stringify(before) === JSON.stringify([0, 1, 2]),
    JSON.stringify(before),
  );

  const seen = new Set<string>();
  const { picked } = pickHarderQuestions(easyOnly as never, seen, 3);
  check(
    "solusi baru tetap mengembalikan soal (tidak macet)",
    picked.length === 3,
    `n=${picked.length}`,
  );
}

console.log("\n=== T6: konsistensi jumlah soal ===");
{
  const { picked } = pickHarderQuestions(bank as never, new Set(), 4);
  check("jumlah sesuai permintaan", picked.length === 4, `n=${picked.length}`);
  const { picked: p2 } = pickHarderQuestions(bank as never, new Set(), 100);
  check("tidak melebihi kandidat tersedia", p2.length === bank.length, `n=${p2.length}`);
}

console.log(`\n══════ HASIL: ${pass} PASS / ${fail} FAIL ══════\n`);
if (fail > 0) process.exit(1);
