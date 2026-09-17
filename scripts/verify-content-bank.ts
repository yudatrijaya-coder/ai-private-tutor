/**
 * Verify the content + quiz banks cover every topic the generator emits, for
 * every grade, and that nothing would be rejected by the app's own slide
 * validator.
 *
 * A bank can be structurally fine and still be useless: the hand-written banks
 * were built for the Kurikulum Merdeka integrated palette (IPA / IPS) while the
 * school teaches 15 separate subjects, so regenerating a curriculum produced
 * structurally correct but empty materials. This asserts coverage, not shape.
 *
 * Usage: node scripts/run-ts.mjs scripts/verify-content-bank.ts
 */
import { GRADE_TOPICS } from "@/data/curriculum-topics";
import { getContent } from "@/data/curriculum-content";
import { getQuiz as getQuizSD5 } from "@/data/quiz-bank-sd5";
import { getQuiz as getQuizSMP7 } from "@/data/quiz-bank-smp7";
import { getQuiz as getQuizSMA11 } from "@/data/quiz-bank-sma11";
import { isUsableSlideText, isLlmReasoningDump, MIN_USABLE_SLIDE_LENGTH } from "@/lib/content/slide-content";

/**
 * Topics the source curriculum itself cannot supply a quiz for.
 *
 * Both are defects in the stored data, not in the bank — the bank cannot invent
 * a quiz the curriculum never had. Seen by `scripts/audit-quiz-integrity.ts`;
 * repairing the stored rows is a separate job.
 *
 * 1. `SMP_1 / Sejarah / Perubahan Sosial / Dampak Kedatangan Eropa pada
 *    Masyarakat Indonesia` — five truncated questions: `explanation`,
 *    `correctIndex` and `questionIndex` only, no `question` or `options`. The
 *    emitter drops all five.
 * 2. `SMA_2 / Matematika Tingkat Lanjut / Polinomial / Polinomial dan Fungsi
 *    Polinomial` — an orphan test row (`weekOrder 1`, `processedContent` empty,
 *    `slide_sibi` 3014 chars, zero quizzes). Never had a quiz.
 */
const KNOWN_QUIZ_GAPS = new Set<string>([
  // The Sejarah gap is closed: the five questions were unrenderable, so the
  // emitter dropped the whole topic from the bank, and the topic now emits with
  // all five. Leaving the entry here would hide a regression.
  "SMA_2||Matematika Tingkat Lanjut||Polinomial||Polinomial dan Fungsi Polinomial",
]);

const GRADES = {
  SD_5: getQuizSD5,
  SMP_1: getQuizSMP7,
  SMA_2: getQuizSMA11,
} as const;

type GradeKey = keyof typeof GRADES;

interface GradeReport {
  grade: string;
  topics: number;
  subjects: number;
  noContent: number;
  noQuiz: number;
  knownGaps: number;
  unusable: number;
  reasoningDump: number;
  malformed: number;
  short: number;
  thinKeys: string[];
  questions: number;
  distinctKeys: number;
}

function checkGrade(grade: GradeKey): GradeReport {
  const topics = GRADE_TOPICS[grade] ?? [];
  const quizFn = GRADES[grade];
  const r: GradeReport = {
    grade,
    topics: topics.length,
    subjects: new Set(topics.map((t) => t.subject)).size,
    noContent: 0,
    noQuiz: 0,
    knownGaps: 0,
    unusable: 0,
    reasoningDump: 0,
    malformed: 0,
    short: 0,
    thinKeys: [],
    questions: 0,
    distinctKeys: 0,
  };

  const keys = new Set<string>();
  for (const t of topics) {
    keys.add(`${t.subject}||${t.topic}||${t.subTopic}`);
    const keyId = `${grade}||${t.subject}||${t.topic}||${t.subTopic}`;
    const label = `${t.subject} / ${t.topic} / ${t.subTopic}`;

    const content = getContent(t.subject, t.topic, t.subTopic, grade);
    if (!content) {
      r.noContent++;
      console.log(`  [${grade}] NO CONTENT  ${label}`);
    } else {
      if (!isUsableSlideText(content)) {
        r.unusable++;
        console.log(`  [${grade}] UNUSABLE    ${label} (${content.length} chars)`);
      }
      if (isLlmReasoningDump(content)) {
        r.reasoningDump++;
        console.log(`  [${grade}] REASONING   ${label}`);
      }
      if (content.length < MIN_USABLE_SLIDE_LENGTH) {
        r.short++;
        if (r.thinKeys.length < 6) r.thinKeys.push(`${label} (${content.length})`);
      }
    }

    const quiz = quizFn(t.subject, t.topic, t.subTopic);
    if (quiz.length === 0) {
      if (KNOWN_QUIZ_GAPS.has(keyId)) {
        r.knownGaps++;
      } else {
        r.noQuiz++;
        console.log(`  [${grade}] NO QUIZ     ${label}`);
      }
      continue;
    }
    r.questions += quiz.length;
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
        r.malformed++;
        console.log(`  [${grade}] BAD SHAPE   ${label} :: ${JSON.stringify(q).slice(0, 110)}`);
      }
    }
  }
  r.distinctKeys = keys.size;
  return r;
}

const reports = (Object.keys(GRADES) as GradeKey[]).map(checkGrade);

console.log("");
console.log("grade   topics  subj  content     quiz     questions  distinct");
for (const r of reports) {
  const c = `${r.topics - r.noContent}/${r.topics}`;
  const q = `${r.topics - r.noQuiz - r.knownGaps}/${r.topics}`;
  console.log(
    r.grade.padEnd(6) +
      String(r.topics).padStart(6) +
      String(r.subjects).padStart(6) +
      c.padStart(9) +
      q.padStart(9) +
      String(r.questions).padStart(11) +
      String(r.distinctKeys).padStart(9),
  );
}

const t = reports.reduce(
  (a, r) => ({
    topics: a.topics + r.topics,
    noContent: a.noContent + r.noContent,
    noQuiz: a.noQuiz + r.noQuiz,
    knownGaps: a.knownGaps + r.knownGaps,
    unusable: a.unusable + r.unusable,
    reasoningDump: a.reasoningDump + r.reasoningDump,
    malformed: a.malformed + r.malformed,
    short: a.short + r.short,
    questions: a.questions + r.questions,
  }),
  { topics: 0, noContent: 0, noQuiz: 0, knownGaps: 0, unusable: 0, reasoningDump: 0, malformed: 0, short: 0, questions: 0 },
);

console.log("");
console.log(`topics checked     : ${t.topics}`);
console.log(`missing content    : ${t.noContent}`);
console.log(`missing quiz       : ${t.noQuiz}`);
console.log(`known quiz gaps    : ${t.knownGaps}`);
console.log(`unusable slides    : ${t.unusable}`);
console.log(`reasoning dumps    : ${t.reasoningDump}`);
console.log(`slides under ${String(MIN_USABLE_SLIDE_LENGTH).padStart(3)} ch: ${t.short}`);
for (const r of reports) {
  for (const k of r.thinKeys) console.log(`    [${r.grade}] ${k}`);
}
console.log(`malformed questions: ${t.malformed}`);
console.log(`total questions    : ${t.questions}`);

const ok =
  t.noContent === 0 &&
  t.noQuiz === 0 &&
  t.unusable === 0 &&
  t.reasoningDump === 0 &&
  t.malformed === 0 &&
  reports.every((r) => r.distinctKeys === r.topics);
console.log(`\n${ok ? "PASS" : "FAIL"}`);
