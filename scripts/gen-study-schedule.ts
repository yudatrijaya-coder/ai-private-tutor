/**
 * Generate study schedule for all students
 * Pattern:
 *   - Mon–Sat 19:30 WIB — Daily session (15 min)
 *   - Mon/Wed/Fri 19:30–21:00 WIB — Intensive session (90 min)
 *
 * Run: npx tsx scripts/gen-study-schedule.ts
 */
import { prisma } from "../src/lib/prisma";

const WIB_OFFSET = 7 * 60 * 60 * 1000; // UTC+7 in ms

function formatWIB(d: Date): string {
  return new Date(d.getTime() + WIB_OFFSET).toISOString().replace("Z", "+07:00");
}

async function main() {
  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, studentId: true, telegramId: true },
  });

  console.log(`Found ${students.length} active students\n`);

  // WIB now
  const now = new Date();
  const nowWIB = new Date(now.getTime() + WIB_OFFSET);

  // Find next Monday (weekStartsOn=1)
  const dayOfWeek = nowWIB.getDay(); // 0=Sun, 1=Mon...
  let daysUntilMonday = (8 - dayOfWeek) % 7;
  if (daysUntilMonday === 0) daysUntilMonday = 7;

  const monday = new Date(nowWIB);
  monday.setDate(monday.getDate() + daysUntilMonday);
  monday.setHours(0, 0, 0, 0);
  const mondayUTC = new Date(monday.getTime() - WIB_OFFSET);

  console.log(`Today (WIB): ${formatWIB(now)}`);
  console.log(`Next Monday: ${formatWIB(mondayUTC)}`);
  console.log(`Generating for 2 weeks: ${monday.toISOString().slice(0, 10)} - ${new Date(monday.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}\n`);

  const intensiveDays = [1, 3, 5]; // Mon, Wed, Fri

  let totalCreated = 0;

  for (const student of students) {
    // Also update scheduleConfig
    await prisma.student.update({
      where: { id: student.id },
      data: {
        scheduleConfig: {
          sessionsPerDay: 2,
          preferredTime: "19:30",
          excludeDays: ["sunday"],
          customTimes: {
            monday: "19:30",
            tuesday: "19:30",
            wednesday: "19:30",
            thursday: "19:30",
            friday: "19:30",
            saturday: "19:30",
          },
        },
      },
    });

    // Remove existing SCHEDULED sessions for this student
    const deleted = await prisma.scheduleSession.deleteMany({
      where: {
        studentId: student.id,
        status: "SCHEDULED",
        scheduledAt: { gte: new Date() },
      },
    });

    const sessions: Array<{
      studentId: string;
      type: "DAILY" | "INTENSIVE";
      scheduledAt: Date;
      durationMin: number;
      status: "SCHEDULED";
    }> = [];

    // Generate for 2 weeks
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const day = new Date(monday);
      day.setDate(day.getDate() + dayOffset);
      const dow = day.getDay(); // 0=Sun, 1=Mon...

      // Skip Sunday
      if (dow === 0) continue;

      // Daily session at 19:30 WIB (15 min)
      const dailyWIB = new Date(day);
      dailyWIB.setHours(19, 30, 0, 0);
      const dailyUTC = new Date(dailyWIB.getTime() - WIB_OFFSET);

      sessions.push({
        studentId: student.id,
        type: "DAILY",
        scheduledAt: dailyUTC,
        durationMin: 15,
        status: "SCHEDULED",
      });

      // Intensive session on Mon/Wed/Fri 19:30-21:00 (90 min)
      if (intensiveDays.includes(dow)) {
        const intensiveWIB = new Date(day);
        intensiveWIB.setHours(19, 30, 0, 0);
        const intensiveUTC = new Date(intensiveWIB.getTime() - WIB_OFFSET);

        sessions.push({
          studentId: student.id,
          type: "INTENSIVE",
          scheduledAt: intensiveUTC,
          durationMin: 90,
          status: "SCHEDULED",
        });
      }
    }

    if (sessions.length > 0) {
      await prisma.scheduleSession.createMany({ data: sessions });
      totalCreated += sessions.length;
      console.log(
        `✅ ${student.name} (${student.studentId}): ${sessions.length} sessions ` +
        `(daily ${sessions.filter(s => s.type === "DAILY").length}, ` +
        `intensive ${sessions.filter(s => s.type === "INTENSIVE").length}) ` +
        `[cleared ${deleted.count} old]`
      );
    }
  }

  console.log(`\n🎉 Total: ${totalCreated} sessions created across ${students.length} students`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
