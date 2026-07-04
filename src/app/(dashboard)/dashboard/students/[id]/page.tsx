import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StudentDetailView } from "./StudentDetailView";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      scheduleSessions: {
        orderBy: { scheduledAt: "asc" },
        take: 14,
      },
      progressSnaps: {
        orderBy: { snapDate: "desc" },
        take: 30,
      },
      interventions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      curriculums: {
        include: {
          materials: {
            take: 20,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!student) notFound();

  return <StudentDetailView student={student} />;
}
