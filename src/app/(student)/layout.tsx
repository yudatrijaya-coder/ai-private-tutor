import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";
import StudentLayoutClient from "./StudentLayoutClient";

async function getStats(studentId: string) {
  // Streak: count of unique distinct dates with any activity
  const activityDates = await prisma.studentActivity.findMany({
    where: { studentId },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const uniqueDates = new Set<string>();
  for (const a of activityDates) {
    uniqueDates.add(a.createdAt.toISOString().slice(0, 10));
  }

  // Stars: count of quiz_complete + exam_complete activities
  const stars = await prisma.studentActivity.count({
    where: {
      studentId,
      type: { in: ["quiz_complete", "exam_complete"] },
    },
  });

  // Calculate consecutive-day streak
  const sortedDates = Array.from(uniqueDates).sort().reverse();
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  // Start from today or yesterday
  let checkDate = new Date(today);
  if (sortedDates[0] !== todayStr) {
    // If no activity today, check if yesterday has activity
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < sortedDates.length; i++) {
    const expected = new Date(checkDate);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);
    if (sortedDates.includes(expectedStr)) {
      streak++;
    } else {
      break;
    }
  }

  return { streak, stars };
}

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getStudentSession();
  let streak = 0;
  let stars = 0;

  if (session) {
    const stats = await getStats(session.studentId);
    streak = stats.streak;
    stars = stats.stars;
  }

  return (
    <StudentLayoutClient streak={streak} stars={stars}>
      {children}
    </StudentLayoutClient>
  );
}
