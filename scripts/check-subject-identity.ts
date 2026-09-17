/**
 * Guard for subject identity in the ProSem matcher.
 *
 * WHY THIS EXISTS: `sim("Matematika", "Matematika Tingkat Lanjut")` returns 0.850
 * because of the substring boost, and SIM_THRESHOLD is 0.84. Every comparison
 * built on `sim` alone therefore treated SMA XI's two separate mathematics
 * courses as one. The coverage report proved it: the 14 "Matematika Tingkat
 * Lanjut" sessions were scored against `Matematika / Polinomial / Polinomial dan
 * Fungsi Polinomial`, a row it should never have seen.
 *
 * Run: npx --no-install jiti scripts/check-subject-identity.ts
 */
import {
  subjectsEquivalent,
  subjectSatisfies,
  acceptableSubjects,
  isQualifiedSubject,
  sim,
  SIM_THRESHOLD,
} from "../src/lib/prosem-match";

interface Case {
  a: string;
  b: string;
  want: boolean;
  why: string;
}

const CASES: Case[] = [
  // The bug this file exists for.
  { a: "Matematika", b: "Matematika Tingkat Lanjut", want: false,
    why: "SMA XI offers both; a regular lesson must not satisfy the advanced course" },
  { a: "Matematika Tingkat Lanjut", b: "Matematika", want: false,
    why: "symmetric: the advanced course must not read regular material" },
  { a: "Matematika", b: "Matematika Penalaran", want: false,
    why: "Matematika Penalaran is a third, separate course" },
  { a: "Bahasa Inggris", b: "Bahasa Inggris Tingkat Lanjut", want: false,
    why: "same trap, different subject" },
  // Identical names must still match, qualifier or not.
  { a: "Matematika", b: "Matematika", want: true, why: "exact" },
  { a: "Matematika Tingkat Lanjut", b: "Matematika Tingkat Lanjut", want: true,
    why: "exact, qualified" },
  { a: "Biologi", b: "Biologi", want: true, why: "exact" },
  // Whitespace/case noise is not a course difference.
  { a: "matematika  tingkat   lanjut", b: "Matematika Tingkat Lanjut", want: true,
    why: "norm() collapses case and punctuation" },
];

const QUALIFIER_CASES: Array<[string, boolean]> = [
  ["Matematika", false],
  ["Matematika Tingkat Lanjut", true],
  ["Matematika Penalaran", true],
  ["Bahasa Inggris", false],
  ["Bahasa Inggris Tingkat Lanjut", true],
];

let fail = 0;
function check(label: string, got: unknown, want: unknown, why = ""): void {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${why ? `  — ${why}` : ""}`);
  if (!ok) console.log(`      got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

console.log("== subjectsEquivalent ==");
for (const c of CASES) check(`subjectsEquivalent(${c.a} , ${c.b})`, subjectsEquivalent(c.a, c.b), c.want, c.why);

console.log("\n== isQualifiedSubject ==");
for (const [s, want] of QUALIFIER_CASES) check(`isQualifiedSubject(${s})`, isQualifiedSubject(s), want);

console.log("\n== subjectSatisfies: alias union still works ==");
check("subjectSatisfies(Biologi, IPA)", subjectSatisfies("Biologi", "IPA"), true,
  "VII prosem files biology under IPA");
check("subjectSatisfies(Fisika, IPA)", subjectSatisfies("Fisika", "IPA"), true,
  "VII thermal chapter lives under IPA");
check("subjectSatisfies(Sejarah, IPS)", subjectSatisfies("Sejarah", "IPS"), true, "IPS alias");
check("subjectSatisfies(Matematika, IPA)", subjectSatisfies("Matematika", "IPA"), false,
  "no alias may bridge unrelated subjects");
check("subjectSatisfies(IPA, Biologi)", subjectSatisfies("IPA", "Biologi"), false,
  "the alias relation is one-way");
check("subjectSatisfies(Matematika, Matematika Tingkat Lanjut)",
  subjectSatisfies("Matematika", "Matematika Tingkat Lanjut"), false,
  "alias map has no 'matematika' key, and the qualifier gate blocks it");

console.log("\n== acceptableSubjects ==");
check("acceptableSubjects(Matematika) has no variant",
  acceptableSubjects("Matematika").some((s) => s.includes("tingkat")), false);
check("acceptableSubjects(Biologi) includes ipa",
  acceptableSubjects("Biologi").includes("ipa"), true);

console.log("\n== the trap, documented ==");
const raw = sim("Matematika", "Matematika Tingkat Lanjut");
console.log(`  sim("Matematika", "Matematika Tingkat Lanjut") = ${raw.toFixed(3)}`);
check("raw sim is above SIM_THRESHOLD (hence this guard)", raw >= SIM_THRESHOLD, true,
  `threshold=${SIM_THRESHOLD}; the substring boost lands at 0.85`);

console.log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`}`);
process.exit(fail === 0 ? 0 : 1);
