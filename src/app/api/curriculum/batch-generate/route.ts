import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callLLM } from "@/llm/client";
import { getContent, hasContent } from "@/data/curriculum-content";
import { GRADE_TOPICS } from "@/data/curriculum-topics";
import { normalizeVideoUrl } from "@/lib/video-url";

/**
 * POST /api/curriculum/batch-generate
 *
 * Generates content + slides + YouTube suggestions for ALL subTopics
 * of a given student (or a specific batch of subTopics).
 *
 * Body:
 *   studentId  — required, the student's DB id
 *   batchSize  — optional, how many subTopics per LLM call (default 5)
 *
 * Returns progress array per subTopic.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { studentId, batchSize = 5 } = body || {};

  if (!studentId) {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const gradeLabel = student.gradeLevel === "SD_5" ? "SD Kelas 5"
    : student.gradeLevel === "SMP_1" ? "SMP Kelas 1"
    : "SMA Kelas 2";

  const curriculum = await prisma.curriculum.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: { materials: { orderBy: { weekOrder: "asc" } } },
  });

  if (!curriculum) {
    return NextResponse.json({ error: "No curriculum found" }, { status: 404 });
  }

  // Find materials that still need content or slides
  const pending = curriculum.materials.filter(
    (m) => !m.processedContent || m.processedContent.length < 50 || !(m.metadata as any)?.slides
  );

  if (pending.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "All materials already have content & slides",
      student: student.name,
      total: curriculum.materials.length,
    });
  }

  const results: any[] = [];

  // Process in batches
  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    const batchLabel = `[${i + 1}-${Math.min(i + batchSize, pending.length)}/${pending.length}]`;

    console.log(`[batch-generate] ${batchLabel} Processing ${batch.length} subTopics for ${student.name}`);

    // Build prompt for this batch
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
      response = await callLLM("content", [
        { role: "system", content: `Kamu adalah asisten pengajar kurikulum Merdeka untuk ${gradeLabel}. Buat materi ajar berkualitas tinggi dalam Bahasa Indonesia.` },
        { role: "user", content: prompt },
      ], {
        temperature: 0.7,
        maxTokens: 8192,
        timeoutMs: 180_000,
      });
    } catch (err) {
      console.error(`[batch-generate] LLM failed for batch ${batchLabel}:`, err);
      for (const m of batch) {
        results.push({ subTopic: m.subTopic, status: "error", error: String(err) });
      }
      continue;
    }

    if (!response) {
      for (const m of batch) {
        results.push({ subTopic: m.subTopic, status: "error", error: "Empty LLM response" });
      }
      continue;
    }

    // Parse response into subTopic blocks
    const blocks = response.split("===SELESAI").filter(Boolean);

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

      // Normalize video description to YouTube search URL
      const normalizedVideo = video
        ? normalizeVideoUrl(video)
        : null;

      // Find matching material
      const material = batch.find(
        (m) =>
          m.subject === (subjekMatch?.[1]?.trim() ?? m.subject) &&
          m.subTopic === (subtopikMatch?.[1]?.trim() ?? m.subTopic)
      );

      if (material && content) {
        await prisma.material.update({
          where: { id: material.id },
          data: {
            processedContent: content,
            videoUrl: normalizedVideo || material.videoUrl,
            metadata: {
              ...(material.metadata as any || {}),
              slides: slides || undefined,
            },
            status: "READY",
          },
        });
        results.push({
          subTopic: material.subTopic,
          status: "success",
          hasContent: true,
          hasSlides: !!slides,
          hasVideo: !!video,
        });
      } else {
        results.push({
          subTopic: subtopikMatch?.[1]?.trim() ?? "unknown",
          status: "parse_error",
          contentFound: !!content,
        });
      }
    }
  }

  // Count results
  const successes = results.filter((r) => r.status === "success").length;
  const errors = results.filter((r) => r.status !== "success").length;

  return NextResponse.json({
    ok: true,
    student: student.name,
    grade: student.gradeLevel,
    totalMaterials: curriculum.materials.length,
    processed: results.length,
    successes,
    errors,
    details: results,
  });
}

/**
 * GET /api/curriculum/batch-generate?studentId=...
 * Check how many materials still need content generation for a student.
 */
export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const curriculum = await prisma.curriculum.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: { materials: { orderBy: { weekOrder: "asc" } } },
  });

  if (!curriculum) return NextResponse.json({ error: "No curriculum" }, { status: 404 });

  const withContent = curriculum.materials.filter(
    (m) => m.processedContent && m.processedContent.length > 50
  ).length;
  const withSlides = curriculum.materials.filter(
    (m) => (m.metadata as any)?.slides
  ).length;
  const withVideo = curriculum.materials.filter((m) => m.videoUrl).length;
  const total = curriculum.materials.length;

  return NextResponse.json({
    ok: true,
    student: student.name,
    grade: student.gradeLevel,
    total,
    needContent: total - withContent,
    needSlides: total - withSlides,
    needVideo: total - withVideo,
    hasContent: withContent,
    hasSlides: withSlides,
    hasVideo: withVideo,
    bySubject: Object.entries(
      curriculum.materials.reduce((acc: Record<string, number>, m) => {
        acc[m.subject] = (acc[m.subject] || 0) + 1;
        return acc;
      }, {})
    ).map(([subject, count]) => ({ subject, count })),
  });
}
