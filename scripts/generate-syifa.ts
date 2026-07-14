/**
 * Standalone script to batch-generate content + slides + video recommendations
 * for Syifa (SD5). Reuses the exact same prompt format and parsing logic
 * as the API route at src/app/api/curriculum/batch-generate/route.ts.
 *
 * Processes in batches of 3 subTopics per LLM call to avoid timeouts,
 * saves checkpoint after each batch for resumability.
 *
 * Usage: npx tsx scripts/generate-syifa.ts
 */
import { prisma } from "../src/lib/prisma";
import { callLLM } from "../src/llm/client";
import * as fs from "fs";
import * as path from "path";

// ─── Config ───────────────────────────────────────────────────────
const STUDENT_ID = "a80cbfa5-9e21-42fa-a0e2-69943d9a2161";
const BATCH_SIZE = 3;
const LLM_TIMEOUT_MS = 300_000;
const CHECKPOINT_PATH = path.resolve(__dirname, "..", "data", ".checkpoint-syifa.json");

interface CheckpointEntry {
  materialId: string;
  subject: string;
  topic: string;
  subTopic: string | null;
  weekOrder: number;
  status: "done" | "error" | "parsing_failed";
  error?: string;
}

interface Checkpoint {
  version: 1;
  studentId: string;
  processed: CheckpointEntry[];
  updatedAt: string;
}

// ─── Checkpoint Helpers ───────────────────────────────────────────

