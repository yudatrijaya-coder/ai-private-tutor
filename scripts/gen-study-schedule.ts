/**
 * Generate study schedule for all students
 * Pattern:
 *   - Mon–Sat 19:30 WIB — Daily session (15 min)
 *   - Mon/Wed/Fri 19:30–21:00 WIB — Intensive session (90 min)
 *
 * IMPORTANT: Server is UTC+8 (Asia/Shanghai).
 * All Date math uses UTC methods (setUTCHours) to avoid locale bugs.
 *
 * Run: npx tsx scripts/gen-study-schedule.ts
 */
import { prisma } from "../src/lib/prisma";

const WIB_OFFSET = 7 * 60 * 60 * 1000; // UTC+7 in ms
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatWIB(d: Date): string {
  return new Date(d.getTime() + WIB_OFFSET).toISOString().replace("Z", "+07:00");
}

function getWIBDate(d: Date): number {
  // Returns day-of-week (0=Sun) in WIB
  return new Date(d.getTime() + WIB_OFFSET).getUTCDay();
}

/** Start of "today" in WIB (00:00:00.000 WIB) as UTC epoch ms */
function wibTodayStart(now: Date): number {
  const wibMs = now.getTime() + WIB_OFFSET;
  // Floor to start of day in WIB
  const wibStartOfDay = wibMs - (wibMs % MS_PER_DAY);
  return wibStartOfDay; // this is still in WIB-scale ms
}

/** Convert WIB-scale epoch back to UTC */
function wibToUtc(wibEpoch: number): Date {
  return new Date(wibEpoch - WIB_OFFSET);
}

async function main() {
  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, studentId: true, telegramId: true },
  });

  console.log(`Found ${students.length} active students\n`);

  const now = new Date();
  const nowWIB = new Date(now.getTime() + WIB_OFFSET);
  const todayStartWIB = wibTodayStart(now);

  // Determine start day (WIB)
  const dow = getWIBDate(now); // 0=Sun
  let startDayWIB: number;
  if (dow >= 1 && dow <= 6) {
    // Mon-Sat: start today
    startDayWIB = todayStartWIB;
  } else {
    // Sunday: start next Monday
    startDayWIB = todayStartWIB + MS_PER_DAY;
  }

  console.log(`Now (UTC):   ${now.toISOString()}`);
  console.log(`Now (WIB):   ${formatWIB(now)}`);
  console.log(`Start day:   ${formatWIB(wibToUtc(startDayWIB))}`);
  console.log(`Generating 2 weeks: ${formatWIB(wibToUtc(startDayWIB))} — ${formatWIB(wibToUtc(startDayWIB + 14 * MS_PER_DAY))}\n`);

  const intensiveDays = [1, 3, 5]; // Mon, Wed, Fri

  let totalCreated = 0;

  for (const student of students) {
    // Update scheduleConfig
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

    // Generate 14 days
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const dayStartWIB = startDayWIB + dayOffset * MS_PER_DAY;
      // Get WIB day-of-week
      const dowWIB = new Date(dayStartWIB + WIB_OFFSET).getUTCDay();

      // Skip Sunday
      if (dowWIB === 0) continue;

      // Daily session 19:30 WIB (15 min)
      const dailyWIB = dayStartWIB + (19 * 60 + 30) * 60 * 1000;
      const dailyUTC = wibToUtc(dailyWIB);

      // Skip if already past (for today)
      if (dailyUTC.getTime() < now.getTime() - 5 * 60 * 1000) {
        console.log(`  ${student.name}: skipping past daily at ${formatWIB(dailyUTC)}`);
        continue; // Skip past sessions
      }

      sessions.push({
        studentId: student.id,
        type: "DAILY",
        scheduledAt: dailyUTC,
        durationMin: 15,
        status: "SCHEDULED",
      });

      // Intensive session Mon/Wed/Fri 19:30-21:00 (90 min)
      if (intensiveDays.includes(dowWIB)) {
        const intensiveStartWIB = dayStartWIB + (19 * 60 + 30) * 60 * 1000;
        const intensiveUTC = wibToUtc(intensiveStartWIB);

        if (intensiveUTC.getTime() >= now.getTime() - 5 * 60 * 1000) {
          sessions.push({
            studentId: student.id,
            type: "INTENSIVE",
            scheduledAt: intensiveUTC,
            durationMin: 90,
            status: "SCHEDULED",
          });
        } else {
          console.log(`  ${student.name}: skipping past intensive at ${formatWIB(intensiveUTC)}`);
        }
      }
    }

    // Batch insert
    if (sessions.length > 0) {
      await prisma.scheduleSession.createMany({ data: sessions });
    }

    const dailyCount = sessions.filter((s) => s.type === "DAILY").length;
    const intensiveCount = sessions.filter((s) => s.type === "INTENSIVE").length;
    console.log(
      `✅ ${student.name} (${student.studentId}): ${sessions.length} sessions (daily ${dailyCount}, intensive ${intensiveCount}) [cleared ${deleted.count} old]`,
    );
    totalCreated += sessions.length;
  }

  console.log(`\n🎉 Total: ${totalCreated} sessions created across ${students.length} students`);

  await prisma.$disconnect();
}

main();
