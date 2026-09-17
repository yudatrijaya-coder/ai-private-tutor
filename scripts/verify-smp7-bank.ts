/**
 * Verify the SMP_1 content + quiz banks cover every topic the generator emits,
 * and that nothing in them would be rejected by the app's own slide validator.
 *
 * Usage: node scripts/run-ts.mjs scripts/verify-smp7-bank.ts
 */
import { GRADE_TOPICS } from "@/data/curriculum-topics";
import { getContent, hasContent } from "@/data/curriculum-content";
import { getQuiz } from "@/data/quiz-bank-smp7";
import { isUsableSlideText, isLlmReasoningDump } from "@/lib/content/slide-content";

const topics = GRADE_TOPICS.SMP_1 ?? [];

/**
 * Topics the source curriculum itself cannot supply a quiz for.
 *
 * `Sejarah / Perubahan Sosial / Dampak Kedatangan Eropa pada Masyarakat
 * Indonesia` was stored with five truncated questions — `explanation`,
 * `correctIndex` and `questionIndex` only, no `question` or `options` — so the
 * emitter dropped all five and the topic has no quiz. The bank cannot invent
 * one. Seen by `scripts/audit-quiz-integrity.ts`; repairing the stored row is a
 * separate job.
 */
const KNOWN_QUIZ_GAPS = [
  "Sejarah||Perubahan Sosial||Dampak Kedatangan Eropa pada Masyarakat Indonesia",
];

let noContent = 0;
let noQuiz = 0;
let knownGaps = 0;
let unusable = 0;
let reasoningDump = 0;
let badQuizShape = 0;
let totalQuestions = 0;
const badQuizDetail: string[] = [];

console.log(`SMP_1 topics: ${topics.length}\n`);
console.log("subject".padEnd(24) + "n".padStart(4) + "content".padStart(9) + "quiz".padStart(8) + "questions".padStart(11));

const by = new Map<string, { n: number; c: number; q: number; qs: number }>();

for (const t of topics) {
  const keyId = `${t.subject}||${t.topic}||${t.subTopic}`;
  const key = `${t.subject} / ${t.topic} / ${t.subTopic}`;
  const content = getContent(t.subject, t.topic, t.subTopic);
  const quiz = getQuiz(t.subject, t.topic, t.subTopic);

  const e = by.get(t.subject) ?? { n: 0, c: 0, q: 0, qs: 0 };
  e.n++;

  if (!content) {
    noContent++;
    console.log(`  NO CONTENT  ${key}`);
  } else {
    e.c++;
    if (!isUsableSlideText(content)) {
      unusable++;
      console.log(`  UNUSABLE    ${key} (${content.length} chars)`);
    }
    if (isLlmReasoningDump(content)) {
      reasoningDump++;
      console.log(`  REASONING   ${key}`);
    }
  }

  if (quiz.length === 0) {
    if (KNOWN_QUIZ_GAPS.includes(keyId)) {
      knownGaps++;
      console.log(`  NO QUIZ (known)  ${key}`);
    } else {
      noQuiz++;
      console.log(`  NO QUIZ     ${key}`);
    }
  } else {
    e.q++;
    e.qs += quiz.length;
    totalQuestions += quiz.length;
    for (const q of quiz) {
      const ok =
        typeof q.question === "string" &&
        q.question.trim().length > 0 &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        Number.isInteger(q.correctIndex) &&
        q.correctIndex >= 0 &&
        q.correctIndex < q.options.length &&
        typeof q.explanation === "string";
      if (!ok) {
        badQuizShape++;
        badQuizDetail.push(`${key} :: ${JSON.stringify(q).slice(0, 120)}`);
      }
    }
  }

  by.set(t.subject, e);
}

console.log("");
for (const [s, v] of [...by.entries()].sort((a, b) => b[1].n - a[1].n)) {
  console.log(s.padEnd(24) + String(v.n).padStart(4) + `${v.c}/${v.n}`.padStart(9) + `${v.q}/${v.n}`.padStart(8) + String(v.qs).padStart(11));
}

console.log("");
console.log(`missing content    : ${noContent}`);
console.log(`missing quiz       : ${noQuiz}`);
console.log(`known quiz gaps    : ${knownGaps}`);
console.log(`unusable slides    : ${unusable}`);
console.log(`reasoning dumps    : ${reasoningDump}`);
console.log(`malformed questions: ${badQuizShape}`);
console.log(`total questions    : ${totalQuestions}`);
console.log(`hasContent() spot  : ${hasContent("Biologi", "Sel dan Jaringan", "Struktur dan Fungsi Sel")}`);

// Topic bank keys must all be distinct, or two entries would collide in the map.
const keys = new Set(topics.map((t) => `${t.subject}||${t.topic}||${t.subTopic}`));
console.log(`distinct keys      : ${keys.size}/${topics.length}`);

for (const d of badQuizDetail.slice(0, 10)) console.log(`  BAD ${d}`);

const ok =
  noContent === 0 &&
  noQuiz === 0 &&
  unusable === 0 &&
  reasoningDump === 0 &&
  badQuizShape === 0 &&
  keys.size === topics.length;
console.log(`\n${ok ? "PASS" : "FAIL"}`);
