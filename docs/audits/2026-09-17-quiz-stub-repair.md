# Repair of the unrenderable quiz questions ("the 23 stubs")

**Date:** 2026-09-17
**Scope:** `Quiz.questions` across the whole database (1,436 quiz rows, 8,987 questions)
**Result:** 0 unrenderable questions remain; 7 quiz rows repaired; 1 orphan material
repaired (see §7); no student record touched

---

## 1. What the defect was

`Quiz.questions` is untyped JSON. The generation path could be cut off mid-write, and
nothing validated the array before it was persisted, so a question could be stored with
only some of its fields.

The dangerous part is not that the question is invisible — it is that it was still
**graded**:

```
src/app/api/students/quizzes/[id]/grade/route.ts:160
  const correct = a.selectedIndex === q.correctIndex;
```

The grader reads `correctIndex` alone. A row with no `question` and no `options` still
has an index, so it still scores. The student could not see the question, could not
answer it, and was scored on it anyway.

## 2. The count was wrong: 24, not 23

`scripts/audit-quiz-integrity.ts` reported **23** broken questions in 5 materials. The
real number is **24 in 7 materials**.

The audit carried its own copy of the "is this question usable" rule, and that copy
skipped any question whose `options` was not an array — so it never looked at the one
row whose defect *was* the options. The emitter (`emit-content-bank.ts`) carried a third
copy, which had drifted the other way and let 10 broken questions through into the
generated bank.

**Fix:** the rule now exists once, as `questionRejection` in `src/lib/quiz-grading.ts`,
and the audit, the emitter and `saveQuiz` all call it. Three copies of a predicate is
three chances to disagree; the disagreement is what hid a question for months.

## 3. The three classes of damage

| Class | Count | What survived | How it was repaired |
|---|---|---|---|
| `null` entry | 12 | nothing | regenerated from the material's slide |
| no `question` | 11 | `explanation` + `correctIndex` | stem and distractors written around the preserved answer |
| `correctIndex` outside `options` | 1 | everything but the option list | the one option holding four quoted options was split into four |

The middle class is the one worth explaining. The stub's `explanation` is real content —
it states the answer in prose. So the repair keeps that answer and writes a question
whose answer it is, rather than inventing a new question and a new key. The model never
picks the answer; it only supplies wording.

## 4. What was rejected, and why

**Copying from a sibling quiz.** The first draft of the repair took a matching question
from another quiz on the same material. Measured: `same=0` on every candidate pair —
they are different quizzes with different questions. Cross-student donors were also
checked (`diff>0` on all). No valid donor exists, so writing from one would have been
fabrication. The tier was deleted rather than kept as a fallback.

**Trusting the model's answer.** Two guards, both deterministic:

- *Grounding.* The answer's content words must appear in its source — the `explanation`
  for the anchored tier, the slide for the slide tier — at ≥50%. Below that the answer
  is the model speaking from its own knowledge, which is exactly the failure mode a
  generated question must not have. Reported, not written.
- *Anti-duplication.* A new stem with ≥0.7 Jaccard overlap against any stem already in
  the quiz is rejected and retried. This caught a real case: one quiz was about to
  receive "Dasar hukum ... UUD 1945 Pasal 1 ayat (1)" three times out of four
  replacements. A duplicated question scores twice for one piece of knowledge.

**Changing `maxScore`.** Three of the seven rows carry `maxScore=50` against five
questions — a leftover of an older ten-points-per-question scheme. The current grader
ignores `Quiz.maxScore` entirely and derives the maximum from `questions.length`
(`grade/route.ts:173`), so this column is vestigial. It was left alone: rewriting it
would change no score, and silently mutating scoring metadata is not what this repair
is for.

## 5. Evidence

| Check | Result |
|---|---|
| `scripts/audit-quiz-integrity.ts` | 1,436 rows / 8,987 questions / **0 unrenderable** |
| `scripts/fix-quiz-stubs.ts --apply` | 7 rows written, **0 still unrenderable**, PASS |
| `scripts/verify-content-bank.ts` | 750 topics, 0 missing content, 0 missing quiz, **0 malformed questions**, 4,931 questions, PASS |
| `scripts/verify-regenerate-all.ts` | 3 grades `regen=replaced`, 750/750 filled, 0 probe students left, PASS |
| `scripts/verify-live-http.ts` | PASS — including all 7 repaired quizzes served with 5 questions each over production HTTPS |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 |
| `pm2 restart` + `/`, `/login`, `/login/student` | 200 / 200 / 200 |

