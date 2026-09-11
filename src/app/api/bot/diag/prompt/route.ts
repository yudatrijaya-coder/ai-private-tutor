import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "@/bot/agent/tutor";

/**
 * Inspect the exact system prompt the tutor LLM receives for one student.
 *
 * Exists because prompt regressions are invisible from the outside: the bot's
 * replies only reveal what the model inferred, not what it was told. Use it to
 * confirm injected knowledge (progress data, subscription/trial facts,
 * capabilities) is actually present at runtime.
 *
 * Guarded by CRON_SECRET (same scheme as the cron routes):
 *   curl -H "x-cron-secret: $CRON_SECRET" \
 *     "http://localhost:3000/api/bot/diag/prompt?studentId=TIUMU001"
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json(
      { error: "Missing ?studentId= (login ID, e.g. TIUMU001)" },
      { status: 400 },
    );
  }

  const student = await prisma.student.findUnique({ where: { studentId } });
  if (!student) {
    return NextResponse.json({ error: `Student not found: ${studentId}` }, { status: 404 });
  }

  const prompt = await buildSystemPrompt(student);

  return NextResponse.json({
    studentId: student.studentId,
    name: student.name,
    status: student.status,
    trialEndsAt: student.trialEndsAt,
    promptChars: prompt.length,
    prompt,
  });
}
