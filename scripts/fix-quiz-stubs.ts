import "dotenv/config";
/**
 * Repair quiz questions that cannot be rendered.
 *
 * THE DEFECT
 * `Quiz.questions` is untyped JSON and the older generation path could be cut
 * off mid-write. Measured 2026-09-17, 24 questions of 8987 across 7 materials:
 *
 *   12  `null` array slots                 — nothing at all
 *   10  [correctIndex, explanation, questionIndex]
 *                                          — the answer and its explanation,
 *                                            but no question and no options
 *    1  one option holding three quoted     — `correctIndex` points past the end
 *       alternatives in a single string
 *    1  every option an empty string        — the CJK glyphs were lost
 *
 * Every grader reads `correctIndex` alone (src/lib/quiz-grading.ts:88,
 * src/bot/handlers/quiz.ts:421), so all of them still SCORE. The 10 explainable
 * ones are the dangerous case: the student is graded on a question that never
 * appears on screen.
 *
 * WHY THERE IS NO "COPY FROM A SIBLING QUIZ" TIER
 * The obvious shortcut — the same quiz exists elsewhere with the bad slots
 * filled — was measured and does not hold. For every broken quiz, every
 * candidate donor (same subject+topic+subTopic, or same subject+subTopic+length)
 * was compared on the renderable slots: `same=0, diff>0` in every case. The
 * candidates are different quizzes that happen to share a label, not copies.
 * Lifting a question off one would have written a stranger's question into this
 * material and been undetectable afterwards. Tier deleted.
 *
 * THE FIX — three repairs, each matched to the shape of the damage
 *
 *   deterministic  one option holds several quoted alternatives. Splitting it
 *                  restores the original option list, and the recorded
 *                  `correctIndex` — which was already pointing at the intended
 *                  position in that longer list — becomes valid again. No model
 *                  involved; verified against the question's own explanation.
 *
 *   explanation-anchored
 *                  the stub kept `explanation` + `correctIndex`. The explanation
 *                  states the fact the key encodes, so it is passed to 9Router as
 *                  ground truth and the model is asked to write the stem and the
 *                  distractors AROUND it. The model never chooses the answer, and
 *                  the correct option is placed at the stub's own `correctIndex`
 *                  so the recorded key position is preserved rather than invented.
 *                  The explanation is kept verbatim.
 *
 *   slide-only     a `null` slot preserved nothing. The question is written from
 *                  the material's slide text alone.
 *
 * Anything the model fails to produce is reported NEEDS-MANUAL and left alone —
 * never filled with a placeholder.
 *
 * SAFETY
 * - Dry run by default; nothing is written without `--apply`.
 * - Backs up every affected `Quiz` row to backups/ (gitignored) before writing.
 * - Restores each row's original question count — a repair that shrinks the quiz
 *   changes what the student is scored out of.
 * - Reports the `Attempt` count on the affected quizzes: if any exist, a student
 *   was already graded against a broken row and that must be said out loud
 *   rather than presented as a pure improvement.
 * - Verifies after the write that nothing unrenderable remains, and exits
 *   non-zero if it does.
 *
 * Usage:
 *   node scripts/run-ts.mjs scripts/fix-quiz-stubs.ts            # dry run
 *   node scripts/run-ts.mjs scripts/fix-quiz-stubs.ts --apply    # writes
 *   node scripts/run-ts.mjs scripts/fix-quiz-stubs.ts --only <quizIdPrefix>
 */
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { questionRejection } from "@/lib/quiz-grading";
import { resolveSlideMarkdown } from "@/lib/content/slide-content";

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const ONLY = (() => {
  const i = ARGS.indexOf("--only");
  return i >= 0 ? (ARGS[i + 1] ?? "") : "";
})();
/** `--plan <file>`: dry run writes the plan here, --apply reads it back. */
const PLAN = (() => {
  const i = ARGS.indexOf("--plan");
  return i >= 0 ? (ARGS[i + 1] ?? "") : "";
})();

