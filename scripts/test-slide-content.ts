/**
 * Tests for the slide-content validator (ledger B-02).
 *
 * Run: npx tsx scripts/test-slide-content.ts
 *
 * Two layers:
 *   1. synthetic cases — the detector's contract
 *   2. live DB sweep — the detector must flag every contaminated row and must
 *      NOT flag clean slide decks (false positives would blank real content)
 */

import { prisma } from "../src/lib/prisma";
import {
  isLlmReasoningDump,
  isUsableSlideText,
  isUsableMindmap,
  resolveSlideMarkdown,
  resolveMindmap,
  candidateText,
} from "../src/lib/content/slide-content";

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${ok ? "" : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`);
}

// The exact shape that shipped to students.
const REAL_DUMP = `Thinking. 1.  **Analyze the Request:**
    *   Goal: Generate 3-5 markdown slides in Bahasa Indonesia.
    *   Topic: "Teks Prosedur - Struktur Prosedur"
    *   Target Audience: SMP_1 level
    *   Constraint: Return slide markdown only.

2.  **Deconstruct the Topic:**
    *   What is Teks Prosedur?`;

const CLEAN_DECK = `## 📚 Struktur Teks Prosedur

Teks prosedur berisi petunjuk langkah demi langkah untuk melakukan sesuatu.

**Struktur teks prosedur:**

1. **Tujuan** — menjelaskan apa yang akan dicapai atau dilakukan.
2. **Bahan/Alat** — menyebutkan material atau perlengkapan yang dibutuhkan.
3. **Langkah-langkah** — urutan kegiatan yang sistematis dan berurutan.`;

console.log("=== 1. detektor (sintetis) ===");
check("dump nyata terdeteksi", isLlmReasoningDump(REAL_DUMP), true);
check("prefix 'Thinking.' + analyze", isLlmReasoningDump("Thinking.\nAnalyze the Request:\nGoal: x"), true);
check("'Target Audience:' + 'Constraint:'", isLlmReasoningDump("Foo bar.\nTarget Audience: SMP\nConstraint: none"), true);
check("'Let me think' + 'Analyze the Request'", isLlmReasoningDump("Let me think about this. Analyze the Request."), true);
check("slide bersih TIDAK terdeteksi", isLlmReasoningDump(CLEAN_DECK), false);
check("teks Indonesia biasa TIDAK terdeteksi", isLlmReasoningDump("Kalor adalah energi yang berpindah dari benda bersuhu tinggi ke rendah."), false);
check("null aman", isLlmReasoningDump(null), false);
check("string kosong aman", isLlmReasoningDump("   "), false);

console.log("\n=== 2. isUsableSlideText ===");
check("dump = tidak layak", isUsableSlideText(REAL_DUMP), false);
check("slide bersih = layak", isUsableSlideText(CLEAN_DECK), true);
check("terlalu pendek = tidak layak", isUsableSlideText("## Kalor\n\nSingkat."), false);

console.log("\n=== 3. resolveSlideMarkdown — fallback melewati dump ===");
check(
  "slide_sibi dump -> jatuh ke metadata.slide",
  resolveSlideMarkdown({ slide_sibi: REAL_DUMP, slide: CLEAN_DECK }, "sibi"),
  CLEAN_DECK.trim(),
);
check(
  "slide_sibi bersih -> dipakai",
  resolveSlideMarkdown({ slide_sibi: CLEAN_DECK, slide: "## lain\n\n" + "x".repeat(200) }, "sibi"),
  CLEAN_DECK.trim(),
);
check(
  "slide_sibi dump, slide pendek, slides array -> pakai slides",
  resolveSlideMarkdown({ slide_sibi: REAL_DUMP, slide: "pendek", slides: [{ id: 1, title: "T" }] }, "sibi"),
  JSON.stringify([{ id: 1, title: "T" }]),
);
check("semua kandidat buruk -> null", resolveSlideMarkdown({ slide_sibi: REAL_DUMP, slide: "x" }, "sibi"), null);
check("metadata null -> null", resolveSlideMarkdown(null, "sibi"), null);

console.log("\n=== 5. mindmap — array JSON juga divalidasi ===");
const CLEAN_MINDMAP = [
  {
    id: "0",
    label: "Struktur Bumi",
    children: [
      { id: "1", label: "Kerak Bumi", children: [] },
      { id: "2", label: "Mantel Bumi", children: [] },
      { id: "3", label: "Inti Bumi", children: [] },
    ],
  },
];
// The exact node labels that reached students via the material API.
const DIRTY_MINDMAP = [
  {
    id: "0",
    label: "Struktur Bumi",
    children: [
      { id: "1", label: "Thinking. 1.  **Analyze the Request:**", children: [] },
      { id: "2", label: "Target: Mindmap outline.", children: [] },
      { id: "3", label: "Format: Hierarchical, indented dashes, 2 spaces per level.", children: [] },
    ],
  },
];

check("candidateText membedah label array", candidateText(DIRTY_MINDMAP).includes("Analyze the Request"), true);
check("mindmap bersih = layak", isUsableMindmap(CLEAN_MINDMAP), true);
check("mindmap kotor = TIDAK layak", isUsableMindmap(DIRTY_MINDMAP), false);
check("mindmap null = tidak layak", isUsableMindmap(null), false);
check("mindmap array kosong = tidak layak", isUsableMindmap([]), false);
check("node tunggal tanpa cabang = tidak layak", isUsableMindmap([{ id: "0", label: "Akar" }]), false);
check(
  "mindmap_sibi kotor -> jatuh ke metadata.mindmap",
  resolveMindmap({ mindmap_sibi: DIRTY_MINDMAP, mindmap: CLEAN_MINDMAP }, "sibi"),
  JSON.stringify(CLEAN_MINDMAP),
);
check(
  "mindmap_sibi bersih -> dipakai",
  resolveMindmap({ mindmap_sibi: CLEAN_MINDMAP, mindmap: [{ id: "9", label: "lain", children: [] }] }, "sibi"),
  JSON.stringify(CLEAN_MINDMAP),
);
check("mindmap semua kotor -> null", resolveMindmap({ mindmap_sibi: DIRTY_MINDMAP }, "sibi"), null);
check(
  "slides array kotor tidak disajikan",
  resolveSlideMarkdown({ slides: DIRTY_MINDMAP.map((n) => ({ ...n, label: "Thinking. 1. **Analyze the Request:**" })) }, "sibi"),
  null,
);

console.log("\n=== 4. sapuan DB langsung ===");
async function dbSweep() {
  const rows = await prisma.$queryRawUnsafe<{ id: string; metadata: Record<string, unknown> | null }[]>(
    `SELECT id, metadata FROM "Material" WHERE metadata->>'slide_sibi' IS NOT NULL`,
  );

  let contaminated = 0;
  let clean = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let recoverable = 0;
  let unrecoverable = 0;
  const unrecoverableIds: string[] = [];

  for (const r of rows) {
    const sibi = (r.metadata ?? {})["slide_sibi"] as string | null;
    const flagged = isLlmReasoningDump(sibi);
    // Ground truth, deliberately a DIFFERENT signal from the detector: a dump
    // always talks about the generation task in English meta-language, which
    // never occurs in Indonesian teaching slides.
    const truth =
      /\bthe user wants\b|analy[sz]e the request|deconstruct the|identify the goal|<think>|^\s*thinking\.|\blet me (?:think|analy[sz]e|identify|extract|break|determine)\b/im.test(
        sibi ?? "",
      );
    if (truth) contaminated++;
    else clean++;
    if (flagged && !truth) falsePositive++;
    if (!flagged && truth) falseNegative++;

    if (truth) {
      // Use the real resolver, not just `metadata.slide` — it also considers the
      // `slides` array, which is what the API will serve.
      const resolved = resolveSlideMarkdown(r.metadata, "sibi");
      if (resolved) recoverable++;
      else {
        unrecoverable++;
        unrecoverableIds.push(r.id);
      }
    }
  }

  console.log(`  baris diperiksa        : ${rows.length}`);
  console.log(`  terkontaminasi (truth) : ${contaminated}`);
  console.log(`  bersih                 : ${clean}`);
  console.log(`  false positive         : ${falsePositive}`);
  console.log(`  false negative         : ${falseNegative}`);
  console.log(`  bisa dipulihkan        : ${recoverable}`);
  console.log(`  tanpa sumber bersih    : ${unrecoverable}`);
  if (unrecoverableIds.length) console.log(`  id tanpa pengganti     : ${unrecoverableIds.join(", ")}`);
  check("false positive = 0", falsePositive, 0);
  check("false negative = 0", falseNegative, 0);
  // 2 placeholder rows (Sejarah, weekOrder=999) carry a dump but no clean
  // replacement anywhere — the remediation clears slide_sibi on those.
  check("tanpa sumber bersih <= 2", unrecoverable <= 2, true);

  // --- mindmap sweep -------------------------------------------------------
  const mmRows = await prisma.$queryRawUnsafe<{ id: string; metadata: Record<string, unknown> | null }[]>(
    `SELECT id, metadata FROM "Material" WHERE metadata ? 'mindmap_sibi'`,
  );
  let mmContaminated = 0;
  let mmRecoverable = 0;
  let mmUnrecoverable = 0;
  let mmLeak = 0;
  for (const r of mmRows) {
    const sibi = (r.metadata ?? {})["mindmap_sibi"];
    // Ground truth: the same meta-language signal, read from the serialized tree.
    const truth = isLlmReasoningDump(candidateText(sibi));
    if (!truth) continue;
    mmContaminated++;
    const resolved = resolveMindmap(r.metadata, "sibi");
    if (resolved) mmRecoverable++;
    else mmUnrecoverable++;
    // The served value must never still contain the deliberation.
    if (resolved && isLlmReasoningDump(resolved)) mmLeak++;
  }
  console.log(`  mindmap diperiksa      : ${mmRows.length}`);
  console.log(`  mindmap terkontaminasi : ${mmContaminated}`);
  console.log(`  mindmap bisa dipulihkan: ${mmRecoverable}`);
  console.log(`  mindmap tanpa pengganti: ${mmUnrecoverable}`);
  check("mindmap bocor ke klien = 0", mmLeak, 0);
  check("mindmap tanpa pengganti = 0", mmUnrecoverable, 0);
}

dbSweep()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    console.log(`\nlulus: ${pass}/${pass + fail}`);
    if (fail > 0) process.exitCode = 1;
    return prisma.$disconnect();
  });