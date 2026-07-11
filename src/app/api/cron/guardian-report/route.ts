/**
 * Guardian Report Cron — API endpoint for triggering weekly guardian
 * reports for all active students.
 *
 * Designed to be called by a cron job (Hermes cron or system crontab).
 * GET /api/cron/guardian-report?token=<SECRET>
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueue } from "@/queue/runner";
import { QUEUES } from "@/queue/definitions";
import { redis } from "@/queue/redis";
import { enqueueLocal } from "@/queue/local";

const CRON_SECRET = process.env.CRON_SECRET || "guardian-weekly-secret";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, studentId: true, name: true, parentTelegramId: true },
  });

  let redisOk = false;
  try {
    await redis.ping();
    redisOk = true;
  } catch { /* ignore */ }

  const results: { studentId: string; name: string; status: string }[] = [];

  for (const s of students) {
    try {
      if (redisOk) {
        await enqueue({
          queue: QUEUES.GUARDIAN_REPORT,
          data: {
            studentId: s.id,
            periodStart: startDate.toISOString(),
            periodEnd: endDate.toISOString(),
          },
        });
      } else {
        enqueueLocal(QUEUES.GUARDIAN_REPORT.name, {
          studentId: s.id,
          periodStart: startDate.toISOString(),
          periodEnd: endDate.toISOString(),
        });
      }
      results.push({ studentId: s.studentId, name: s.name, status: "queued" });
    } catch (err) {
      results.push({
        studentId: s.studentId,
        name: s.name,
        status: `error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    total: students.length,
    results,
  });
}
