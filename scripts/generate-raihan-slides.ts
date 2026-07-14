/**
 * Generate hierarchical slides for Raihan (SMP7)
 *
 * All 99 materials have flat-bullet slides ("- point 1\n- point 2")
 * that need to be regenerated as ##-sectioned hierarchical markdown
 * so the mindmap parser can create multiple branches.
 *
 * After slide regeneration, regenerates mindmaps from the new slides.
 *
 * Run: npx tsx scripts/generate-raihan-slides.ts
 */

import { writeFileSync, existsSync, readFileSync, mkdirSync, appendFileSync } from "fs";
import OpenAI from "openai";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// ─── Config ────────────────────────────────────────────────────
const STUDENT_ID = "0d3fbf85-a1ee-4c5c-bdd9-f752ed75b69d";
const LOG_FILE = "/home/ubuntu/ai-private-tutor/scripts/raihan-gen.log";
const CHECKPOINT_FILE = "/home/ubuntu/ai-private-tutor/data/.checkpoint-raihan.json";
const DATABASE_URL = "postgresql://tutor:tutor123@localhost:5432/ai_private_tutor";
const LLM_BASE_URL = "http://localhost:20128/v1";
const BATCH_SIZE = 5;

// ─── Logging ────────────────────────────────────────────────────
function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(msg);
  try { appendFileSync(LOG_FILE, line + "\n"); } catch { /* ignore */ }
}

// ─── DB Setup ──────────────────────────────────────────────────
function createDb() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// ─── LLM Client ─────────────────────────────────────────────────
function createLLM() {
  return new OpenAI({
    baseURL: LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY || "sk-9router",
    defaultQuery: { combo: "ai_tutor_agent" },
    timeout: 120000,
    maxRetries: 3,
  });
}

// ─── Checkpoint ─────────────────────────────────────────────────
interface CheckpointData {
  processed: string[];
  completed: boolean;
}

function loadCheckpoint(): CheckpointData {
  if (existsSync(CHECKPOINT_FILE)) {
    try { return JSON.parse(readFileSync(CHECKPOINT_FILE, "utf-8")); } catch { /* ignore */ }
  }
  return { processed: [], completed: false };
}

function saveCheckpoint(data: CheckpointData) {
  const dir = CHECKPOINT_FILE.substring(0, CHECKPOINT_FILE.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2));
}

// ─── Mindmap Parsing (inline, no path alias needed) ──────────────
interface MindmapNode {
  id: string;
  label: string;
  children: { label: string }[];
}

/**
 * Parse markdown into mindmap nodes — exact copy of parseMindmapFromMarkdown
 * from @/lib/mindmap-template to avoid path-alias issues.
 */
function parseMindmapFromMarkdown(raw: string): MindmapNode[] {
  const sections = raw.split("\n---\n").map((s) => s.trim()).filter(Boolean);
  const nodes: MindmapNode[] = [];

  for (const sec of sections) {
    const lines = sec.split("\n").filter((l) => l.trim());
    const h = lines.find((l) => l.startsWith("## "));
    if (!h) continue;
    const label = h.replace(/^##\s*/, "").trim();
    const children = lines
      .filter((l) => /^[-*]/.test(l) || /^\d\./.test(l))
      .map((l) => ({ label: l.replace(/^[-*\d.]\s*/, "").trim() }))
      .filter((c) => c.label.length > 0);
    if (label) nodes.push({ id: "", label, children });
  }

  nodes.forEach((n, i) => { n.id = `branch-${i}`; });
  return nodes;
}

/**
 * Parse flat bullet lines into a single "Pokok Bahasan" branch.
 */
function parseFlatBullets(lines: string[]): MindmapNode[] {
  const bulletLines = lines
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .filter(l => !/^[-•=*]{1,3}$/.test(l))
    .map(l => l.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "").trim())
    .filter(l => l.length > 5);

  if (bulletLines.length === 0) return [];
  return [{
    id: "branch-0",
    label: "Pokok Bahasan",
    children: bulletLines.map((label) => ({
      label: label.length > 60 ? label.substring(0, 57) + "..." : label,
    })),
  }];
}

/**
 * Convert slides markdown to mindmap nodes.
 */
function slidesToMindmap(slides: string): MindmapNode[] {
  if (!slides || slides.length < 10) return [];
  const rawNodes = parseMindmapFromMarkdown(slides);
  if (rawNodes.length > 0) return rawNodes;
  const lines = slides.split("\n").map(l => l.trim()).filter(Boolean);
  return parseFlatBullets(lines);
}

