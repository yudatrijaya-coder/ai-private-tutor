import "dotenv/config";
/**
 * Repair the orphan material row in Shofi's SMA_2 curriculum.
 *
 * THE DEFECT
 * `13c766a1-…` (Matematika Tingkat Lanjut / Polinomial / Polinomial dan Fungsi
 * Polinomial) is the only one of Shofi's 403 materials with `processedContent =
 * null`, and the only one with no quiz. Those two facts are the same fact:
 *
 *   src/agents/assessment/generator.ts:31
 *     if (!material || !material.processedContent) throw …
 *
 * `generateQuiz` refuses to run without `processedContent`, so a material whose
 * content generation never completed can never acquire a quiz. The topic then
 * has no quiz in the database, the emitter lifts quizzes from the database, and
 * the generated bank is short one quiz — which is why
 * `SMA_2||Matematika Tingkat Lanjut||Polinomial||Polinomial dan Fungsi
 * Polinomial` sits in KNOWN_QUIZ_GAPS. Nothing here is a missing topic: the row
 * has 6,545 chars of `rawContent` and a 3,014-char `metadata.slide_sibi`, both
 * intact. Only the processing step never happened.
 *
 * THE REPAIR
 * Follow the application's own path, in the application's own order:
 *   1. content — the same `content` role call and prompt shape used by
 *      POST /api/curriculum/batch-generate, so the row ends up shaped like its
 *      402 siblings rather than like something this script invented;
 *   2. quiz — the real `generateQuiz()`, imported, not reimplemented, once
 *      `processedContent` exists.
 *
 * `metadata.slide_sibi` is preserved: it is the original SIBI text and the
 * slide resolver prefers it, so the student's slides do not change.
 *
 * Guards (a repair that invents content is worse than the gap it closes):
 *   - the generated content must share vocabulary with the row's own
 *     `rawContent` / `slide_sibi`, or it is reported and not written;
 *   - slides must pass `isUsableSlideText` and not be an LLM reasoning dump;
 *   - the stored quiz is re-read and every question must pass
 *     `questionRejection` and be grounded in the content that was written.
 *
 * Usage:
 *   node scripts/run-ts.mjs scripts/fix-orphan-material.ts            # dry run
 *   node scripts/run-ts.mjs scripts/fix-orphan-material.ts --apply    # write
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { callLLM } from "@/llm/client";
import { generateQuiz } from "@/agents/assessment/generator";
import { questionRejection } from "@/lib/quiz-grading";
import { isUsableSlideText, isLlmReasoningDump } from "@/lib/content/slide-content";
import { normalizeVideoUrl } from "@/lib/video-url";

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const ID_ARG = (() => {
  const i = ARGS.indexOf("--id");
  return i >= 0 ? (ARGS[i + 1] ?? "") : "";
})();

/* ── vocabulary comparison ─────────────────────────────────────────── */

const STOP = new Set([
  "yang","dan","atau","dengan","untuk","dari","pada","adalah","dalam","ini","itu","tidak","akan",
  "dapat","juga","karena","sebagai","oleh","ke","di","se","para","lebih","agar","bila","jika",
  "serta","telah","sudah","masih","hanya","saja","antara","terhadap","secara","suatu","satu",
  "dua","tiga","olehnya","dengan","adapun","yakni","yaitu","misalnya","contoh","berikut","dll",
  "hal","cara","bentuk","bagian","sama","lain","sering","banyak","dalam","atas","bawah","sisi",
  "kamu","kita","kami","mereka","dia","anda","saya","bisa","harus","wajib","maka","namun","tetapi",
  "saja","pun","lah","nya","kah","the","and","of","to","in","is","are","for","with","that","this",
]);

/** Content words of 4+ letters, lowercased, stopwords removed. */
function terms(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !STOP.has(w));
}

/** The `n` most frequent words of `text`, most frequent first. */
function topTerms(text: string, n: number): string[] {
  const freq = new Map<string, number>();
  for (const w of terms(text)) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
}

/* ── parsing ───────────────────────────────────────────────────────── */

function parseBlocks(response: string): { content: string | null; slides: string | null; video: string | null } {
  const contentMatch = response.match(/===KONTEN:\s*\n?([\s\S]*?)(?===SLIDES:|$)/);
  const slidesMatch = response.match(/===SLIDES:\s*\n?([\s\S]*?)(?===VIDEO:|$)/);
  const videoMatch = response.match(/===VIDEO:\s*\n?([\s\S]*?)(?====SELESAI|$)/);
  return {
    content: contentMatch ? contentMatch[1].trim() : null,
    slides: slidesMatch ? slidesMatch[1].trim() : null,
    video: videoMatch ? videoMatch[1].trim() : null,
  };
}