function loadCheckpoint(): Checkpoint {
  try {
    if (fs.existsSync(CHECKPOINT_PATH)) {
      const raw = fs.readFileSync(CHECKPOINT_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[checkpoint] Failed to load, starting fresh:", err);
  }
  return { version: 1, studentId: STUDENT_ID, processed: [], updatedAt: new Date().toISOString() };
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  checkpoint.updatedAt = new Date().toISOString();
  const dir = path.dirname(CHECKPOINT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2), "utf-8");
  console.log(`[checkpoint] Saved: ${checkpoint.processed.length} entries`);
}

/** Get a Set of material IDs that are already done (for resuming) */
function getDoneIds(checkpoint: Checkpoint): Set<string> {
  return new Set(
    checkpoint.processed
      .filter((e) => e.status === "done")
      .map((e) => e.materialId)
  );
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("📚 Syifa SD5 — Batch Content + Slides + Video Generator");
  console.log("=".repeat(60));

  // 1. Find student
  const student = await prisma.student.findUnique({ where: { id: STUDENT_ID } });
  if (!student) {
    console.error("❌ Student not found:", STUDENT_ID);
    process.exit(1);
  }
  console.log(`👤 Student: ${student.name} (${student.gradeLevel})`);

  // 2. Find pending materials
  const curriculum = await prisma.curriculum.findFirst({
    where: { studentId: STUDENT_ID },
    orderBy: { createdAt: "desc" },
    include: { materials: { orderBy: { weekOrder: "asc" } } },
  });
  if (!curriculum) {
    console.error("❌ No curriculum found for student");
    process.exit(1);
  }

  const pending = curriculum.materials.filter(
    (m) => !m.processedContent || m.processedContent.length < 50 || !((m.metadata as any)?.slides)
  );

  console.log(`📦 Total materials: ${curriculum.materials.length}`);
  console.log(`⏳ Pending (need content+slides): ${pending.length}`);
  console.log(`✅ Already have content: ${curriculum.materials.length - pending.length}`);

  if (pending.length === 0) {
    console.log("🎉 All materials already have content & slides!");
    await generateMindmaps();
    await attachQuizzes();
    return;
  }

  // 3. Load checkpoint and filter out already-processed
  const checkpoint = loadCheckpoint();
  const doneIds = getDoneIds(checkpoint);
  const toProcess = pending.filter((m) => !doneIds.has(m.id));

  console.log(`🔄 Already processed (checkpoint): ${doneIds.size}`);
  console.log(`🎯 To process now: ${toProcess.length}`);

  if (toProcess.length === 0) {
    console.log("🎉 All pending materials already in checkpoint as done!");
    // Still run mindmap + quizzes
    await generateMindmaps();
    await attachQuizzes();
    return;
  }

  // 4. Process in batches
  const gradeLabel = "SD Kelas 5";
  let batchCount = 0;
  let totalSuccess = 0;
  let totalErrors = 0;
  const startTime = Date.now();

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    batchCount++;
    const batchLabel = `[${i + 1}-${Math.min(i + BATCH_SIZE, toProcess.length)}/${toProcess.length}]`;

    console.log(`\n${"=".repeat(50)}`);
    console.log(`📝 Batch ${batchCount} ${batchLabel} — ${batch.length} subTopics`);
    console.log(`${"=".repeat(50)}`);

    for (const m of batch) {
      console.log(`   ${m.subject} / ${m.topic} / ${m.subTopic} (week ${m.weekOrder})`);
    }

    // Build prompt (exact same format as API route)
    const topicsList = batch.map(
      (m, idx) =>
        `${idx + 1}. Subject: ${m.subject} | Topic: ${m.topic} | SubTopic: ${m.subTopic} | Week: ${m.weekOrder}`
    ).join("\n");

    const prompt = `Kamu adalah pengajar kurikulum Merdeka. Buatkan materi ajar untuk ${gradeLabel} dalam Bahasa Indonesia.

BERIKUT ADALAH DAFTAR SUB-TOPIK YANG HARUS DIBUATKAN:

${topicsList}

UNTUK SETIAP SUB-TOPIK, hasilkan output dengan format EXACT berikut (gunakan === sebagai pemisah antar subTopik):

===SUBJEK: {subject}
===TOPIK: {topic}
===SUBTOPIK: {subTopic}

===KONTEN:
{300-500 kata konten pembelajaran yang lengkap, jelas, sesuai Kurikulum Merdeka, contoh konkret, dan bahasa yang sesuai usia}

===SLIDES:
{5-8 bullet point untuk slide presentasi, setiap bullet max 15 kata, dalam Bahasa Indonesia}

===VIDEO:
{rekomendasi 1 judul video YouTube edukasi yang cocok untuk topik ini}

===SELESAI

PENTING:
- TULIS SEMUA SUB-TOPIK DALAM 1 RESPON
- Gunakan bahasa Indonesia yang baik
- Konten harus akurat secara pedagogis
- Slides harus ringkas dan mudah dibaca
- Pisahkan setiap subTopik dengan ===SELESAI`;

    let response: string | null = null;
    try {
      console.log(`   ⏳ Calling LLM (timeout: ${LLM_TIMEOUT_MS}ms)...`);
      const llmStart = Date.now();
      response = await callLLM("content", [
        {
          role: "system",
          content: `Kamu adalah asisten pengajar kurikulum Merdeka untuk ${gradeLabel}. Buat materi ajar berkualitas tinggi dalam Bahasa Indonesia.`,
        },
        { role: "user", content: prompt },
      ], {
        temperature: 0.7,
        maxTokens: 8192,
        timeoutMs: LLM_TIMEOUT_MS,
      });
      const llmElapsed = ((Date.now() - llmStart) / 1000).toFixed(1);
      console.log(`   ✅ LLM responded in ${llmElapsed}s`);
    } catch (err) {
      console.error(`   ❌ LLM call failed:`, err);
      for (const m of batch) {
        checkpoint.processed.push({
          materialId: m.id,
          subject: m.subject,
          topic: m.topic,
          subTopic: m.subTopic,
          weekOrder: m.weekOrder,
          status: "error",
          error: String(err),
        });
        totalErrors++;
      }
      saveCheckpoint(checkpoint);
      continue;
    }

    if (!response) {
      console.error(`   ❌ Empty LLM response`);
      for (const m of batch) {
        checkpoint.processed.push({
          materialId: m.id,
          subject: m.subject,
          topic: m.topic,
          subTopic: m.subTopic,
          weekOrder: m.weekOrder,
          status: "error",
          error: "Empty LLM response",
        });
        totalErrors++;
      }
      saveCheckpoint(checkpoint);
      continue;
    }

    // Parse response into blocks (same logic as API route)
    const blocks = response.split("===SELESAI").filter(Boolean);
    console.log(`   📄 Parsed ${blocks.length} blocks from response`);

    let batchSuccess = 0;
    for (const block of blocks) {
      const extractMatch = block.match(/===KONTEN:\n?([\s\S]*?)(?===SLIDES:)/);
      const slidesMatch = block.match(/===SLIDES:\n?([\s\S]*?)(?===VIDEO:)/);
      const videoMatch = block.match(/===VIDEO:\n?([\s\S]*?)(?====SELESAI|$)/);
      const subjekMatch = block.match(/===SUBJEK:\s*(.+)/);
      const topikMatch = block.match(/===TOPIK:\s*(.+)/);
      const subtopikMatch = block.match(/===SUBTOPIK:\s*(.+)/);

      const content = extractMatch ? extractMatch[1].trim() : null;
      const slides = slidesMatch ? slidesMatch[1].trim() : null;
      const video = videoMatch ? videoMatch[1].trim() : null;

      // Find matching material
      const material = batch.find(
        (m) =>
          m.subject === (subjekMatch?.[1]?.trim() ?? m.subject) &&
          m.subTopic === (subtopikMatch?.[1]?.trim() ?? m.subTopic)
      );

      if (material && content) {
        try {
          await prisma.material.update({
            where: { id: material.id },
            data: {
              processedContent: content,
              videoUrl: video || material.videoUrl,
              metadata: {
                ...((material.metadata as any) || {}),
                slides: slides || undefined,
              },
              status: "READY",
            },
          });

          checkpoint.processed.push({
            materialId: material.id,
            subject: material.subject,
            topic: material.topic,
            subTopic: material.subTopic,
            weekOrder: material.weekOrder,
            status: "done",
          });
          batchSuccess++;
          totalSuccess++;
          console.log(`   ✅ ${material.subTopic} — saved`);
        } catch (dbErr) {
          console.error(`   ❌ DB update failed for ${material.subTopic}:`, dbErr);
          checkpoint.processed.push({
            materialId: material.id,
            subject: material.subject,
            topic: material.topic,
            subTopic: material.subTopic,
            weekOrder: material.weekOrder,
            status: "error",
            error: String(dbErr),
          });
          totalErrors++;
        }
      } else {
        const subTopic = subtopikMatch?.[1]?.trim() ?? "unknown";
        console.warn(`   ⚠ Could not match block to material: ${subTopic}`);
        checkpoint.processed.push({
          materialId: "unknown",
          subject: subjekMatch?.[1]?.trim() ?? "unknown",
          topic: topikMatch?.[1]?.trim() ?? "unknown",
          subTopic,
          weekOrder: 0,
          status: "parsing_failed",
          error: content ? "No matching material found" : "No content parsed",
        });
        totalErrors++;
      }
    }

    // Save checkpoint after each batch
    saveCheckpoint(checkpoint);

    // Brief pause between batches to avoid overwhelming the LLM
    if (i + BATCH_SIZE < toProcess.length) {
      console.log(`   💤 Brief pause before next batch...`);
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 Generation Summary:`);
  console.log(`   ✅ Success: ${totalSuccess}`);
  console.log(`   ❌ Errors:  ${totalErrors}`);
  console.log(`   ⏱  Duration: ${totalElapsed}s`);
  console.log(`${"=".repeat(60)}`);

  // 5. Generate mindmaps via API call
  await generateMindmaps();

  // 6. Attach quizzes
  await attachQuizzes();

  // 7. Final verification
  await verifyResults();
}

// ─── Step 5: Generate Mindmaps ─────────────────────────────────────

async function generateMindmaps() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("🧠 Step 5: Generating Mindmaps via batch-mindmap API...");
  console.log(`${"=".repeat(60)}`);

  try {
    const res = await fetch("http://localhost:3000/api/curriculum/batch-mindmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: STUDENT_ID }),
    });
    const data = await res.json();
    console.log(`   Status: ${data.ok ? "✅" : "❌"}`);
    if (data.message) console.log(`   Message: ${data.message}`);
    if (data.success !== undefined) console.log(`   Mindmaps generated: ${data.success}`);
    if (data.errors !== undefined) console.log(`   Errors: ${data.errors}`);
    if (data.processed !== undefined) console.log(`   Processed: ${data.processed}`);
    if (data.totalMaterials !== undefined) console.log(`   Total materials: ${data.totalMaterials}`);
    if (data.haveMindmap !== undefined) console.log(`   Now have mindmap: ${data.haveMindmap}`);
  } catch (err) {
    console.error(`   ❌ Failed to call batch-mindmap API:`, err);
  }
}

// ─── Step 6: Attach Quizzes ────────────────────────────────────────

async function attachQuizzes() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("📝 Step 6: Attaching Quizzes...");
  console.log(`${"=".repeat(60)}`);

  try {
    // Run the existing attach-quizzes script programmatically
    const { getQuiz: getQuizSD5 } = await import("../src/data/quiz-bank-sd5");

    const curriculum = await prisma.curriculum.findFirst({
      where: { studentId: STUDENT_ID },
      orderBy: { createdAt: "desc" },
      include: { materials: true },
    });
    if (!curriculum) {
      console.error("   ❌ No curriculum found");
      return;
    }

    let attached = 0;
    let skipped = 0;

    for (const material of curriculum.materials) {
      const existingQuiz = await prisma.quiz.findFirst({
        where: { materialId: material.id },
      });
      if (existingQuiz) {
        skipped++;
        continue;
      }

      const questions = getQuizSD5(material.subject, material.topic, material.subTopic ?? "");
      if (questions && questions.length > 0) {
        await prisma.quiz.create({
          data: {
            materialId: material.id,
            studentId: STUDENT_ID,
            questions: questions as any,
            maxScore: questions.length * 10,
            timeLimit: 5,
          },
        });
        attached++;
      }
    }

    console.log(`   ✅ Attached ${attached} new quizzes, ${skipped} already existed`);
  } catch (err) {
    console.error(`   ❌ Failed to attach quizzes:`, err);
  }
}

// ─── Step 7: Verify Results ────────────────────────────────────────

async function verifyResults() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("🔍 Step 7: Final Verification");
  console.log(`${"=".repeat(60)}`);

  const curriculum = await prisma.curriculum.findFirst({
    where: { studentId: STUDENT_ID },
    orderBy: { createdAt: "desc" },
    include: { materials: { orderBy: { weekOrder: "asc" } } },
  });
  if (!curriculum) {
    console.error("   ❌ No curriculum found for verification");
    return;
  }

  const materials = curriculum.materials;
  const total = materials.length;

  const withContent = materials.filter((m) => m.processedContent && m.processedContent.length > 50).length;
  const withSlides = materials.filter((m) => (m.metadata as any)?.slides).length;
  const withMindmap = materials.filter((m) => (m.metadata as any)?.mindmap).length;
  const withVideo = materials.filter((m) => m.videoUrl).length;

  // Count quizzes
  const quizCount = await prisma.quiz.count({
    where: {
      material: { curriculumId: curriculum.id },
    },
  });

  console.log(`\n📊 Syifa SD5 — Final Status:`);
  console.log(`   ┌──────────────────────┬──────────┬──────────┐`);
  console.log(`   │ Metric               │ Count    │ Pct      │`);
  console.log(`   ├──────────────────────┼──────────┼──────────┤`);
  console.log(`   │ Total Materials      │ ${String(total).padEnd(8)}│ 100.0%   │`);
  console.log(`   │ With Content         │ ${String(withContent).padEnd(8)}│ ${((withContent / total) * 100).toFixed(1).padEnd(6)}%   │`);
  console.log(`   │ With Slides          │ ${String(withSlides).padEnd(8)}│ ${((withSlides / total) * 100).toFixed(1).padEnd(6)}%   │`);
  console.log(`   │ With Mindmap         │ ${String(withMindmap).padEnd(8)}│ ${((withMindmap / total) * 100).toFixed(1).padEnd(6)}%   │`);
  console.log(`   │ With Video           │ ${String(withVideo).padEnd(8)}│ ${((withVideo / total) * 100).toFixed(1).padEnd(6)}%   │`);
  console.log(`   │ Total Quizzes        │ ${String(quizCount).padEnd(8)}│ ${((quizCount / total) * 100).toFixed(1).padEnd(6)}%   │`);
  console.log(`   └──────────────────────┴──────────┴──────────┘`);

  // By subject breakdown
  console.log(`\n📊 By Subject:`);
  const bySubject: Record<string, { total: number; content: number; slides: number; mindmap: number }> = {};
  for (const m of materials) {
    if (!bySubject[m.subject]) bySubject[m.subject] = { total: 0, content: 0, slides: 0, mindmap: 0 };
    bySubject[m.subject].total++;
    if (m.processedContent && m.processedContent.length > 50) bySubject[m.subject].content++;
    if ((m.metadata as any)?.slides) bySubject[m.subject].slides++;
    if ((m.metadata as any)?.mindmap) bySubject[m.subject].mindmap++;
  }
  console.log(`   ${"Subject".padEnd(24)} Total  Content Slides Mindmap`);
  console.log(`   ${"-".repeat(60)}`);
  for (const [subj, stats] of Object.entries(bySubject).sort()) {
    console.log(`   ${subj.padEnd(24)} ${String(stats.total).padEnd(5)} ${String(stats.content).padEnd(7)} ${String(stats.slides).padEnd(6)} ${String(stats.mindmap).padEnd(7)}`);
  }

  await prisma.$disconnect();
}

// ─── Run ───────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
