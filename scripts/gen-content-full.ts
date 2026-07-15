/**
 * Generate slides content for ALL empty materials across Raihan, SHOFI, Syifa.
 * Uses SumoPod LLM + SIBI curriculum reference.
 * 
 * Run: npx tsx scripts/gen-content-full.ts
 */
import { prisma } from "../src/lib/prisma";

// Load .env for standalone scripts — manual read (dotenv unreliable from npx tsx)
import * as fs from "fs";
import * as path from "path";
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    let key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnv();

const SUMOPOD_KEY = process.env.SUMOPOD_API_KEY;
const API_URL = "https://ai.sumopod.com/v1/chat/completions";
const MODEL = "deepseek-v4-flash";

interface MaterialItem {
  id: string;
  subject: string;
  topic: string;
  subTopic: string | null;
  weekOrder: number;
  sourceUrls: any;
  metadata: any;
}

// ─── Students ─────────────────────────────────────────────────
const STUDENTS = [
  { name: "Raihan", studentId: "STU_MRHLH4LX", persona: "Kak Dewi", grade: "SMP Kelas 1", gradeLabel: "SMP" },
  { name: "SHOFI", studentId: "STU_MRHQL6KX", persona: "Kak Raka", grade: "SMA Kelas 2", gradeLabel: "SMA" },
  { name: "Syifa", studentId: "STU_MRHL5FYL", persona: "Kak Budi", grade: "SD Kelas 5", gradeLabel: "SD" },
];

// ─── LLM Call ─────────────────────────────────────────────────
async function callLLM(system: string, user: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUMOPOD_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!resp.ok) {
        const text = await resp.text();
        console.warn(`  ⚠️ LLM HTTP ${resp.status}: ${text.slice(0, 100)}`);
        continue;
      }
      const data: any = await resp.json();
      return data.choices?.[0]?.message?.content ?? null;
    } catch (e) {
      console.warn(`  ⚠️ LLM error (attempt ${attempt + 1}): ${e}`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  return null;
}

// ─── Mindmap Parser ───────────────────────────────────────────
function parseMindmap(md: string) {
  const nodes: { id: string; label: string; children: { label: string }[] }[] = [];
  let currentBranch: string | null = null;
  const children: string[] = [];
  for (const line of md.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      if (currentBranch && children.length > 0) {
        nodes.push({
          id: `branch-${nodes.length}`,
          label: currentBranch,
          children: children.slice(0, 4).map((c) => ({ label: c.slice(0, 100) })),
        });
      }
      currentBranch = trimmed.slice(3).trim();
      children.length = 0;
    } else if (trimmed.startsWith("- ") && currentBranch) {
      children.push(trimmed.slice(2).trim());
    }
  }
  if (currentBranch && children.length > 0) {
    nodes.push({
      id: `branch-${nodes.length}`,
      label: currentBranch,
      children: children.slice(0, 4).map((c) => ({ label: c.slice(0, 100) })),
    });
  }
  return nodes;
}