const BASE_URL = process.env.LLM_BASE_URL || "http://localhost:20128/v1";
const API_KEY = (process.env.LLM_API_KEY || "").replace(/["'\r]/g, "");
const MODEL = "hermes";
const TIMEOUT_MS = 120_000;

type Opt = { text?: string; isCorrect?: boolean };
type Q = {
  question?: string;
  options?: (string | Opt)[];
  correctIndex?: number;
  explanation?: string;
  difficulty?: string;
  questionIndex?: number;
};

/** The text of a single option, whatever shape it was stored in. */
function optText(o: string | Opt | null | undefined): string {
  if (typeof o === "string") return o;
  if (o && typeof o === "object" && typeof o.text === "string") return o.text;
  return "";
}

/** The stub's explanation, which states the fact the answer key encodes. */
function groundTruth(q: Q): string {
  return typeof q.explanation === "string" ? q.explanation.trim() : "";
}

/**
 * A stored option list that is really several options concatenated.
 *
 * 79bb5d34[#3] holds one string with three single-quoted alternatives and a
 * second option, so `correctIndex: 2` points past the end. The intended list was
 * four items with the third one correct — which is exactly what the question's
 * own explanation says. Returns the split list, or null when the shape does not
 * apply.
 */
function expandQuotedOptions(options: (string | Opt)[]): string[] | null {
  const texts = options.map(optText);
  if (texts.length !== 2) return null;
  const parts = texts[0].match(/'[^']*'/g);
  if (!parts || parts.length < 3) return null;
  const rest = texts.slice(1).filter((t) => t.trim().length > 0);
  const expanded = [...parts.map((p) => p.trim()), ...rest];
  return expanded.length === 4 ? expanded : null;
}

/**
 * Ask the model to write the stem and the distractors around an answer we
 * already hold. The model never picks the key.
 *
 * `avoid` carries the question stems already present in this quiz — the intact
 * ones plus anything generated earlier in this run. Without it the model, asked
 * four times about the same slide, returns the same question four times: one
 * run produced "Dasar hukum ... UUD 1945 Pasal 1 ayat (1)" as three of the four
 * replacements for a single quiz.
 */
async function generate(
  mode: "anchored" | "slide",
  ctx: { answer: string; explanation: string; slide: string; subTopic: string; avoid: string[] },
  strict = false,
): Promise<{ question: string; correct: string; distractors: string[] } | null> {
  const lines = [
    "Kamu menulis soal pilihan ganda untuk siswa Indonesia.",
    "",
    `Sub-topik: ${ctx.subTopic}`,
    "",
    "Materi:",
    ctx.slide.slice(0, 2500),
    "",
  ];
  if (ctx.avoid.length) {
    lines.push(
      strict
        ? "Percobaan sebelumnya DITOLAK karena mengulang pertanyaan yang sudah ada. Kali ini WAJIB membahas hal yang benar-benar berbeda:"
        : "Pertanyaan berikut SUDAH ADA di kuis ini. Jangan mengulanginya, dan jangan menanyakan hal yang sama dengan kata lain:",
      ...ctx.avoid.slice(-8).map((q) => `- ${q}`),
      "",
    );
  }
  if (mode === "anchored") {
    lines.push(
      "SOAL INI SUDAH PUNYA KUNCI JAWABAN YANG BENAR. Kunci itu WAJIB jadi salah satu pilihan.",
      `Penjelasan kunci: ${ctx.explanation.slice(0, 600)}`,
      "",
    );
    if (strict) {
      lines.push(
        "PENTING: pertanyaanmu WAJIB tentang isi penjelasan kunci di ATAS, bukan tentang bagian lain dari materi.",
        "Kalau penjelasan kunci membahas budaya, tanyakan budaya. Jangan menanyakan ekonomi, politik, atau hal lain.",
        "",
      );
    }
    lines.push(
      "Tugasmu:",
      "1. Tulis teks pilihan jawaban yang benar (maks 12 kata), sesuai penjelasan di atas.",
      "2. Tulis pertanyaannya, yang jawabannya adalah pilihan benar itu.",
      "3. Tulis tiga pilihan pengecoh yang salah.",
      "",
      'Balas JSON saja, tanpa markdown: {"question":"...","correct":"...","distractors":["...","...","..."]}',
    );
  } else {
    lines.push(
      "Tulis satu pertanyaan pilihan ganda yang jawabannya bisa ditemukan di materi di atas.",
      "Pilihan benar maks 12 kata.",
      "",
      'Balas JSON saja, tanpa markdown: {"question":"...","correct":"...","distractors":["...","...","..."]}',
    );
  }
  const prompt = lines.join("\n");

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], max_tokens: 800 }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        console.warn(`    LLM HTTP ${res.status} (attempt ${attempt})`);
        continue;
      }
      // 9Router terminates the body with a `data: [DONE]` sentinel, so
      // `res.json()` throws on the trailing bytes. Handle both that and the
      // streaming form (one `data: {...}` chunk per line).
      const raw = await res.text();
      let text = raw;
      if (raw.trimStart().startsWith("data:")) {
        text = raw
          .split(/\r?\n/)
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim())
          .filter((l) => l && l !== "[DONE]")
          .map((l) => {
            try {
              return JSON.parse(l).choices?.[0]?.delta?.content ?? "";
            } catch {
              return "";
            }
          })
          .join("");
      } else {
        const cut = raw.indexOf("data: [DONE]");
        text = cut >= 0 ? raw.slice(0, cut) : raw;
      }
      let envelope: { choices?: { message?: { content?: string } }[] };
      try {
        envelope = JSON.parse(text.trim());
      } catch {
        console.warn(`    LLM body did not parse (attempt ${attempt}): ${text.slice(0, 140)}`);
        continue;
      }
      const content = envelope.choices?.[0]?.message?.content ?? "";
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start < 0 || end <= start) {
        console.warn(`    LLM returned no JSON (attempt ${attempt}): ${cleaned.slice(0, 120)}`);
        continue;
      }
      let parsed: { question?: string; correct?: string; distractors?: string[] };
      try {
        parsed = JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        console.warn(`    LLM JSON did not parse (attempt ${attempt})`);
        continue;
      }
      const question = typeof parsed.question === "string" ? parsed.question.trim() : "";
      const correct = typeof parsed.correct === "string" ? parsed.correct.trim() : "";
      const distractors = Array.isArray(parsed.distractors)
        ? parsed.distractors
            .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
            .map((d) => d.trim())
        : [];
      if (!question || !correct || distractors.length < 3) {
        console.warn(`    LLM answer incomplete (q=${question.length} c=${correct.length} d=${distractors.length})`);
        continue;
      }
      return { question, correct, distractors: distractors.slice(0, 3) };
    } catch (e) {
      console.warn(`    LLM call failed (attempt ${attempt}): ${String(e).slice(0, 120)}`);
    }
  }
  return null;
}

