import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/curriculum/material
 * Add a single material to an existing curriculum
 * Body: { curriculumId: string, weekOrder: number, title: string, description?: string, subject: string, type?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { curriculumId, weekOrder, title, description, subject, type } = body;

    if (!curriculumId || weekOrder === undefined || !title || !subject) {
      return NextResponse.json(
        { error: "curriculumId, weekOrder, title, and subject are required" },
        { status: 400 },
      );
    }

    const curriculum = await prisma.curriculum.findUnique({
      where: { id: curriculumId },
    });

    if (!curriculum) {
      return NextResponse.json(
        { error: "Curriculum not found" },
        { status: 404 },
      );
    }

    const material = await prisma.material.create({
      data: {
        curriculumId,
        topic: title,
        subTopic: description ?? null,
        subject,
        gradeLevel: curriculum.gradeLevel,
        weekOrder,
        delivery: (type as any) ?? "TEXT",
        status: "DRAFT",
      },
    });

    return NextResponse.json({ ok: true, material }, { status: 201 });
  } catch (error) {
    console.error("[admin/curriculum/material] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create material" },
      { status: 500 },
    );
  }
}
