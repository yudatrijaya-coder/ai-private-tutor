/**
 * Simulasi end-to-end: bandingkan perilaku LAMA vs BARU
 * memakai distribusi soal yang mirip bank SMA 11 (52% easy, 44% medium, 4% hard).
 */
import { pickHarderQuestions, hardFirstOrder } from "../quiz";

const keyOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// 20 soal: 10 easy, 8 medium, 2 hard (mirip SMA11)
const bank: any[] = [];
for (let i = 1; i <= 10; i++) bank.push({ question: `Easy ${i}`, difficulty: "easy", options: ["a", "b"], correctIndex: 0 });
for (let i = 1; i <= 8; i++) bank.push({ question: `Medium ${i}`, difficulty: "medium", options: ["a", "b"], correctIndex: 0 });
for (let i = 1; i <= 2; i++) bank.push({ question: `Hard ${i}`, difficulty: "hard", options: ["a", "b"], correctIndex: 0 });

// Sesi pertama: murid dapat 10 soal pertama (5 easy + 3 medium + 2 hard misalnya)
const firstSession = [...bank.slice(0, 7), bank[18], bank[19], bank[7]];

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  PERBANDINGAN: PERILAKU LAMA vs BARU                     ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

console.log("Sesi 1 (10 soal yang diberikan):");
console.log("  " + firstSession.map((q: any) => q.difficulty[0].toUpperCase()).join(" "));
console.log("  " + firstSession.map((q: any) => q.question).join(", ") + "\n");

// ── LAMA ──
const oldOrder = hardFirstOrder(firstSession);
const oldShown = oldOrder.map((i: number) => firstSession[i]);
const oldTexts = oldShown.map((q: any) => q.question);
const newCount = oldTexts.filter((t: string) => !firstSession.map((q: any) => q.question).includes(t)).length;

console.log("┌─ PERILAKU LAMA ────────────────────────────────────────┐");
console.log(`│ Soal diberikan : ${oldTexts.join(", ")}`);
console.log(`│ Soal BARU      : ${newCount} dari 10`);
console.log(`│ Sama persis?   : ${newCount === 0 ? "YA — semua soal diulang" : "tidak"}`);
console.log("└────────────────────────────────────────────────────────┘\n");

// ── BARU ──
const seen = new Set(firstSession.map((q: any) => keyOf(q.question)));
const { picked, usedFallback, hardCount } = pickHarderQuestions(bank, seen, 10);
const newTexts = picked.map((q: any) => q.question);
const freshCount = newTexts.filter((t: string) => !seen.has(keyOf(t))).length;

console.log("┌─ PERILAKU BARU ────────────────────────────────────────┐");
console.log(`│ Soal diberikan : ${newTexts.join(", ")}`);
console.log(`│ Soal BARU      : ${freshCount} dari ${newTexts.length}`);
console.log(`│ Soal hard      : ${hardCount}`);
console.log(`│ Pakai fallback : ${usedFallback ? "ya" : "tidak"}`);
console.log("└────────────────────────────────────────────────────────┘\n");

const fixed = freshCount > 0 && newCount === 0;
console.log(fixed
  ? "✅ PERBAIKAN BERHASIL: mode 'lebih sulit' sekarang memberi soal yang BERBEDA."
  : "❌ PERBAIKAN GAGAL: masih mengulang soal yang sama.");

process.exit(fixed ? 0 : 1);
