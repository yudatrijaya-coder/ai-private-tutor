import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/students/material/[id] — Get material with slide content
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
      },
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const metadata = material.metadata as Record<string, any> | null;

    return NextResponse.json({
      id: material.id,
      topic: material.topic,
      subTopic: material.subTopic,
      subject: material.subject,
      slides: metadata?.slides ?? null,
      script: metadata?.script ?? null,
      content: material.processedContent?.substring(0, 500),
    });
  } catch (error) {
    console.error("[api/students/material] Error:", error);
    return NextResponse.json({ error: "Failed to load material" }, { status: 500 });
  }
}
