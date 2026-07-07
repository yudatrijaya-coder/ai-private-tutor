import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueue } from "@/queue/runner";
import { enqueueLocal } from "@/queue/local";
import { QUEUES } from "@/queue/definitions";
import { redis } from "@/queue/redis";

/**
 * GET /api/students — List all students.
 */
export async function GET() {
  try {
    const students = await prisma.student.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            curriculums: true,
            quizzes: true,
            attempts: true,
          },
        },
      },
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error("[api/students] Error listing:", error);
    return NextResponse.json(
      { error: "Gagal memuat data siswa" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/students — Trigger pipeline for a student.
 * Body: { action: "trigger", studentId: string, stages?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, studentId, stages } = body;

    if (action !== "trigger") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (!studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const want = !stages || stages === "all"
      ? ["curriculum", "content", "assessment", "schedule"]
      : stages;

    const results: { stage: string; jobId?: string; status: string; error?: string }[] = [];

    let redisOk = false;
    try {
      await redis.ping();
      redisOk = true;
    } catch { /* ignore */ }

    async function trigger(queueDef: any, payload: any, stage: string) {
      try {
        let jobId: string | undefined;
        if (redisOk) {
          jobId = await enqueue({ queue: queueDef, data: payload });
        } else {
          jobId = enqueueLocal(queueDef.name, payload);
        }
        results.push({ stage, jobId, status: "queued" });
      } catch (err) {
        results.push({ stage, status: "error", error: err instanceof Error ? err.message : String(err) });
      }
    }

    if (want.includes("curriculum")) {
      await trigger(QUEUES.CURRICULUM_REVIEW, { studentId: student.id, gradeLevel: student.gradeLevel }, "curriculum");
    }

    if (want.includes("content")) {
      const materials = await prisma.material.findMany({
        where: { curriculum: { studentId: student.id }, status: { in: ["DRAFT", "RAW"] } },
      });
      for (const m of materials) {
        await trigger(QUEUES.CONTENT_SCRAPE, { materialId: m.id, topic: m.topic, subTopic: m.subTopic, gradeLevel: m.gradeLevel, sources: [] }, `content:${m.topic}`);
      }
      if (materials.length === 0) results.push({ stage: "content", status: "skipped (no materials)" });
    }

    if (want.includes("assessment")) {
      const materials = await prisma.material.findMany({
        where: { curriculum: { studentId: student.id }, status: "READY" },
      });
      for (const m of materials) {
        await trigger(QUEUES.ASSESSMENT_GENERATE, { materialId: m.id, topic: m.topic, gradeLevel: m.gradeLevel, questionCount: 5 }, `assessment:${m.topic}`);
      }
      if (materials.length === 0) results.push({ stage: "assessment", status: "skipped (no ready materials)" });
    }

    if (want.includes("schedule")) {
      await trigger(QUEUES.SCHEDULER_ASSIGN, { studentId: student.id, weekStart: new Date().toISOString() }, "schedule");
    }

    return NextResponse.json({ ok: true, student: student.studentId, mode: redisOk ? "bullmq" : "local", results });
  } catch (error) {
    console.error("[api/students] Pipeline error:", error);
    return NextResponse.json({ error: "Pipeline failed" }, { status: 500 });
  }
}
