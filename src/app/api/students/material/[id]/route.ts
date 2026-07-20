import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/students/material/[id] — Get material with slide content
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const source = searchParams.get("source"); // "sibi" or default

  try {
    const material = await prisma.material.findUnique({
      where: { id },
      select: {
        id: true,
        topic: true,
        subTopic: true,
        subject: true,
        metadata: true,
        processedContent: true,
        videoUrl: true,
      },
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const metadata = material.metadata as Record<string, any> | null;
    
    // Pick content based on source
    const slides = source === "sibi" 
      ? (metadata?.slide_sibi ?? metadata?.slide) 
      : source === "moodle" 
        ? (metadata?.slide_moodle ?? metadata?.slide) 
        : metadata?.slide;
    const mindmap = source === "sibi" 
      ? (metadata?.mindmap_sibi ?? metadata?.mindmap) 
      : source === "moodle" 
        ? (metadata?.mindmap_moodle ?? metadata?.mindmap) 
        : metadata?.mindmap;

    return NextResponse.json({
      id: material.id,
      topic: material.topic,
      subTopic: material.subTopic,
      subject: material.subject,
      slides: slides ?? null,
      mindmap: mindmap ?? null,
      script: metadata?.script ?? null,
      videoUrl: material.videoUrl ?? null,
      content: material.processedContent,
    });
  } catch (error) {
    console.error("[api/students/material] Error:", error);
    return NextResponse.json({ error: "Failed to load material" }, { status: 500 });
  }
}

/**
 * PATCH /api/students/material/[id] — Update material fields (e.g. subTopic)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { subTopic } = body;

    if (subTopic !== undefined) {
      await prisma.material.update({
        where: { id },
        data: { subTopic },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/students/material] Error updating:", error);
    return NextResponse.json({ error: "Failed to update material" }, { status: 500 });
  }
}
