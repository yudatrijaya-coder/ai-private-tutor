/**
 * Update all students' scheduleConfig with new per-day schedule.
 *
 * Mon/Wed/Fri: INTENSIVE 19:00-21:00 (120 min)
 * Tue/Thu/Sun: DAILY 19:30-20:00 (30 min)
 * Sat: off
 */
import { prisma } from "../src/lib/prisma";

const NEW_CONFIG = {
  days: {
    monday:    { type: "INTENSIVE", start: "19:00", duration: 120 },
    tuesday:   { type: "DAILY",     start: "19:30", duration: 30 },
    wednesday: { type: "INTENSIVE", start: "19:00", duration: 120 },
    thursday:  { type: "DAILY",     start: "19:30", duration: 30 },
    friday:    { type: "INTENSIVE", start: "19:00", duration: 120 },
    saturday:  { exclude: true },
    sunday:    { type: "DAILY",     start: "19:30", duration: 30 },
  },
};

async function main() {
  const students = await prisma.student.findMany({
    where: { isTemplate: false },
    select: { id: true, name: true },
  });

  for (const s of students) {
    await prisma.student.update({
      where: { id: s.id },
      data: { scheduleConfig: NEW_CONFIG as any },
    });
    console.log(`✅ ${s.name} — scheduleConfig updated`);
  }

  // Also update template students (Raihan, SHOFI, Syifa)
  const templates = await prisma.student.findMany({
    where: { isTemplate: true },
    select: { id: true, name: true },
  });

  for (const s of templates) {
    await prisma.student.update({
      where: { id: s.id },
      data: { scheduleConfig: NEW_CONFIG as any },
    });
    console.log(`✅ ${s.name} (template) — scheduleConfig updated`);
  }

  console.log(`\nDone. ${students.length + templates.length} students updated.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