/** Lowercased content words, for comparing two question stems. */
const STOP = new Set([
  "yang","dan","atau","di","ke","dari","pada","adalah","apa","apakah","dengan","untuk","dalam","ini","itu","oleh",
  "menurut","berikut","tidak","bukan","akan","telah","sudah","agar","karena","jika","saat","ketika","bagaimana",
  "sebuah","para","lebih","paling","dapat","bisa","harus","materi","soal","contoh","tersebut",
]);
function words(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      // Keep numbers: a numeric answer ("±5,1 juta km²") loses every token
      // except "juta" if digits are dropped, which then makes any other numeric
      // distractor look like a duplicate of it.
      .filter((w) => (w.length > 3 || /\d/.test(w)) && !STOP.has(w)),
  );
}

/** Jaccard overlap of two stems' content words. */
function stemOverlap(a: string, b: string): number {
  const A = words(a);
  const B = words(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Letters and digits only, case-folded — for exact-ish option comparison. */
function normOption(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

type Tier = "deterministic" | "anchored" | "slide" | "manual";

type Fix = {
  quizId: string;
  index: number;
  tier: Tier;
  note: string;
  /** The repaired question, ready to store. */
  next: Record<string, unknown> | null;
};

/**
 * Put the correct option at the stub's own recorded index, or 0 when unusable.
 *
 * Preserving the index matters for the anchored tier: the stub's `correctIndex`
 * was written by whatever generated the question originally, so honouring it
 * keeps the recorded answer position instead of inventing a new one.
 * Distractors that merely restate the correct option are dropped — a question
 * with two right answers has no right answer.
 */
function assemble(
  correct: string,
  distractors: string[],
  preferIndex: number | undefined,
): { options: string[]; correctIndex: number } | null {
  const target = normOption(correct);
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const d of distractors.map((x) => x.trim())) {
    if (d.length === 0) continue;
    const nd = normOption(d);
    if (nd.length === 0) continue;
    // A distractor that IS the answer, or that restates the whole answer plus
    // an extra claim, gives the question two right answers. Only reject those;
    // anything looser starts discarding legitimate numeric near-misses
    // ("±1,9 juta km²" against "±5,1 juta km²").
    if (target.length > 0 && nd === target) continue;
    if (target.length > 0 && nd.includes(target) && target.length / nd.length > 0.8) continue;
    if (seen.has(nd)) continue;
    seen.add(nd);
    clean.push(d);
  }
  if (clean.length < 3) return null;
  const at = typeof preferIndex === "number" && preferIndex >= 0 && preferIndex <= 3 ? preferIndex : 0;
  const options = [...clean.slice(0, 3)];
  options.splice(at, 0, correct.trim());
  return { options, correctIndex: at };
}

async function main(): Promise<void> {
  console.log(APPLY ? "MODE: apply (rows will be written)" : "MODE: dry run (nothing is written)");
  console.log("");

  const quizzes = await prisma.quiz.findMany({
    select: {
      id: true,
      studentId: true,
      materialId: true,
      questions: true,
      material: { select: { subject: true, topic: true, subTopic: true, metadata: true } },
    },
  });

  const broken = quizzes
    .map((q) => {
      const arr = Array.isArray(q.questions) ? (q.questions as unknown[]) : [];
      const bad = arr.map((raw, i) => ({ raw, i })).filter(({ raw }) => questionRejection(raw) !== null);
      return { quiz: q, arr, bad };
    })
    .filter((e) => e.bad.length > 0 && (!ONLY || e.quiz.id.startsWith(ONLY)));

  if (broken.length === 0) {
    console.log("No unrenderable questions found. Nothing to do.");
    await prisma.$disconnect();
    return;
  }

  // A dry run generates the plan and writes it to disk; `--apply --plan <file>`
  // consumes that file instead of calling the model again. Without this the
  // write would depend on a second round of generation, so what gets reviewed
  // and what gets written could differ.
  const fixes: Fix[] = [];
  const loadedPlan = APPLY && PLAN && fs.existsSync(PLAN) ? (JSON.parse(fs.readFileSync(PLAN, "utf8")) as { fixes: Fix[] }) : null;
  if (loadedPlan) {
    fixes.push(...loadedPlan.fixes);
    console.log(`loaded plan ${PLAN}: ${fixes.length} fix(es) — no model calls`);
  } else for (const { quiz, arr, bad } of broken) {
    const m = quiz.material;
    const md = (m?.metadata ?? {}) as Record<string, unknown>;
    const slide = resolveSlideMarkdown(md, "sibi") ?? "";
    const subTopic = m?.subTopic ?? m?.topic ?? "";
    console.log(`\n### ${quiz.id.slice(0, 8)}  ${m?.subject} / ${subTopic.slice(0, 52)}`);
    console.log(`    ${arr.length} questions, ${bad.length} unrenderable, slide ${slide.length} chars`);

    // Stems already in this quiz: the intact questions plus every replacement
    // written so far. Each generated question is checked against these so one
    // slide cannot yield the same question twice.
    const used: string[] = arr
      .map((raw) => (typeof (raw as Q)?.question === "string" ? String((raw as Q).question) : ""))
      .filter((s) => s.length > 0);

    for (const { raw, i } of bad) {
      const why = questionRejection(raw) ?? "?";
      const stub = (raw ?? {}) as Q;
      console.log(`  [#${i}] ${why}`);

      // ── deterministic: one option is several options concatenated ──────
      if (Array.isArray(stub.options)) {
        const expanded = expandQuotedOptions(stub.options);
        if (expanded) {
          const ci = stub.correctIndex;
          if (typeof ci === "number" && ci >= 0 && ci < expanded.length) {
            console.log(`    → deterministic: split 1 option into ${expanded.length}; key stays at ${ci} = ${expanded[ci]}`);
            fixes.push({
              quizId: quiz.id,
              index: i,
              tier: "deterministic",
              note: `split → ${expanded.length} options`,
              next: {
                question: String(stub.question ?? "").trim(),
                options: expanded,
                correctIndex: ci,
                explanation: groundTruth(stub),
                ...(stub.difficulty ? { difficulty: stub.difficulty } : {}),
              },
            });
            continue;
          }
        }
      }

      if (!slide) {
        console.log(`    !! no slide text — cannot generate`);
        fixes.push({ quizId: quiz.id, index: i, tier: "manual", note: "no slide text", next: null });
        continue;
      }

      const explanation = groundTruth(stub);
      const mode: "anchored" | "slide" = explanation ? "anchored" : "slide";
      console.log(`    → ${mode}: ${explanation ? "answer preserved from explanation" : "null slot, nothing preserved"}`);

      let gen: Awaited<ReturnType<typeof generate>> = null;
      for (let attempt = 1; attempt <= 3 && !gen; attempt++) {
        gen = await generate(mode, { answer: explanation, explanation, slide, subTopic, avoid: used }, attempt > 1);
        if (!gen) continue;
        // Reject a stem that repeats one already in this quiz, rather than
        // writing a duplicate. A duplicate question is worse than a missing one:
        // it scores twice for the same knowledge and looks intentional.
        const clash = used.find((u) => stemOverlap(u, gen!.question) >= 0.7);
        if (clash) {
          console.log(`      ! duplicate of "${clash.slice(0, 60)}" (attempt ${attempt}) — retrying`);
          gen = null;
        }
      }
      if (!gen) {
        fixes.push({ quizId: quiz.id, index: i, tier: "manual", note: `${mode} generation failed or duplicated`, next: null });
        continue;
      }
      used.push(gen.question);
      const assembled = assemble(gen.correct, gen.distractors, stub.correctIndex);
      if (!assembled) {
        console.log(`      ! distractors unusable (duplicate/empty) — NEEDS MANUAL`);
        fixes.push({ quizId: quiz.id, index: i, tier: "manual", note: "distractors unusable", next: null });
        continue;
      }

      // Grounding guard. For the anchored tier the explanation is the source of
      // truth, so the answer must be traceable to it; for the slide tier the
      // slide is. An answer whose content words appear in neither is the model
      // answering from its own knowledge, which is exactly the failure mode a
      // generated question must not have — a plausible question with a key the
      // material never states. Reported, not written.
      const source = mode === "anchored" ? explanation : slide;
      const srcWords = words(source);
      const answerWords = words(gen.correct);
      const grounded = answerWords.size === 0 ? 0 : [...answerWords].filter((w) => srcWords.has(w)).length / answerWords.size;
      if (answerWords.size > 0 && grounded < 0.5) {
        console.log(`      ! answer not grounded in the ${mode === "anchored" ? "explanation" : "slide"} (${Math.round(grounded * 100)}%) — NEEDS MANUAL`);
        fixes.push({ quizId: quiz.id, index: i, tier: "manual", note: `ungrounded answer (${Math.round(grounded * 100)}%)`, next: null });
        continue;
      }

      const { options, correctIndex } = assembled;
      console.log(`      Q: ${gen.question.slice(0, 88)}`);
      console.log(`      A[${correctIndex}]: ${gen.correct}`);
      fixes.push({
        quizId: quiz.id,
        index: i,
        tier: mode,
        note: `key at ${correctIndex}`,
        next: {
          question: gen.question,
          options,
          correctIndex,
          // Keep the stub's own explanation verbatim — it is real content and
          // the only surviving statement of what the answer means.
          explanation: explanation || "",
          ...(stub.difficulty ? { difficulty: stub.difficulty } : {}),
        },
      });
    }
  }

  // ── Report ──────────────────────────────────────────────────────────
  const byTier = new Map<string, number>();
  for (const f of fixes) byTier.set(f.tier, (byTier.get(f.tier) ?? 0) + 1);
  console.log(`\n${"─".repeat(78)}`);
  console.log(`plan: ${fixes.length} question(s)`);
  for (const [t, n] of [...byTier.entries()].sort()) console.log(`  ${String(n).padStart(4)}  ${t}`);

  const manual = fixes.filter((f) => f.tier === "manual");
  if (manual.length) {
    console.log(`\nNEEDS MANUAL REVIEW (not written):`);
    for (const f of manual) console.log(`  ${f.quizId.slice(0, 8)}[#${f.index}]  ${f.note}`);
  }

  // Blast radius: was any student already graded against these rows?
  const quizIds = [...new Set(fixes.map((f) => f.quizId))];

  // Persist the plan so `--apply` writes exactly what was reviewed.
  const planPath = PLAN || path.join(process.cwd(), "backups", `quiz-stub-plan-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  if (!APPLY) {
    fs.mkdirSync(path.dirname(planPath), { recursive: true });
    fs.writeFileSync(planPath, JSON.stringify({ generatedAt: new Date().toISOString(), fixes }, null, 2));
    console.log(`\nplan written → ${planPath}`);
    console.log(`apply with: node scripts/run-ts.mjs scripts/fix-quiz-stubs.ts --apply --plan ${planPath}`);
  }
  const attempts = await prisma.attempt.count({ where: { quizId: { in: quizIds } } });
  console.log(`\nattempts on the ${quizIds.length} affected quiz(zes): ${attempts}`);
  if (attempts > 0) {
    for (const id of quizIds) {
      const n = await prisma.attempt.count({ where: { quizId: id } });
      if (n > 0) console.log(`  ${id.slice(0, 8)}: ${n} attempt(s) — scores already recorded against a broken row`);
    }
  }

  if (!APPLY) {
    console.log(`\nDry run complete. Re-run with --apply to write.`);
    await prisma.$disconnect();
    return;
  }

  // ── Backup ──────────────────────────────────────────────────────────
  const dir = path.join(process.cwd(), "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(dir, `quiz-stubs-${stamp}.json`);
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      quizzes.filter((q) => quizIds.includes(q.id)).map((q) => ({ id: q.id, materialId: q.materialId, questions: q.questions })),
      null,
      2,
    ),
  );
  console.log(`\nbackup → ${backupPath}`);

  // ── Write ───────────────────────────────────────────────────────────
  let written = 0;
  for (const quizId of quizIds) {
    const quiz = quizzes.find((q) => q.id === quizId)!;
    const arr = (Array.isArray(quiz.questions) ? quiz.questions : []) as unknown[];
    const next = [...arr];
    for (const f of fixes.filter((x) => x.quizId === quizId && x.next)) next[f.index] = f.next;

    // Restore the original length. A repair that changes the question count
    // changes what the student is scored out of, so an unrepairable slot aborts
    // the row rather than being dropped quietly.
    const finalArr = next.filter((raw) => questionRejection(raw) === null);
    const before = arr.filter((raw) => questionRejection(raw) === null).length;
    if (finalArr.length !== arr.length) {
      console.log(`  !! ${quizId.slice(0, 8)}: ${arr.length} → ${finalArr.length} questions — skipping write`);
      continue;
    }
    if (finalArr.length !== before) {
      // Only `questions` is written. `Quiz.maxScore` is deliberately left
      // alone: the current grader derives the maximum from `questions.length`
      // (src/app/api/students/quizzes/[id]/grade/route.ts writes
      // `maxScore: questions.length` onto the Attempt), so this column is
      // vestigial. Three of these rows carry maxScore=50 against five
      // questions — a leftover of an older ten-points-per-question scheme.
      // Rewriting it to 5 would not change any score the student sees, but it
      // would be a silent mutation of scoring metadata, which is not what this
      // repair is for.
      await prisma.quiz.update({
        where: { id: quizId },
        data: { questions: finalArr as never },
      });
      written++;
      console.log(`  ok ${quizId.slice(0, 8)}: ${before}/${arr.length} → ${finalArr.length}/${arr.length} renderable`);
    }
  }

  // ── Verify ──────────────────────────────────────────────────────────
  const after = await prisma.quiz.findMany({ where: { id: { in: quizIds } }, select: { id: true, questions: true } });
  let remaining = 0;
  for (const q of after) {
    const arr = Array.isArray(q.questions) ? (q.questions as unknown[]) : [];
    remaining += arr.filter((raw) => questionRejection(raw) !== null).length;
  }
  console.log(`\nrows written      : ${written}`);
  console.log(`still unrenderable: ${remaining}`);
  if (remaining !== 0) {
    console.error(`FAIL: ${remaining} unrenderable question(s) remain — the write did not take.`);
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`PASS`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
