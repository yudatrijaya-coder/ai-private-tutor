/**
 * Retry: generate quiz untuk SOP Mata Pelajaran Mandarin (gagal sebelumnya)
 */
import { prisma } from "../src/lib/prisma";
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

const STUDENT_ID = "STU_MRHQL6KX"; // SHOFI

async function main() {
  const stu = await prisma.student.findUnique({ where: { studentId: STUDENT_ID }, select: { id: true } });
  if (!stu) { console.log("❌ Student not found"); return; }

  // Find "SOP Mata Pelajaran Mandarin" material
  const mat = await prisma.material.findFirst({
    where: { subject: "Bahasa Mandarin", topic: { contains: "SOP" }, curriculum: { studentId: stu.id } },
    select: { id: true, topic: true, subTopic: true },
  });
  if (!mat) { console.log("❌ Material not found"); return; }
  
  console.log(`🎯 Generating for: ${mat.topic} — ${mat.subTopic ?? ""}`);

  const topicStr = `Bahasa Mandarin — ${mat.topic}`;
  const system = `Kamu adalah pembuat soal SMA kelas 11. Buat 5 soal pilihan ganda untuk 1 topik. Output JSON array ONLY. 2 easy, 2 medium, 1 hard. Soal harus relevan dengan topik.`;
  const prompt = `Buat 5 soal untuk: ${topicStr}. Topik ini tentang Standar Operasional Prosedur (SOP) dalam mata pelajaran Bahasa Mandarin di SMA.

Format output:
[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"difficulty":"easy","explanation":"..."}]

HANYA output JSON, tanpa teks lain.`;

  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.SUMOPOD_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: system }, { role: "user", content: prompt }], temperature: 0.5, max_tokens: 2048 }),
        signal: AbortSignal.timeout(120000),
      });
      const text = await r.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) { console.log(`❌ No JSON: ${text.slice(0, 100)}`); continue; }
      const questions = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(questions) || questions.length < 3) { console.log(`❌ Invalid shape`); continue; }

      await prisma.quiz.create({
        data: { materialId: mat.id, studentId: stu.id, type: "QUIZ", questions, maxScore: questions.length },
      });
      console.log(`✅ ${questions.length} questions created`);
      break;
    } catch (e) { console.log(`Attempt ${i + 1}: ${e}`); await new Promise(r => setTimeout(r, 3000)); }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