// ─── Generate Batch ───────────────────────────────────────────
async function generateBatch(
  batch: MaterialItem[],
  grade: string,
  gradeLabel: string,
  persona: string
): Promise<string[]> {
  const subject = batch[0].subject;
  
  const topicsStr = batch
    .map((m, i) => `${i + 1}. TOPIK: ${m.topic}${m.subTopic ? " — " + m.subTopic : ""}`)
    .join("\n");

  const systemPrompt = `Kamu adalah asisten pembuat materi pembelajaran untuk ${persona}, seorang tutor privat ${grade}.

Tugasmu: Buat konten slide pembelajaran dalam format MARKDOWN untuk 1 topik pelajaran.

FORMAT WAJIB:
## [Konsep Kunci]
- [3-5 poin penting tentang topik ini, bahasa sesuai usia ${grade}]

## [Sub-topik 1]
- [Penjelasan singkat]
- [Contoh jika relevan]

## [Sub-topik 2]  
- [Penjelasan singkat]
- [Contoh jika relevan]

## [Latihan / Refleksi]
- [2-3 pertanyaan atau aktivitas untuk siswa]

Gunakan bahasa Indonesia yang sesuai usia:
- SD: ceria, sederhana, banyak contoh konkret
- SMP: lebih formal, hubungan dengan kehidupan sehari-hari
- SMA: mendalam, istilah teknis, analitis

Jangan gunakan format selain yang ditentukan. Jangan tanya. Langsung buat kontennya. Pisahkan SETIAP topik dengan baris --- di antaranya.`;

  const userPrompt = `Buat konten slide untuk topik-topik ${subject} (${grade}) berikut.
Untuk SETIAP topik, buat slide markdown dengan format yang ditentukan.
Pisahkan setiap topik dengan baris: ---

${topicsStr}`;

  console.log(`  🤖 LLM: ${batch.length} topik — ${subject}`);
  const result = await callLLM(systemPrompt, userPrompt);
  if (!result) return batch.map(() => "");

  // Split by --- separator
  const parts = result.split(/\n---\n|\n---\r?\n?/);
  while (parts.length < batch.length) parts.push("");
  return parts.slice(0, batch.length);
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  if (!SUMOPOD_KEY) {
    console.error("❌ SUMOPOD_API_KEY not set!");
    process.exit(1);
  }
  console.log(`🔑 LLM key: ${SUMOPOD_KEY.slice(0, 10)}...`);

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const student of STUDENTS) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📚 ${student.name} (${student.grade})`);
    console.log(`${"=".repeat(60)}`);

    // Get student internal UUID first
    const studentRecord = await prisma.student.findUnique({
      where: { studentId: student.studentId },
      select: { id: true, gradeLevel: true },
    });
    if (!studentRecord) {
      console.log(`  ❌ No student found for ${student.name}`);
      continue;
    }

    // Get curriculum using student's UUID
    const curriculum = await prisma.curriculum.findFirst({
      where: { studentId: studentRecord.id },
      select: { id: true },
      orderBy: { createdAt: "desc" }, // take newest (Moodle-generated)
    });
    if (!curriculum) {
      console.log(`  ❌ No curriculum found for ${student.name}`);
      continue;
    }

    // Get empty materials
    const materials = await prisma.material.findMany({
      where: {
        curriculumId: curriculum.id,
        OR: [
          { rawContent: null },
          { rawContent: { equals: "" } },
        ],
      },
      select: {
        id: true,
        subject: true,
        topic: true,
        subTopic: true,
        weekOrder: true,
        sourceUrls: true,
        metadata: true,
      },
      orderBy: [{ subject: "asc" }, { weekOrder: "asc" }],
    });

    if (materials.length === 0) {
      console.log(`  ✅ Semua materi sudah punya konten!`);
      continue;
    }

    // Group by subject
    const bySubject: Record<string, MaterialItem[]> = {};
    for (const m of materials) {
      if (!bySubject[m.subject]) bySubject[m.subject] = [];
      bySubject[m.subject].push(m);
    }

    console.log(`  📊 ${materials.length} materi kosong di ${Object.keys(bySubject).length} mapel:`);
    for (const [subj, mats] of Object.entries(bySubject).sort()) {
      console.log(`    - ${subj}: ${mats.length} materi`);
    }

    // Process each subject
    for (const [subject, mats] of Object.entries(bySubject).sort()) {
      console.log(`\n  📖 ${subject} (${mats.length} materi)`);

      // Batch into groups of 5
      const BATCH_SIZE = 5;
      for (let i = 0; i < mats.length; i += BATCH_SIZE) {
        const batch = mats.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(mats.length / BATCH_SIZE);
        console.log(`\n  Batch ${batchNum}/${totalBatches}:`);

        const parts = await generateBatch(batch, student.grade, student.gradeLabel, student.persona);

        for (let j = 0; j < batch.length; j++) {
          const mat = batch[j];
          let content = parts[j]?.trim() ?? "";
          
          if (content.length < 50) {
            console.log(`    ⚠️  ${mat.topic}: too short (${content.length}), retry...`);
            // Retry individually
            const single = await callLLM(
              `Kamu adalah ${student.persona}, tutor ${student.grade}. Buat konten slide markdown untuk 1 topik. Format: ## Konsep Kunci\\n- poin\\n## Sub-topik\\n- poin\\n## Latihan\\n- soal`,
              `Buat konten pembelajaran untuk: ${mat.subject} — ${mat.topic}${mat.subTopic ? " — " + mat.subTopic : ""}`
            );
            if (single && single.length > 50) content = single;
          }

          if (content.length > 50) {
            const metadata = {
              slides: content,
              source: "llm-generated-sibi",
              generatedAt: new Date().toISOString(),
            };

            // Preserve existing metadata fields like sourceUrls
            const existingMeta = mat.metadata as Record<string, any> | null;
            const mergedMeta = existingMeta && typeof existingMeta === "object" && !Array.isArray(existingMeta)
              ? { ...existingMeta, ...metadata, mindmap: parseMindmap(content) }
              : { ...metadata, mindmap: parseMindmap(content) };

            await prisma.material.update({
              where: { id: mat.id },
              data: {
                rawContent: content,
                metadata: mergedMeta,
              },
            });
            totalGenerated++;
            console.log(`    ✅ ${mat.topic}: ${content.length} chars`);
          } else {
            totalFailed++;
            console.log(`    ❌ ${mat.topic}: failed to generate`);
          }

          await new Promise((r) => setTimeout(r, 300));
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  await prisma.$disconnect();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ Selesai! Generated: ${totalGenerated}, Failed: ${totalFailed}`);
  console.log(`${"=".repeat(60)}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
