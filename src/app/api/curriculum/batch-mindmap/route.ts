import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMindmapFromMarkdown, type MindmapNode } from "@/lib/mindmap-template";

/**
 * Parse slides that are flat bullet/numbered lists (no ## headers) into mindmap nodes.
 * Creates a single "Pokok Bahasan" branch with each line as a child.
 * Handles: "- item", "• item", "* item", "1. item", "2. item" etc.
 */
function parseFlatBullets(lines: string[]): MindmapNode[] {
  const bulletLines = lines
    .map(l => l.trim())
    .filter(l => l.length > 0)
    // Filter out lines that are just a single separator char
    .filter(l => !/^[-•=*]{1,3}$/.test(l))
    // Try to extract content
    .map(l => {
      // Remove leading bullet markers: -, *, •, or numbered (1., 2., etc.)
      return l.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "").trim();
    })
    .filter(l => l.length > 5); // Skip empty or too-short lines

  if (bulletLines.length === 0) return [];

  return [{
    id: "branch-0",
    label: "Pokok Bahasan",
    children: bulletLines.map((label, i) => ({
      label: label.length > 60 ? label.substring(0, 57) + "..." : label,
    })),
  }];
}

/**
 * Parse slides markdown into mindmap nodes.
 * Handles both ##-sectioned markdown AND flat bullet lists.
 */
function slidesToMindmap(slides: string): MindmapNode[] {
  if (!slides || slides.length < 10) return [];

  // Try ##-based parsing first
  const rawNodes = parseMindmapFromMarkdown(slides);
  if (rawNodes.length > 0) return rawNodes;

  // Fallback: flat bullet list → single branch
  const lines = slides.split("\n").map(l => l.trim()).filter(Boolean);
  return parseFlatBullets(lines);
}

/**
 * POST /api/curriculum/batch-mindmap — Generate mindmap data from existing slides
 *
 * Body: { studentId }
 *
 * Parses slides markdown (metadata.slides) into mindmap node data
 * and stores in metadata.mindmap.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId } = body || {};
    if (!studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const curriculum = await prisma.curriculum.findFirst({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      include: { materials: { orderBy: { weekOrder: "asc" } } },
    });

    if (!curriculum) {
      return NextResponse.json({ error: "No curriculum found" }, { status: 404 });
    }

    // Find materials with slides but no mindmap yet
    const needMindmap = curriculum.materials.filter((m) => {
      const md = m.metadata as Record<string, any> | null;
      return md?.slides && !md?.mindmap;
    });

    if (needMindmap.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "All materials already have mindmap data",
        student: student.name,
        total: curriculum.materials.length,
        hasMindmap: curriculum.materials.filter((m) => {
          const md = m.metadata as Record<string, any> | null;
          return md?.mindmap;
        }).length,
      });
    }

    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const material of needMindmap) {
      try {
        const md = material.metadata as Record<string, any>;
        const slides = md.slides as string;
        const rawNodes = slidesToMindmap(slides);

        if (rawNodes.length === 0) {
          results.push({
            id: material.id,
            subTopic: material.subTopic,
            status: "skip",
            reason: "No parseable sections found in slides",
          });
          continue;
        }

        const updateData = {
          ...md,
          mindmap: JSON.parse(JSON.stringify(rawNodes)),
        };
        await prisma.material.update({
          where: { id: material.id },
          data: {
            metadata: updateData,
          },
        });

        successCount++;
        results.push({
          id: material.id,
          subject: material.subject,
          topic: material.topic,
          subTopic: material.subTopic,
          status: "success",
          branches: rawNodes.length,
          totalChildren: rawNodes.reduce((sum, n) => sum + n.children.length, 0),
        });
      } catch (err) {
        errorCount++;
        results.push({
          id: material.id,
          subTopic: material.subTopic,
          status: "error",
          error: String(err),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      student: student.name,
      grade: student.gradeLevel,
      totalMaterials: curriculum.materials.length,
      processed: needMindmap.length,
      success: successCount,
      errors: errorCount,
      details: results,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/**
 * GET /api/curriculum/batch-mindmap?studentId=...
 * Check how many materials need mindmap generation.
 */
export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const curriculum = await prisma.curriculum.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: { materials: { orderBy: { weekOrder: "asc" }, select: { id: true, subject: true, topic: true, metadata: true } } },
  });

  if (!curriculum) return NextResponse.json({ error: "No curriculum" }, { status: 404 });

  const withMindmap = curriculum.materials.filter((m) => {
    const md = m.metadata as Record<string, any> | null;
    return md?.mindmap;
  }).length;
  const withSlides = curriculum.materials.filter((m) => {
    const md = m.metadata as Record<string, any> | null;
    return md?.slides;
  }).length;
  const total = curriculum.materials.length;

  return NextResponse.json({
    ok: true,
    student: student.name,
    grade: student.gradeLevel,
    total,
    haveSlides: withSlides,
    haveMindmap: withMindmap,
    needMindmap: withSlides - withMindmap,
  });
}
