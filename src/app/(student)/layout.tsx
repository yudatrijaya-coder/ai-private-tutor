import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/student";
import StudentLayoutClient from "./StudentLayoutClient";

async function getStats(studentId: string) {
  // Use gamification data from Student table (consistent with gamification engine)
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { xp: true, currentStreak: true },
  });

  return {
    streak: student?.currentStreak ?? 0,
    stars: student?.xp ?? 0,
  };
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
