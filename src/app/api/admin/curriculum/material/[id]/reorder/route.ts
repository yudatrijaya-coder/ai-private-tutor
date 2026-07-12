import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/curriculum/material/[id]/reorder
 * Change the weekOrder of a material
 * Body: { weekOrder: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { weekOrder } = body;

    if (weekOrder === undefined || typeof weekOrder !== "number") {
      return NextResponse.json(
        { error: "weekOrder is required and must be a number" },
        { status: 400 },
      );
    }

    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const updated = await prisma.material.update({
      where: { id },
      data: { weekOrder },
    });

    return NextResponse.json({ ok: true, material: updated });
  } catch (error) {
    console.error("[admin/curriculum/material/[id]/reorder] POST error:", error);
    return NextResponse.json(
      { error: "Failed to reorder material" },
      { status: 500 },
    );
  }
}