### Bank movement

| Grade | Topics | Questions | Note |
|---|---|---|---|
| SD_5 | 130 → 130 | 1,123 → 1,127 | +4 IPAS |
| SMP_1 | 217 → **218** | 1,103 → 1,113 | Sejarah topic returns |
| SMA_2 | 402 → 402 | 2,691 → 2,691 | unaffected |
| **Total** | 750 | 4,917 → **4,931** | |

The Sejarah topic `Dampak Kedatangan Eropa pada Masyarakat Indonesia` had **all five**
of its questions unrenderable, so the emitter dropped the entire topic from the bank —
it was not a topic missing a quiz, it was a topic that had vanished. It now emits with
all five. Its entry has been removed from `KNOWN_QUIZ_GAPS` in both verify scripts; a
stale allowlist entry would have masked a future regression as a known gap.

## 6. The one record that was already scored

`7c95622c` (SYIFA001, IPAS / Perubahan Fisik) carries an attempt:

```
answers: []   score: 50   maxScore: 50   createdAt: 2026-07-21
```

Full marks, no answers recorded, four of the five questions invisible. **The attempt was
not touched.** It is a record of what happened, and deleting or restating a student's
result is a decision for the operator, not a side effect of a content repair.

## 7. The SMA_2 orphan row — repaired 2026-09-17

`13c766a1-…` (`SMA_2 / Matematika Tingkat Lanjut / Polinomial / Polinomial dan
Fungsi Polinomial`) was the last gap in `KNOWN_QUIZ_GAPS`: the only one of Shofi's 403
materials with `processedContent = null`, and the only one with no quiz. Those two facts
are one fact:

```
src/agents/assessment/generator.ts:31
  if (!material || !material.processedContent) throw new Error("… not processed")
```

`generateQuiz` refuses to run without `processedContent`, so a material whose content
generation never completed can never acquire a quiz. The topic then has no quiz in the
database, the emitter lifts quizzes from the database, and the bank is short one quiz —
which is what surfaced as a "known gap" rather than as the content defect underneath it.

Nothing was missing from the row: 6,545 chars of `rawContent` and a 3,014-char
`metadata.slide_sibi` were both intact. Only the processing step had never run.

**Repair** (`scripts/fix-orphan-material.ts`, dry run by default):

1. content through the same `content`-role call and prompt shape as
   `POST /api/curriculum/batch-generate`, so the row ends up shaped like its 402
   siblings. The SIBI text is passed as reference so the content describes this book's
   treatment of the topic rather than the model's own;
2. quiz through the real `generateQuiz()`, imported rather than reimplemented.

Guards: the generated content must share vocabulary with the row's own source (measured
93% on the dry run, 100% on the applied one) or it is reported and not written; slides
must pass `isUsableSlideText` and not be a reasoning dump.

| Field | Before | After |
|---|---|---|
| `processedContent` | `null` | 2,864 chars |
| `metadata.slides` | absent | 648 chars |
| `metadata.slide_sibi` | 3,014 chars | **3,014 chars — unchanged** |
| `rawContent` | 6,545 chars | 6,545 chars — unchanged |
| quizzes on the material | 0 | 1 (5 questions, 0 unrenderable) |
| `videoUrl` | null | YouTube search URL |

`slide_sibi` is preserved deliberately: it is the original SIBI text and the `?source=sibi`
view still serves it. The default slide view now prefers `metadata.slides`, which is the
documented precedence (`slide → slides → slide_moodle → slide_sibi`).

With this, `KNOWN_QUIZ_GAPS` is empty in both verify scripts. A stale entry there reports
a real regression as a known gap, so the set is now empty by design rather than by
accident — the two entries it used to hold were both symptoms of data defects, not topics
that genuinely cannot have a quiz.

### Bank totals after both repairs

| Grade | Topics | Quizzes | Questions |
|---|---|---|---|
| SD_5 | 130 | 130/130 | 1,127 |
| SMP_1 | 218 | 218/218 | 1,113 |
| SMA_2 | 402 | **402/402** | 2,696 |
| **Total** | 750 | 750/750 | **4,936** |

