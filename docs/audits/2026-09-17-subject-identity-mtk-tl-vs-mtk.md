# "Matematika" vs "Matematika Tingkat Lanjut" — two courses, one matcher

Date: 2026-09-17
Trigger: user report — the two must be distinguished, fix it for Raihan.

## Root cause

`sim()` in `src/lib/prosem-match.ts` gives a substring match a flat **0.85**:

```ts
const boost = na.includes(nb) || nb.includes(na) ? 0.85 : 0;
return Math.max(base, boost);
```

`SIM_THRESHOLD` is **0.84**. So for every pair of subject names where one contains
the other, `sim` returns 0.85 — one hundredth above the threshold:

```
sim("Matematika", "Matematika Tingkat Lanjut") = 0.850   >= 0.84  → "same subject"
sim("Matematika", "Matematika Penalaran")      = 0.850   >= 0.84  → "same subject"
```

SMA XI runs three separate mathematics courses, each with its own ProSem file:

| ProSem file | `subject` field | entries |
|---|---|---|
| `xi_matematika_ganjil.json` | `Matematika` | 27 |
| `xi_matematika_tingkat_lanjut_ganjil.json` | `Matematika Tingkat Lanjut` | 22 |
| `xi_matematika_penalaran_ganjil.json` | `Matematika Penalaran` | — |

They are not interchangeable. "Matriks" is a `Matematika` chapter, "Polinomial"
is a `Matematika Tingkat Lanjut` chapter, and a student enrolled in one must
never be served the other's material.

### Proof the collision was real, not theoretical

`audit-reports/prosem-coverage.json` before the fix, subject
`SHOFI001 · XI · Matematika Tingkat Lanjut`: **0 of 14 sessions covered**, and
`matematika_penalaran` showed `covered=12 missing=0`. The MTL sessions were being
scored against the *other courses'* pools.

## Fix

New exports in `src/lib/prosem-match.ts`, and one shared rule used by both
consumers:

```ts
export const SUBJECT_QUALIFIER = /\b(tingkat lanjut|penalaran|lanjutan|advanced)\b/;
export function isQualifiedSubject(s: string): boolean;
export function subjectsEquivalent(a: string, b: string): boolean;   // qualifier-aware
export function acceptableSubjects(prosemSubject: string): string[]; // alias union
export function subjectSatisfies(prosemSubject: string, materialSubject: string): boolean;
```

`subjectsEquivalent` compares the qualifier first: two names match only when
*both* carry a qualifier or *neither* does. `SIM_THRESHOLD` was deliberately left
at 0.84 — raising it would break legitimate label matches such as
"Gaya ke Atas" / "Gaya ke Atas (Archimedes)".

## The second, independent bug this uncovered

`scripts/sync-weekorder-prosem.ts` filtered the material pool with

```ts
const mats = materials.filter((m) => m.subject === subject);   // exact
```

while `scripts/prosem-coverage.ts` used the alias union. **Two different rules
for the same question.** For a VII student the ProSem says `Biologi` / `Fisika` /
`Sejarah` but the curriculum stores `IPA` / `IPS`, so the sync script matched
zero rows for Biologi and Sejarah:

```
Raihan (SMP_1) BEFORE:  Biologi: materials=0  ...  (skipped entirely)
Raihan (SMP_1) BEFORE:  Sejarah: materials=0  ...  (skipped entirely)
```

Their `weekOrder` was therefore never assigned, while the coverage report called
those same sessions covered. Both scripts now call `subjectSatisfies`.

```
Raihan (SMP_1) AFTER:   ~ Biologi: pool = IPA (31 material)
                        ~ Fisika: pool = Fisika + IPA (49 material)
                        ~ Sejarah: pool = IPS (14 material)
                        Biologi: materials=31 prosem-sesi=10 matched-entries=0
                        Sejarah: materials=14 prosem-sesi=3  matched-entries=1 updates=1
```

## Verification

`scripts/check-subject-identity.ts` — 22/22 PASS, including

```
PASS  subjectsEquivalent(Matematika , Matematika Tingkat Lanjut)
PASS  subjectsEquivalent(Matematika , Matematika Penalaran)
PASS  subjectsEquivalent(Bahasa Inggris , Bahasa Inggris Tingkat Lanjut)
PASS  subjectSatisfies(Biologi, IPA)      — alias union still works
PASS  subjectSatisfies(Matematika, IPA)   — no alias bridges unrelated subjects
PASS  subjectSatisfies(IPA, Biologi)      — the alias relation is one-way
      sim("Matematika", "Matematika Tingkat Lanjut") = 0.850  (the trap, documented)
```

Coverage before/after the fix — **zero rows changed verdict in the wrong
direction**:

```
SHOFI001 Matematika Tingkat Lanjut / Akar-Akar Persamaan Polinomial   MISSING -> CHAPTER
SHOFI001 Matematika Tingkat Lanjut / Operasi Aljabar pada Polinomial  MISSING -> CHAPTER
SHOFI001 Matematika Tingkat Lanjut / Polinomial dan Fungsi Polinomial MISSING -> covered

8 rows changed total; 0 newly MISSING.
XII totals: missing 42 -> 39, matched 151 -> 152, CHAPTER 18 -> 20
```

`Raihan` XI pools unchanged: `BIOLOGI` still pools `IPA`, `Fisika` still pools
`Fisika + IPA`.

## Still open — Raihan has two curricula and only he has two

```
RAIHAN001:  curriculum v1 (2026-07-12)  264 materials
            curriculum v3 (2026-07-14)  228 materials
```

46 of 228 v3 rows are duplicates of v1 rows (same topic + subTopic), 129 pairs
across his whole curriculum. He is the only student in this state — every other
student has exactly one curriculum.

Consequences today:

- `/api/students/subjects` unions over **all** curricula, so Raihan's subject
  palette lists 15 subjects instead of 12. `Biologi`, `Sejarah`, `Geografi` come
  from v1 alone; his VII ProSem files are the source of the other twelve.
- The subject page (`curriculum.findMany` ordered `createdAt desc`, then flatten,
  dedupe by id) shows **both** v1 and v3 rows for every v3 subject — 36 Fisika
  rows where 18 exist.
- `sync-weekorder-prosem.ts` and `prosem-coverage.ts` both take
  `orderBy version desc`, i.e. v3 only. That is the correct choice, and it means
  v1 is dead weight either way.

v1 and v3 are **not** the same week mapping (e.g. `Bilangan Bulat` is w1 in v3,
w999 in v1), so this is not a merge — it is a decision about the stale curriculum.
Not executed; awaiting direction. No `DELETE` has been run.