// ─── LLM: Generate Hierarchical Slides ──────────────────────────
async function generateHierarchicalSlides(
  llm: OpenAI,
  material: {
    subject: string;
    topic: string;
    subTopic: string;
    processedContent: string;
    slides: string;
  }
): Promise<string | null> {
  const prompt = `Kamu adalah asisten pengajar Kurikulum Merdeka untuk SMP Kelas 1.

Berikut adalah materi ajar yang sudah ada. Tugasmu adalah mengubah SLIDES dari format bullet point datar menjadi format hierarkis dengan ## headings.

MATERI:
Subject: ${material.subject}
Topik: ${material.topic}
SubTopik: ${material.subTopic}

KONTEN LENGKAP:
${material.processedContent?.substring(0, 1200) || "Tidak ada konten tambahan"}

SLIDES SAAT INI (format datar):
${material.slides}

TUGAS:
Buat ulang slides di atas menjadi format hierarkis dengan ## section headings. Gunakan struktur berikut sebagai panduan:

## Konsep Kunci
- [poin penting 1]
- [poin penting 2]

## Contoh Penerapan
- [contoh 1]
- [contoh 2]

## Latihan / Refleksi
- [latihan 1]

PENTING:
- Gunakan Bahasa Indonesia (kecuali untuk pelajaran Bahasa Inggris)
- Setiap ## heading akan menjadi cabang mindmap yang terpisah — BUAT MINIMAL 3 SECTION
- Setiap section minimal 2 bullet point
- Jangan gunakan format flat bullet (tanpa ##)
- Hanya keluarkan slides dalam format markdown, tanpa penjelasan tambahan`;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await llm.chat.completions.create({
        model: "ai_tutor_agent",
        messages: [
          {
            role: "system",
            content: `Kamu adalah asisten pengajar yang mengubah slide presentasi datar menjadi format hierarkis dengan ## headings. Keluarkan hanya slides dalam format markdown — jangan ada teks lain.`,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });
      const content = res.choices?.[0]?.message?.content || "";

      // Validate: must have ## headings AND bullet points
      if (content.includes("## ") && content.includes("- ")) {
        // Remove any preamble before the first ##
        const firstHeading = content.indexOf("## ");
        const cleaned = firstHeading > 0 ? content.substring(firstHeading) : content;
        return cleaned.trim();
      }

      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
    } catch (e) {
      if (attempt < 3) await new Promise((r) => setTimeout(r, 3000));
    }
  }
  return null;
}

