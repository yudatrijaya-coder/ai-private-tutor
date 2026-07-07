import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderVideo } from "@/agents/media/renderer";

/**
 * POST /api/media/render — Generate MP4 video from TTS + script.
 * Body: { materialId: string, slides?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { materialId, slides } = body;

    if (!materialId) {
      return NextResponse.json({ error: "materialId required" }, { status: 400 });
    }

    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: {
        curriculum: {
          select: {
            student: {
              select: { characterPreference: true },
            },
          },
        },
      },
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const metadata = material.metadata as Record<string, any> | null;
    const audioUrl = metadata?.audioUrl;
    const script = metadata?.script;
    const characterKey = material.curriculum.student.characterPreference || "kak-budi";

    if (!audioUrl) {
      return NextResponse.json(
        { error: "No audio available. Generate TTS first." },
        { status: 400 },
      );
    }

    if (!script) {
      return NextResponse.json(
        { error: "No script available." },
        { status: 400 },
      );
    }

    const videoUrl = await renderVideo(
      materialId,
      audioUrl,
      script,
      material.topic + " - " + (material.subTopic || ""),
      slides,
      characterKey,
    );

    if (!videoUrl) {
      return NextResponse.json({ error: "Video rendering failed" }, { status: 500 });
    }

    // Save video URL to material metadata
    await prisma.material.update({
      where: { id: materialId },
      data: {
        metadata: {
          ...metadata,
          videoUrl,
        } as any,
      },
    });

    return NextResponse.json({ ok: true, videoUrl });
  } catch (error) {
    console.error("[api/media/render] Error:", error);
    return NextResponse.json({ error: "Render failed" }, { status: 500 });
  }
}
