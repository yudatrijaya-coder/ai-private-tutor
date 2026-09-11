import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveScope, isAdmin } from "@/lib/auth/scope";

/**
 * GET /api/students/material/[id] — Get material with slide content
 *
 * A student may only read material reachable from their OWN curriculum.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await resolveScope();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
        // Ownership probe only — not part of the response below.
        curriculum: { select: { studentId: true } },
      },
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    // Ownership: 404 (not 403) so a guessed material id cannot be confirmed.
    if (scope.kind === "student") {
      if (material.curriculum?.studentId !== scope.session.studentId) {
        return NextResponse.json({ error: "Material not found" }, { status: 404 });
      }
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
      generatedVideoUrl: metadata?.generatedVideoUrl ?? null,
      content: material.processedContent,
    });
  } catch (error) {
    console.error("[api/students/material] Error:", error);
    return NextResponse.json({ error: "Failed to load material" }, { status: 500 });
  }
}

/**
 * PATCH /api/students/material/[id] — Update material fields (e.g. subTopic)
 *
 * Admin only: this edits curriculum content, and it is a write.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdmin(await resolveScope())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
