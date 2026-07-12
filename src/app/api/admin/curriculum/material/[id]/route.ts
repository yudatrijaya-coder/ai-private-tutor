import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/curriculum/material/[id]
 * Update material fields (topic, subTopic, subject, weekOrder, status, delivery, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const allowedFields = [
      "topic",
      "subTopic",
      "subject",
      "weekOrder",
      "status",
      "delivery",
      "priority",
      "prerequisiteId",
      "rawContent",
      "processedContent",
      "videoUrl",
      "videoScript",
      "characterUsed",
      "sourceUrls",
      "metadata",
    ];

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const updated = await prisma.material.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true, material: updated });
  } catch (error) {
    console.error("[admin/curriculum/material/[id]] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update material" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/curriculum/material/[id]
 * Delete a material from the curriculum
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    // Delete associated quizzes first
    await prisma.quiz.deleteMany({ where: { materialId: id } });

    await prisma.material.delete({ where: { id } });

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (error) {
    console.error("[admin/curriculum/material/[id]] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete material" },
      { status: 500 },
    );
  }
}
