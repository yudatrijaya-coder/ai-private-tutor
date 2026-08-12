import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/exam/apply-plan
 * Body: { planId: string }
 *
 * Transitions an ImprovementPlan from DRAFT → APPLIED
 * and creates new ScheduleSession entries based on recommendedSch.
 */
export async function POST(request: NextRequest) {
  try {
    const { planId } = await request.json();

    if (!planId) {
      return NextResponse.json(
        { error: "Missing required: planId" },
        { status: 400 }
      );
    }

    // 1. Fetch the ImprovementPlan
    const plan = await prisma.improvementPlan.findUnique({
      where: { id: planId },
      include: { student: true },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "ImprovementPlan not found" },
        { status: 404 }
      );
    }

    if (plan.status === "APPLIED") {
      return NextResponse.json(
        { error: "Plan already applied" },
        { status: 409 }
      );
    }

    // 2. Parse recommendedSch and create ScheduleSession entries
    const recommendations = plan.recommendedSch as Array<{
      topic: string;
      subject: string;
      durationMin?: number;
      priority?: string;
      reason?: string;
    }>;

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      return NextResponse.json(
        { error: "No schedule recommendations found in plan" },
        { status: 422 }
      );
    }

    // Schedule sessions starting from tomorrow, one per day
    const now = new Date();
    const sessionsToCreate = recommendations.map((rec, idx) => {
      const scheduledAt = new Date(now);
      scheduledAt.setDate(scheduledAt.getDate() + idx + 1); // +1 day offset per session
      scheduledAt.setHours(16, 0, 0, 0); // Default 4 PM WIB

      return {
        studentId: plan.studentId,
        type: "INTENSIVE" as const,
        topic: rec.topic || "Review",
        subject: rec.subject || "",
        scheduledAt,
        durationMin: rec.durationMin || 30,
        status: "SCHEDULED" as const,
        metadata: {
          source: "improvement_plan",
          planId: plan.id,
          priority: rec.priority || "medium",
          reason: rec.reason || "",
        },
      };
    });

    // 3. Create sessions in batch
    const created = await prisma.scheduleSession.createMany({
      data: sessionsToCreate,
    });

    // 4. Update plan status to APPLIED
    await prisma.improvementPlan.update({
      where: { id: planId },
      data: { status: "APPLIED" },
    });

    return NextResponse.json({
      success: true,
      planId,
      status: "APPLIED",
      sessionsCreated: created.count,
    });
  } catch (err) {
    console.error("Error applying improvement plan:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/exam/apply-plan?studentId=xxx
 * Returns all ImprovementPlans for a student
 */
export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "Missing required: studentId" },
        { status: 400 }
      );
    }

    const plans = await prisma.improvementPlan.findMany({
      where: { studentId },
      include: {
        attempt: {
          include: { exam: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ plans });
  } catch (err) {
    console.error("Error fetching improvement plans:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
