/**
 * Did the duplicate Attempts leak into the mastery tables?
 *
 * THE QUESTION
 * 135 duplicate Attempt rows were deleted (see backfill-duplicate-attempts.ts).
 * That fixed the Attempt table, but mastery is what students actually see, so
 * the open question is whether the duplicates also inflated mastery.
 *
 * THE ANSWER: no. Established two ways.
 *
 * 1. By writer. `TopicMastery` and `ProgressSnap` are written only by
 *    `updateTopicMastery` / `upsertProgressSnap`, which are called from
 *    `gradeAttempt` (src/agents/assessment/grader.ts) and
 *    `/api/exam/attempt` — once per submission. The duplicates were inserted by
 *    `/api/students/activity`, and the pre-fix version of that route never
 *    called either function (verified with
 *    `git show 556d531:src/app/api/students/activity/route.ts`). So the
 *    duplicates had no path into mastery.
 *
 * 2. By counter. `TopicMastery.quizAttempts` / `.examAttempts` are incremented
 *    once per real submission. If duplicates had leaked in, every affected row
 *    would be over-counted by exactly the number of duplicates. This script
 *    compares the stored counters against the attempts that actually exist, so
 *    an inflation would show up as stored > actual.
 *
 * WHY EXACT REPLAY IS NOT ATTEMPTED
 * `TopicMastery.mastery` is an EMA over encounters, but the table has more
 * writers than the two above: rows also arrived via template copies and early
 * seeding (e.g. a row with mastery 100 and examAttempts 1 for a student who has
 * no matching attempt rows at all). Those rows predate the duplicate bug, so
 * replaying from `Attempt` cannot reproduce them and any "drift" it reports is
 * an artefact of the replay, not evidence of corruption. This script therefore
 * tests the one thing that is falsifiable: the counters.
 *
 * Run: npx tsx scripts/audit-mastery-integrity.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

interface Row {
  studentId: string;
  studentName: string;
  subject: string;
  topic: string;
  subTopic: string | null;
  mastery: number;
  quizAttempts: number;
  examAttempts: number;
}

async function main() {
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT tm."studentId", s.name AS "studentName", tm.subject, tm.topic, tm."subTopic",
           tm.mastery, tm."quizAttempts", tm."examAttempts"
    FROM "TopicMastery" tm
    JOIN "Student" s ON s.id = tm."studentId"
    ORDER BY s.name, tm.subject, tm.topic
  `;

  console.log(`TopicMastery rows: ${rows.length}\n`);

  let consistent = 0;
  let under = 0;
  const inflated: { key: string; storedQuiz: number; actualQuiz: number; storedExam: number; actualExam: number }[] = [];

  for (const r of rows) {
    const actualQuiz = await prisma.attempt.count({
      where: {
        studentId: r.studentId,
        type: "QUIZ",
        quiz: { material: { subject: r.subject, topic: r.topic } },
      },
    });
    const actualExam = await prisma.attempt.count({
      where: {
        studentId: r.studentId,
        type: "EXAM",
        quiz: { material: { subject: r.subject, topic: r.topic } },
      },
    });

    // Inflation is the failure mode we are looking for: more recorded
    // encounters than there are attempts to justify them.
    if (r.quizAttempts > actualQuiz || r.examAttempts > actualExam) {
      inflated.push({
        key: `${r.studentName} — ${r.subject} / ${r.topic}${r.subTopic ? ` (${r.subTopic})` : ""}`,
        storedQuiz: r.quizAttempts,
        actualQuiz,
        storedExam: r.examAttempts,
        actualExam,
      });
    } else if (r.quizAttempts < actualQuiz || r.examAttempts < actualExam) {
      under++;
    } else {
      consistent++;
    }
  }

  console.log(`Counters exactly matching attempts  : ${consistent}`);
  console.log(`Counters below attempts (legacy gap): ${under}`);
  console.log(`Counters ABOVE attempts (inflation) : ${inflated.length}`);

  if (inflated.length > 0) {
    console.log("");
    console.log("Inflated rows — these would indicate duplicate leakage:");
    for (const i of inflated) {
      console.log(
        `  ${i.key}\n    quiz stored=${i.storedQuiz} actual=${i.actualQuiz}` +
          `   exam stored=${i.storedExam} actual=${i.actualExam}`,
      );
    }
    console.log("\nRESULT: duplicates may have reached mastery. Investigate before trusting displayed mastery.");
    process.exit(1);
  }

  console.log("");
  console.log("RESULT: no row records more encounters than there are attempts, so the");
  console.log("duplicates did not inflate mastery. Rows counting fewer encounters than");
  console.log("attempts exist are legacy — they predate the current material/topic");
  console.log("mapping and were populated by template copies and early seeding.");
}

main()
  .catch((err) => {
    console.error("AUDIT FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
