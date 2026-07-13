/**
 * GET /api/mindmap/screenshot?studentId=STU_ID&subject=IPA&materialId=MAT_ID
 *
 * Renders mindmap as PNG image. Can be used:
 * 1. By the bot to send as a photo
 * 2. As API for external use
 *
 * Returns: PNG image binary (Content-Type: image/png)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
import { mindmapToSvg, type MindmapNode } from "@/lib/mindmap-renderer";

export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get("studentId");
    const subject = request.nextUrl.searchParams.get("subject");
    const materialId = request.nextUrl.searchParams.get("materialId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }

    // Find student
    const student = await prisma.student.findUnique({
      where: studentId.length > 20 ? { id: studentId } : { studentId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Find material
    let material;
    if (materialId) {
      material = await prisma.material.findUnique({ where: { id: materialId } });
    } else if (subject) {
      // Get first material for this subject (latest curriculum)
      const curriculum = await prisma.curriculum.findFirst({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        include: {
          materials: {
            where: { subject },
            orderBy: { weekOrder: "asc" },
            take: 1,
          },
        },
      });
      material = curriculum?.materials[0];
    }

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    // Extract mindmap from metadata
    const meta = material.metadata as Record<string, unknown> | null;
    let mindmap: MindmapNode[] | null = null;

    if (meta?.mindmap) {
      // mindmap could be stored as JSON string or array
      if (typeof meta.mindmap === "string") {
        try { mindmap = JSON.parse(meta.mindmap); } catch { mindmap = null; }
      } else {
        mindmap = meta.mindmap as MindmapNode[];
      }
    }

    if (!mindmap || mindmap.length === 0) {
      return NextResponse.json({ error: "No mindmap data found for this material" }, { status: 404 });
    }

    // Generate SVG
    const title = `${material.subject} — ${material.topic || ""}`.trim();
    const svgStr = mindmapToSvg(mindmap, title);

    // Convert SVG to PNG via sharp
    const pngBuffer = await sharp(Buffer.from(svgStr))
      .png()
      .toBuffer();

    // Return PNG
    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(pngBuffer.length),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[mindmap/screenshot] Error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
