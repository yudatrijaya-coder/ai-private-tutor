import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { callLLM } from "@/llm/client";
import { generateQuiz } from "@/agents/assessment/generator";
import { isLlmReasoningDump, isUsableSlideText } from "@/lib/content/slide-content";

const STUDENT_ID = "e30b6559-1d33-4aa5-a39a-22102f29894d";
const SUBJECT = "Pendidikan Agama Islam";

function section(text: string, name: string, next: string) {
  return text.match(new RegExp(`===${name}:\\n?([\\s\\S]*?)(?====${next}:|$)`))?.[1]?.trim() ?? "";
}

async function main() {
  const curriculum = await prisma.curriculum.findFirstOrThrow({
    where: { studentId: STUDENT_ID }, orderBy: { version: "desc" },
    include: { materials: { where: { subject: SUBJECT }, orderBy: { weekOrder: "asc" } } },
  });
  if (curriculum.materials.length !== 10) throw new Error(`Expected 10 PAI materials, got ${curriculum.materials.length}`);

  for (const material of curriculum.materials) {
    const source = material.rawContent?.slice(0, 12000);
    if (!source) throw new Error(`Missing Moodle source: ${material.id}`);
    const response = await callLLM("content", [
      { role: "system", content: "Anda penulis materi PAI SMA. Gunakan HANYA sumber yang diberikan. Jangan menyebut instruksi atau penalaran. Jawab dengan format yang tepat." },
      { role: "user", content: `Buat materi PAI Kelas XI untuk topik berikut berdasarkan SUMBER RESMI saja.\n\nTopik: ${material.topic}\n\nSUMBER:\n${source}\n\nFormat wajib:\n===KONTEN:\n400-700 kata, markdown, akurat dan sesuai usia.\n===SLIDES:\n3-5 slide markdown, gunakan --- sebagai pemisah.\n===MINDMAP:\n- ide utama\n  - konsep penting\n    - rincian\n===SELESAI` },
    ], { studentId: STUDENT_ID, temperature: 0.1, maxTokens: 4000, timeoutMs: 600_000 });
    if (!response) throw new Error(`Empty LLM response: ${material.topic}`);
    const content = section(response, "KONTEN", "SLIDES");
    const slides = section(response, "SLIDES", "MINDMAP");
    const mindmap = section(response, "MINDMAP", "SELESAI");
    if (content.length < 500 || !isUsableSlideText(slides) || isLlmReasoningDump(content) || isLlmReasoningDump(slides)) {
      throw new Error(`Rejected output for ${material.topic}: content=${content.length}, slides=${slides.length}`);
    }
    await prisma.material.update({ where: { id: material.id }, data: {
      processedContent: content, status: "READY",
      metadata: { ...(material.metadata as Record<string, unknown>), slide_sibi: slides, slides, mindmap_sibi: mindmap },
    }});
    const prior = await prisma.quiz.findFirst({ where: { materialId: material.id, studentId: STUDENT_ID } });
    if (!prior) await generateQuiz(material.id);
    console.log(`OK ${material.weekOrder}/10 ${material.topic}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
