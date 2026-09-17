import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueue } from "@/queue/runner";
import { enqueueLocal } from "@/queue/local";
import { QUEUES } from "@/queue/definitions";
import { redis } from "@/queue/redis";
import { resolveScope, isAdmin } from "@/lib/auth/scope";
import { getActiveCurriculumId } from "@/lib/curriculum-active";

/**
 * GET /api/students — List all students.
 *
 * Admin only: this returns every student record, so it must never be reachable
 * with a student credential (or anonymously — see src/middleware.ts).
 */
export async function GET() {
  if (!isAdmin(await resolveScope())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    // Never ship password hashes, not even to admins: the dashboard has no use
    // for them, and a leaked admin session should not hand over offline-crackable
    // bcrypt hashes for every student in the system.
    const safe = students.map(({ passwordHash: _hash, ...rest }) => rest);

    return NextResponse.json({ students: safe });
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
  if (!isAdmin(await resolveScope())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      ? ["curriculum", "content", "assessment", "guardian", "schedule"]
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
      // Check if curriculum already exists — call generateCurriculumDraft directly
      const existingCurriculum = await prisma.curriculum.findFirst({
        where: { studentId: student.id },
        orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      });
      if (existingCurriculum) {
        results.push({ stage: "curriculum", status: "skipped (already exists)" });
      } else {
        const { generateCurriculumDraft } = await import("@/agents/curriculum/service");
        await generateCurriculumDraft(student.id);
        results.push({ stage: "curriculum", status: "generated" });
      }
    }

    if (want.includes("content")) {
      // Active curriculum only — queueing across every curriculum would re-scrape
      // stale rows the student no longer sees. See `src/lib/curriculum-active.ts`.
      const activeCurriculumId = await getActiveCurriculumId(student.id);
      const materials = activeCurriculumId
        ? await prisma.material.findMany({
            where: {
              curriculumId: activeCurriculumId,
              status: { in: ["DRAFT", "RAW"] },
            },
          })
        : [];
      for (const m of materials) {
        await trigger(
          QUEUES.CONTENT_SCRAPE,
          { materialId: m.id, topic: m.topic, subTopic: m.subTopic, gradeLevel: m.gradeLevel, sources: [] },
          `content:${m.topic}`,
        );
      }
      if (materials.length === 0) results.push({ stage: "content", status: "skipped (no pending materials)" });
    }

    if (want.includes("assessment")) {
      const activeCurriculumId = await getActiveCurriculumId(student.id);
      const materials = activeCurriculumId
        ? await prisma.material.findMany({
            where: { curriculumId: activeCurriculumId, status: "READY" },
            include: { _count: { select: { quizzes: true } } },
          })
        : [];
      let queued = 0;
      for (const m of materials) {
        if (m._count.quizzes > 0) {
          results.push({ stage: `assessment:${m.topic}`, status: "skipped (quizzes exist)" });
          continue;
        }
        await trigger(
          QUEUES.ASSESSMENT_GENERATE,
          { studentId: student.id, materialId: m.id, topic: m.topic, gradeLevel: m.gradeLevel, questionCount: 5 },
          `assessment:${m.topic}`,
        );
        queued++;
      }
      if (materials.length === 0) results.push({ stage: "assessment", status: "skipped (no ready materials)" });
      else if (queued === 0) results.push({ stage: "assessment", status: "all materials already have quizzes" });
    }

    if (want.includes("guardian")) {
      // Queue a weekly report for the student (last 7 days)
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);
      await trigger(
        QUEUES.GUARDIAN_REPORT,
        {
          studentId: student.id,
          periodStart: startDate.toISOString(),
          periodEnd: endDate.toISOString(),
        },
        "guardian",
      );
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
