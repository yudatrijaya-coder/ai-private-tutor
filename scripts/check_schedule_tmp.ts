import { prisma } from "../src/lib/prisma";

async function main() {
  const scheds = await prisma.examSchedule.findMany({
    include: { exam: true, student: { select: { name: true, studentId: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  for (const s of scheds) {
    console.log(JSON.stringify({
      student: s.student.studentId,
      name: s.student.name,
      exam: s.exam.title,
      subject: s.exam.subject,
      weekNumber: s.exam.weekNumber,
      scheduledAt: s.scheduledAt.toISOString(),
      status: s.status,
      remindedH1: s.remindedH1,
      remindedH0: s.remindedH0,
    }));
  }
}
main().finally(() => process.exit(0));
