import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StudentDetailView } from "./StudentDetailView";
import { SkeletonStudentDetail } from "@/components/Skeleton";

export const dynamic = "force-dynamic";

/* ── Detail content ── */

async function StudentDetailContent({ id }: { id: string }) {
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

/* ── Page ── */

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<SkeletonStudentDetail />}>
      <StudentDetailContent id={id} />
    </Suspense>
  );
}