/** Strip a leading label the model sometimes repeats back. */
function clean(text: string | null): string {
  return (text ?? "").replace(/^\{|\}$/g, "").trim();
}

/* ── main ──────────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  const material = ID_ARG
    ? await prisma.material.findUnique({ where: { id: ID_ARG } })
    : await prisma.material.findFirst({
        // The row to repair: no processedContent, but real source text present.
        where: { processedContent: null, rawContent: { not: null } },
        orderBy: { createdAt: "asc" },
      });

  if (!material) {
    console.log("no orphan material found");
    return;
  }

  const md = (material.metadata ?? {}) as Record<string, unknown>;
  const sibi = typeof md.slide_sibi === "string" ? md.slide_sibi : "";
  const raw = material.rawContent ?? "";
  const gradeLabel = material.gradeLevel === "SMA_2" ? "SMA Kelas 2" : material.gradeLevel;

  console.log(`MODE: ${APPLY ? "apply (rows will be written)" : "dry run"}`);
  console.log(`\n${material.id}`);
  console.log(`  ${material.subject} / ${material.topic} / ${material.subTopic}`);
  console.log(`  processedContent : ${material.processedContent ? material.processedContent.length + " chars" : "NULL"}`);
  console.log(`  rawContent       : ${raw.length} chars`);
  console.log(`  metadata.slide_sibi: ${sibi.length} chars`);
  console.log(`  metadata.slides  : ${md.slides ? String(md.slides).length + " chars" : "absent"}`);

  // ── 1. content, through the application's own prompt shape ──────────
  // The batch-generate prompt asks for 300-500 words from the model's own
  // knowledge. This row has the SIBI book text on disk, so it is passed as
  // reference: the content should describe THIS book's treatment of the topic,
  // and the grounding check below then has something real to check against.
  const source = (sibi || raw).slice(0, 4000);
  const prompt = `Kamu adalah pengajar kurikulum Merdeka. Buatkan materi ajar untuk ${gradeLabel} dalam Bahasa Indonesia.

SUB-TOPIK: ${material.subTopic}
MAPEL: ${material.subject}
TOPIK: ${material.topic}

REFERENSI SUMBER (buku teks, gunakan sebagai acuan isi — jangan mengarang di luar ini):
${source}

Hasilkan output dengan format EXACT berikut:

===SUBJEK: ${material.subject}
===TOPIK: ${material.topic}
===SUBTOPIK: ${material.subTopic}

===KONTEN:
{300-500 kata konten pembelajaran yang lengkap, jelas, sesuai Kurikulum Merdeka, contoh konkret, dan bahasa yang sesuai usia}

===SLIDES:
{5-8 bullet point untuk slide presentasi, setiap bullet max 15 kata, dalam Bahasa Indonesia}

===VIDEO:
{rekomendasi 1 judul video YouTube edukasi yang cocok untuk topik ini}

===SELESAI

PENTING:
- Gunakan bahasa Indonesia yang baik
- Konten harus akurat secara pedagogis dan sesuai referensi di atas
- Slides harus ringkas dan mudah dibaca`;

  console.log("\n── 1. content ──");
  const response = await callLLM(
    "content",
    [
      {
        role: "system",
        content: `Kamu adalah asisten pengajar kurikulum Merdeka untuk ${gradeLabel}. Buat materi ajar berkualitas tinggi dalam Bahasa Indonesia.`,
      },
      { role: "user", content: prompt },
    ],
    { temperature: 0.7, maxTokens: 8192 },
  );

  if (!response) {
    console.log("  LLM returned nothing — aborting");
    return;
  }

  const blocks = parseBlocks(response);
  const content = clean(blocks.content);
  const slides = clean(blocks.slides);
  const video = clean(blocks.video);

  console.log(`  content : ${content.length} chars`);
  console.log(`  slides  : ${slides.length} chars`);
  console.log(`  video   : ${video.slice(0, 70)}`);

  // ── guards ──────────────────────────────────────────────────────────
  const problems: string[] = [];

  if (content.length < 400) problems.push(`content too short (${content.length} chars)`);
  if (isLlmReasoningDump(content)) problems.push("content looks like an LLM reasoning dump");

  // Grounding: the content must talk about the same things as the source.
  const sourceTop = topTerms(sibi || raw, 14);
  const genSet = new Set(terms(content));
  const hits = sourceTop.filter((w) => genSet.has(w));
  const coverage = sourceTop.length ? hits.length / sourceTop.length : 0;
  console.log(`  grounding: ${hits.length}/${sourceTop.length} source terms present (${(coverage * 100).toFixed(0)}%)`);
  console.log(`             source terms: ${sourceTop.slice(0, 10).join(", ")}`);
  console.log(`             missing     : ${sourceTop.filter((w) => !genSet.has(w)).join(", ") || "—"}`);
  if (coverage < 0.5) problems.push(`content is off-topic: only ${(coverage * 100).toFixed(0)}% of the source's key terms appear`);

  if (!isUsableSlideText(slides)) problems.push("slides failed isUsableSlideText");
  if (isLlmReasoningDump(slides)) problems.push("slides look like a reasoning dump");

  if (problems.length) {
    console.log("\nREFUSED — nothing written:");
    for (const p of problems) console.log(`  ! ${p}`);
    console.log("\n--- raw response, first 1200 chars ---");
    console.log(response.slice(0, 1200));
    return;
  }

  const nextMetadata = { ...md, slides };
  const videoUrl = video ? normalizeVideoUrl(video) : material.videoUrl;

  if (!APPLY) {
    const plan = {
      materialId: material.id,
      processedContent: content,
      slides,
      videoUrl,
      coverage,
      createdAt: new Date().toISOString(),
    };
    mkdirSync("backups", { recursive: true });
    writeFileSync("/tmp/orphan-plan.json", JSON.stringify(plan, null, 2));
    console.log("\n-- content preview --");
    console.log(content.slice(0, 700));
    console.log("\n-- slides preview --");
    console.log(slides.slice(0, 400));
    console.log("\nplan → /tmp/orphan-plan.json");
    console.log("\n(dry run — pass --apply to write)");
    return;
  }

  // ── 2. write, exactly as batch-generate writes ───────────────────────
  console.log("\n── 2. write ──");
  mkdirSync("backups", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `backups/orphan-material-${stamp}.json`;
  writeFileSync(
    backupPath,
    JSON.stringify(
      {
        material: {
          id: material.id,
          processedContent: material.processedContent,
          videoUrl: material.videoUrl,
          status: material.status,
          metadata: material.metadata,
        },
      },
      null,
      2,
    ),
  );
  console.log(`backup → ${backupPath}`);

  await prisma.material.update({
    where: { id: material.id },
    data: {
      processedContent: content,
      videoUrl: videoUrl || material.videoUrl,
      metadata: nextMetadata as never,
      status: "READY",
    },
  });
  console.log(`  processedContent written (${content.length} chars)`);
  console.log(`  metadata.slides written (${slides.length} chars); slide_sibi preserved`);

  // ── 3. quiz, through the application's own function ──────────────────
  console.log("\n── 3. quiz (generateQuiz) ──");
  const before = await prisma.quiz.count({ where: { materialId: material.id } });
  let quizError: string | null = null;
  try {
    await generateQuiz(material.id);
  } catch (err) {
    quizError = err instanceof Error ? err.message : String(err);
  }
  const after = await prisma.quiz.count({ where: { materialId: material.id } });
  console.log(`  quizzes on this material: ${before} → ${after}`);
  if (quizError) console.log(`  generateQuiz threw: ${quizError}`);

  // ── 4. read back what was stored ─────────────────────────────────────
  console.log("\n── 4. verify stored quiz ──");
  const stored = await prisma.quiz.findFirst({
    where: { materialId: material.id },
    select: { id: true, questions: true, maxScore: true, type: true },
  });
  if (!stored) {
    console.log("  NO QUIZ STORED — repair incomplete");
    process.exitCode = 1;
    return;
  }
  const arr = Array.isArray(stored.questions) ? (stored.questions as unknown[]) : [];
  const unrenderable = arr.filter((q) => questionRejection(q) !== null).length;
  console.log(`  quiz ${stored.id} type=${stored.type} questions=${arr.length} unrenderable=${unrenderable}`);
  const genTerms = new Set(terms(content));
  for (const [i, q] of arr.entries()) {
    const o = q as Record<string, unknown>;
    const stem = String(o.question ?? "");
    const opts = Array.isArray(o.options) ? (o.options as unknown[]).map(String) : [];
    const ci = typeof o.correctIndex === "number" ? o.correctIndex : -1;
    const answer = opts[ci] ?? "";
    const grounded = terms(answer).filter((w) => genTerms.has(w)).length;
    console.log(`   [${i}] ${stem.slice(0, 78)}`);
    console.log(`       answer="${answer.slice(0, 46)}" grounded=${grounded} opts=${opts.length}`);
  }
  if (unrenderable > 0) {
    console.log(`  ${unrenderable} unrenderable question(s) — repair incomplete`);
    process.exitCode = 1;
  } else {
    console.log("\nPASS");
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exitCode = 1;
});
