import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNarration } from "@/agents/media/tts";

/**
 * POST /api/media/tts — Generate TTS audio for a material's script.
 * Body: { materialId: string, script?: string }
 *
 * If no script is provided, uses the script stored in metadata.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { materialId, script: customScript } = body;

    if (!materialId) {
      return NextResponse.json({ error: "materialId required" }, { status: 400 });
    }

    // Get material + student for character preference
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: {
        curriculum: {
          select: {
            student: {
              select: { characterPreference: true, name: true },
            },
          },
        },
      },
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const metadata = material.metadata as Record<string, any> | null;
    const script = customScript || metadata?.script;

    if (!script) {
      return NextResponse.json({ error: "No script available. Generate script first." }, { status: 400 });
    }

    const characterKey = material.curriculum.student.characterPreference || "kak-budi";

    // Extract only the narration text (strip [VISUAL: ...] markers)
    const cleanScript = script
      .replace(/\[VISUAL:[^\]]*\]/g, "")
      .replace(/\n+/g, " ")
      .trim();

    const audioUrl = await generateNarration(cleanScript, characterKey);

    if (!audioUrl) {
      return NextResponse.json({ error: "TTS generation failed" }, { status: 500 });
    }

    // Save audio URL to material metadata
    await prisma.material.update({
      where: { id: materialId },
      data: {
        metadata: {
          ...metadata,
          audioUrl,
          audioCharacter: characterKey,
        } as any,
      },
    });

    return NextResponse.json({
      ok: true,
      audioUrl,
      character: characterKey,
      student: material.curriculum.student.name,
    });
  } catch (error) {
    console.error("[api/media/tts] Error:", error);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
