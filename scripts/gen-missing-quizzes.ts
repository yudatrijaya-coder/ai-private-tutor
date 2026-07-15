/**
 * Generate missing quizzes for: Raihan Kimia (3), SHOFI Mandarin (4)
 * Inserts directly into DB Quiz table via Prisma
 * 
 * Run: npx tsx scripts/gen-missing-quizzes.ts
 */
import { prisma } from "../src/lib/prisma";

// Manual .env loader
import * as fs from "fs";
import * as path from "path";
function loadEnv() {
  const raw = fs.readFileSync(path.resolve(process.cwd(), ".env.production"), "utf-8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] = v;
  }
}
loadEnv();

const API_URL = "https://ai.sumopod.com/v1/chat/completions";
const MODEL = "deepseek-v4-flash";

const MISSING: { studentId: string; studentUuid?: string; materialIds: string[]; subject: string; grade: string }[] = [
  // Raihan Kimia — 3 materials without quizzes
  { studentId: "STU_MRHLH4LX", materialIds: [], subject: "Kimia", grade: "SMP Kelas 7" },
  // SHOFI Mandarin — 4 materials without quizzes
  { studentId: "STU_MRHQL6KX", materialIds: [], subject: "Bahasa Mandarin", grade: "SMA Kelas 11" },
];

async function callLLM(system: string, user: string): Promise<string | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.SUMOPOD_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: 0.7, max_tokens: 4096 }),
        signal: AbortSignal.timeout(120000),
      });
      if (!r.ok) { console.warn(`  HTTP ${r.status}`); continue; }
      const d: any = await r.json();
      return d.choices?.[0]?.message?.content ?? null;
    } catch (e) { console.warn(`  Error: ${e}`); await new Promise(r => setTimeout(r, 5000)); }
  }
  return null;
}

async function main() {
  console.log(`🔑 Key: ${(process.env.SUMOPOD_API_KEY ?? "").slice(0, 10)}...`);

  // Find student UUIDs and missing materials
  for (const entry of MISSING) {
    const stu = await prisma.student.findUnique({ where: { studentId: entry.studentId }, select: { id: true } });
    if (!stu) { console.log(`❌ Student not found: ${entry.studentId}`); continue; }
    entry.studentUuid = stu.id;

    // Find materials without quizzes
    const mats = await prisma.material.findMany({
      where: {
        subject: entry.subject,
        curriculum: { studentId: stu.id },
        quizzes: { none: {} },
      },
      select: { id: true, topic: true, subTopic: true },
    });
    entry.materialIds = mats.map(m => m.id);
    console.log(`\n📚 ${entry.subject} (${entry.grade}): ${mats.length} materials without quizzes`);
    for (const m of mats) {
      console.log(`   - ${m.topic}${m.subTopic ? " — " + m.subTopic : ""} (${m.id.slice(0, 8)}...)`);
    }
  }

  // Generate quizzes for each missing material
  let total = 0;
  for (const entry of MISSING) {
    if (!entry.materialIds.length || !entry.studentUuid) continue;

    for (const matId of entry.materialIds) {
      const mat = await prisma.material.findUnique({ where: { id: matId }, select: { topic: true, subTopic: true } });
      if (!mat) continue;

      const topicStr = `${entry.subject} — ${mat.topic}${mat.subTopic ? " — " + mat.subTopic : ""}`;
      console.log(`\n  🤖 Generating quiz for: ${topicStr}`);

      const systemPrompt = `Kamu adalah pembuat soal untuk ${entry.grade}. Buat 5 soal pilihan ganda untuk 1 topik. Output JSON array ONLY: [{"question":"...","options":["A","B","C","D"],"correctIndex":0,"difficulty":"easy","explanation":"..."}]. 2 easy, 2 medium, 1 hard. Soal akurat secara ilmiah.`;

      const result = await callLLM(systemPrompt, `Buat 5 soal untuk: ${topicStr}. Bahasa Indonesia.`);
      if (!result) { console.log(`    ❌ Failed to generate`); continue; }

      // Parse JSON
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) { console.log(`    ❌ No JSON in response`); continue; }

      try {
        const questions = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(questions) || questions.length < 3) { console.log(`    ❌ Invalid quiz shape`); continue; }

        // Create quiz in DB
        await prisma.quiz.create({
          data: {
            materialId: matId,
            studentId: entry.studentUuid,
            type: "QUIZ",
            questions: questions,
            maxScore: questions.length,
          },
        });
        total++;
        console.log(`    ✅ ${questions.length} questions created`);
      } catch (e) {
        console.log(`    ❌ JSON parse error: ${e}`);
      }

      await new Promise(r => setTimeout(r, 500));
    }
  }

  await prisma.$disconnect();
  console.log(`\n✅ Done! ${total} quizzes added.`);
}

main().catch(e => { console.error(e); process.exit(1); });
