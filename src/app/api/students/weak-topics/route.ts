import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";

/**
 * GET /api/students/weak-topics
 * Returns the student's weak topics (severe/moderate) with mastery % and,
 * when available, the id of a quiz for that topic so the UI can start a
 * drill session directly. Auth: student JWT cookie.
 */
export async function GET() {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weak = await prisma.topicMastery.findMany({
    where: { studentId: session.studentId, weaknessLevel: { not: "none" } },
    orderBy: { mastery: "asc" },
    take: 6,
    select: { topic: true, subject: true, mastery: true, weaknessLevel: true },
  });

  const quizzes = await prisma.quiz.findMany({
    where: { studentId: session.studentId },
    select: { id: true, material: { select: { topic: true, subject: true } } },
  });

  const byTopic = new Map<string, string>();
  for (const q of quizzes) {
    const t = q.material?.topic;
    if (t && !byTopic.has(t)) byTopic.set(t, q.id);
  }

  const rows = weak.map((w) => ({
    topic: w.topic,
    subject: w.subject,
    mastery: Math.round(w.mastery),
    weaknessLevel: w.weaknessLevel,
    quizId: byTopic.get(w.topic) ?? null,
  }));

  return NextResponse.json({ weakTopics: rows });
}
