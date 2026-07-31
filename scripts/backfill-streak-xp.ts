/**
 * One-time backfill: reconstruct streak + historical XP from StudentActivity.
 *
 * Why: gamification went live 31 Jul 2026. Every activity logged before that
 * was never scored, so students who had been studying for weeks showed xp=0
 * and currentStreak=0. This walks each student's real activity history and
 * awards what the engine would have awarded had it been running all along.
 *
 * Idempotency: writes a marker activity row of type "xp_backfill" per student.
 * Re-running skips anyone who already has that marker, so it is safe to run
 * twice. Badge XP is NOT re-awarded here — scripts/backfill-badges.ts owns that
 * and already ran; this only covers per-activity XP + streak reconstruction.
 *
 * Day boundaries use UTC to match src/lib/gamification.ts updateStreak().
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  database: "ai_private_tutor",
  user: "tutor",
  password: "tutor123",
});
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const MARKER = "xp_backfill";

// Must mirror XP_RULES in src/lib/gamification.ts
const XP_RULES: Record<string, number> = {
  quiz_complete: 25,
  quiz_perfect: 50,
  slide_view: 5,
  mindmap_view: 5,
  video_click: 5,
  exam_complete: 100,
  streak_day: 10,
};

function utcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("=== DRY RUN — no writes ===\n");

  const students = await db.student.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, xp: true, currentStreak: true, longestStreak: true },
    orderBy: { name: "asc" },
  });

  for (const s of students) {
    const already = await db.studentActivity.count({
      where: { studentId: s.id, type: MARKER },
    });
    if (already > 0) {
      console.log(`${s.name}: already backfilled, skipping`);
      continue;
    }

    const acts = await db.studentActivity.findMany({
      where: { studentId: s.id, type: { not: MARKER } },
      select: { type: true, metadata: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    if (acts.length === 0) {
      console.log(`${s.name}: no activity, skipping`);
      continue;
    }

    // --- Activity XP ---
    let activityXp = 0;
    for (const a of acts) {
      const m = a.metadata as Record<string, unknown> | null;
      const isPerfect =
        a.type === "quiz_complete" &&
        m != null &&
        typeof m === "object" &&
        Number(m.score) === Number(m.maxScore) &&
        Number.isFinite(Number(m.score));
      activityXp += isPerfect ? XP_RULES.quiz_perfect : (XP_RULES[a.type] ?? 0);
    }

    // --- Streak reconstruction over distinct UTC days ---
    const days = [...new Set(acts.map((a) => utcDay(a.createdAt)))].sort((x, y) => x - y);

    let longest = 1;
    let run = 1;
    for (let i = 1; i < days.length; i++) {
      const gap = Math.round((days[i] - days[i - 1]) / 86_400_000);
      if (gap === 1) run += 1;
      else run = 1;
      if (run > longest) longest = run;
    }

    // Current streak: only alive if the last active day is today or yesterday (UTC)
    const todayUTC = utcDay(new Date());
    const lastDay = days[days.length - 1];
    const daysSinceLast = Math.round((todayUTC - lastDay) / 86_400_000);

    let current = 0;
    if (daysSinceLast <= 1) {
      current = 1;
      for (let i = days.length - 1; i > 0; i--) {
        const gap = Math.round((days[i] - days[i - 1]) / 86_400_000);
        if (gap === 1) current += 1;
        else break;
      }
    }

    // Streak XP: 10 per distinct active day, matching one award per UTC day
    const streakXp = days.length * XP_RULES.streak_day;
    const totalNewXp = activityXp + streakXp;

    console.log(
      `${s.name}: ${acts.length} acts over ${days.length} days | ` +
        `activityXP=${activityXp} streakXP=${streakXp} → +${totalNewXp} ` +
        `(xp ${s.xp}→${s.xp + totalNewXp}) | streak ${s.currentStreak}→${current} ` +
        `longest ${s.longestStreak}→${Math.max(longest, s.longestStreak)} ` +
        `| lastActive ${new Date(lastDay).toISOString().slice(0, 10)} (${daysSinceLast}d ago)`,
    );

    if (dryRun) continue;

    await db.student.update({
      where: { id: s.id },
      data: {
        xp: { increment: totalNewXp },
        currentStreak: current,
        longestStreak: Math.max(longest, s.longestStreak),
        // Store the real last-activity timestamp, normalised to UTC midnight of
        // that day. This also repairs rows written by the pre-fix local-midnight
        // code path.
        lastActivityDate: new Date(lastDay),
      },
    });

    await db.studentActivity.create({
      data: {
        studentId: s.id,
        type: MARKER,
        metadata: {
          activityXp,
          streakXp,
          totalNewXp,
          activeDays: days.length,
          activitiesScanned: acts.length,
          reconstructedStreak: current,
          reconstructedLongest: Math.max(longest, s.longestStreak),
          ranAt: new Date().toISOString(),
        },
      },
    });
  }

  console.log("\nDone.");
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Backfill failed:", err);
  await db.$disconnect();
  process.exit(1);
});