// ─── Main ───────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();
  const prisma = createDb();
  const llm = createLLM();

  log("🚀 Starting Raihan SMP7 slide regeneration");
  log(`📁 Checkpoint: ${CHECKPOINT_FILE}`);

  // 1. Get curriculum with materials
  const curriculum = await prisma.curriculum.findFirst({
    where: { studentId: STUDENT_ID },
    orderBy: { createdAt: "desc" },
    include: { materials: { orderBy: { weekOrder: "asc" } } },
  });

  if (!curriculum) {
    log("❌ No curriculum found for Raihan");
    process.exit(1);
  }

  const allMaterials = curriculum.materials;
  log(`📚 Found ${allMaterials.length} total materials`);

  // 2. Identify flat-bullet materials
  interface FlatMaterial {
    id: string;
    subject: string;
    topic: string;
    subTopic: string;
    weekOrder: number;
    processedContent: string;
    slides: string;
  }

  const flatMaterials: FlatMaterial[] = [];
  for (const m of allMaterials) {
    const md = (m.metadata || {}) as Record<string, unknown>;
    const slides = (md.slides || "") as string;
    if (slides.startsWith("- ") || slides.startsWith("• ") || slides.startsWith("* ")) {
      flatMaterials.push({
        id: m.id,
        subject: m.subject,
        topic: m.topic,
        subTopic: m.subTopic || "",
        weekOrder: m.weekOrder,
        processedContent: m.processedContent || "",
        slides,
      });
    }
  }

  log(`📋 ${flatMaterials.length} / ${allMaterials.length} materials have flat-bullet slides`);

  if (flatMaterials.length === 0) {
    log("✅ No flat-bullet materials to process — already hierarchical.");
    await prisma.$disconnect();
    return;
  }

  // 3. Load checkpoint
  const checkpoint = loadCheckpoint();
  const completedIds = new Set(checkpoint.processed);

  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;

  // 4. Process in batches
  for (let i = 0; i < flatMaterials.length; i += BATCH_SIZE) {
    const batch = flatMaterials.slice(i, i + BATCH_SIZE);
    const batchLabel = `[${i + 1}-${Math.min(i + BATCH_SIZE, flatMaterials.length)}/${flatMaterials.length}]`;

    const toProcess = batch.filter((m) => !completedIds.has(m.id));
    if (toProcess.length === 0) {
      log(`⏭️ ${batchLabel} All ${batch.length} already processed, skipping`);
      skipCount += batch.length;
      continue;
    }

    log(`🔄 ${batchLabel} Processing ${toProcess.length} materials (${completedIds.size} done so far)...`);

    // Process each material individually for quality
    for (const material of toProcess) {
      try {
        log(`  ⏳ ${material.subject} — ${material.subTopic}...`);
        const newSlides = await generateHierarchicalSlides(llm, material);

        if (newSlides) {
          // Verify the result has ## headings
          const headingCount = (newSlides.match(/^## /gm) || []).length;

          // Update metadata.slides only (don't touch other fields)
          const existingMd = allMaterials.find((m) => m.id === material.id)?.metadata || {};
          const updateData = {
            ...(existingMd as Record<string, unknown>),
            slides: newSlides,
          };

          await prisma.material.update({
            where: { id: material.id },
            data: { metadata: updateData },
          });

          log(`  ✅ ${material.subTopic} — ${headingCount} sections, ${newSlides.length} chars`);
          successCount++;
        } else {
          log(`  ❌ ${material.subTopic} — LLM returned invalid slides`);
          errorCount++;
        }

        // Save checkpoint after each material
        checkpoint.processed.push(material.id);
        saveCheckpoint(checkpoint);

        // Delay between calls
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        log(`  ❌ ${material.subTopic} — ${(err as Error).message}`);
        errorCount++;
        checkpoint.processed.push(material.id);
        saveCheckpoint(checkpoint);
      }
    }

    // Brief pause between batches
    if (i + BATCH_SIZE < flatMaterials.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const genDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\n📊 Slide regeneration: ${successCount} succeeded, ${errorCount} failed, ${skipCount} skipped in ${genDuration}s`);

  // 5. Regenerate mindmaps for ALL materials
  log(`\n🔄 Regenerating mindmaps from new hierarchical slides...`);

  let mindmapSuccess = 0;
  let mindmapError = 0;
  let mindmapMultiBranch = 0;

  // Re-fetch curriculum to get updated slides
  const updatedCurriculum = await prisma.curriculum.findFirst({
    where: { studentId: STUDENT_ID },
    orderBy: { createdAt: "desc" },
    include: { materials: { orderBy: { weekOrder: "asc" } } },
  });

  if (!updatedCurriculum) {
    log("❌ Failed to re-fetch curriculum for mindmap generation");
  } else {
    for (const material of updatedCurriculum.materials) {
      try {
        const md = (material.metadata || {}) as Record<string, unknown>;
        const slides = (md.slides || "") as string;
        const rawNodes = slidesToMindmap(slides);

        if (rawNodes.length === 0) {
          log(`  ⚠️ ${material.subTopic} — No mindmap nodes from slides`);
          mindmapError++;
          continue;
        }

        const updateData = {
          ...md,
          mindmap: JSON.parse(JSON.stringify(rawNodes)),
        };

        await prisma.material.update({
          where: { id: material.id },
          data: { metadata: updateData },
        });

        mindmapSuccess++;
        if (rawNodes.length > 1) mindmapMultiBranch++;

        if (mindmapSuccess % 20 === 0) {
          log(`  📍 ${mindmapSuccess}/${updatedCurriculum.materials.length} mindmaps done...`);
        }
      } catch (err) {
        log(`  ❌ ${material.subTopic} mindmap — ${(err as Error).message}`);
        mindmapError++;
      }
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

  // 6. Final report
  log(`\n${"=".repeat(60)}`);
  log(`🏁 RAIHAN SMP7 COMPLETE`);
  log(`${"=".repeat(60)}`);
  log(`📊 Slide Regeneration:  ${successCount} succeeded, ${errorCount} failed`);
  log(`📊 Mindmap Generation:  ${mindmapSuccess} succeeded, ${mindmapError} failed`);
  log(`📊 Multi-Branch Mindmaps: ${mindmapMultiBranch} / ${mindmapSuccess}`);
  log(`⏱️  Total Duration:     ${totalDuration}s`);

  // Print comparison table
  log(`\n📋 DETAILED COMPARISON:`);
  log(`${"-".repeat(80)}`);
  log(`${"SUBJECT".padEnd(20)} ${"TOPIC".padEnd(20)} ${"STATUS".padEnd(15)} BRANCHES`);
  log(`${"-".repeat(80)}`);

  const finalCurriculum = await prisma.curriculum.findFirst({
    where: { studentId: STUDENT_ID },
    orderBy: { createdAt: "desc" },
    include: { materials: { orderBy: { weekOrder: "asc" } } },
  });

  if (finalCurriculum) {
    for (const m of finalCurriculum.materials) {
      const md = (m.metadata || {}) as Record<string, unknown>;
      const slides = (md.slides || "") as string;
      const mindmap = (md.mindmap || []) as MindmapNode[];
      const isHierarchical = slides.includes("## ");
      const branchCount = mindmap.length;
      log(
        `${(m.subject || "").padEnd(20)} ${(m.subTopic || m.topic || "").substring(0, 18).padEnd(20)} ` +
        `${(isHierarchical ? "✅ HIERARCHICAL" : "⚠️ FLAT").padEnd(15)} ${branchCount} branches`
      );
    }

    const totalWithMindmap = finalCurriculum.materials.filter((m) => {
      const md = (m.metadata || {}) as Record<string, unknown>;
      return md.mindmap;
    }).length;
    log(`${"-".repeat(80)}`);
    log(`📌 Final: ${finalCurriculum.materials.length} materials, ${totalWithMindmap} with mindmaps`);
  }

  checkpoint.completed = true;
  saveCheckpoint(checkpoint);

  log(`\n✅ Checkpoint saved to ${CHECKPOINT_FILE}`);
  log(`📝 Log saved to ${LOG_FILE}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  log(`\n💥 FATAL: ${e.message}`);
  console.error(e);
  process.exit(1);
});
