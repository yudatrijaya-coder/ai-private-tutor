import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { SkeletonBlock } from "@/components/Skeleton";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function CurriculumTable() {
  const students = await prisma.student.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      curriculums: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          materials: { orderBy: { weekOrder: "asc" }, take: 100 },
        },
      },
    },
  });

  const gradeLabels: Record<string, string> = {
    SD_5: "SD Kelas 5",
    SMP_1: "SMP Kelas 1",
    SMA_2: "SMA Kelas 2",
  };

  return (
    <div className="space-y-6">
      {students.length === 0 && (
        <p style={{ color: "var(--su-text-dim)" }}>Belum ada murid.</p>
      )}
      {students.map((student) => {
        const curriculum = student.curriculums[0];
        return (
          <div
            key={student.id}
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: "var(--su-bg-card)",
              border: "1px solid var(--su-border)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: "var(--su-border)" }}
            >
              <div>
                <Link
                  href={`/dashboard/students/${student.id}`}
                  className="font-semibold hover:underline"
                  style={{ fontFamily: "var(--font-display)", fontSize: 16 }}
                >
                  {student.name}
                </Link>
                <span
                  className="ml-2 text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: "rgba(59,130,246,0.12)",
                    color: "var(--su-info)",
                  }}
                >
                  {gradeLabels[student.gradeLevel] ?? student.gradeLevel}
                </span>
              </div>
              {curriculum && (
                <span
                  className="text-xs"
                  style={{ color: "var(--su-text-dim)" }}
                >
                  v{curriculum.version} · {curriculum.materials.length} materi
                </span>
              )}
            </div>

            {/* Material list */}
            {curriculum && curriculum.materials.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="text-xs uppercase tracking-wider"
                      style={{ color: "var(--su-text-dim)" }}
                    >
                      <th className="text-left px-4 py-2 font-medium">#</th>
                      <th className="text-left px-4 py-2 font-medium">Mapel</th>
                      <th className="text-left px-4 py-2 font-medium">Topik</th>
                      <th className="text-left px-4 py-2 font-medium">
                        Sub Topik
                      </th>
                      <th className="text-left px-4 py-2 font-medium">Minggu</th>
                      <th className="text-left px-4 py-2 font-medium">
                        Status
                      </th>
                      <th className="text-left px-4 py-2 font-medium">
                        Delivery
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {curriculum.materials.map((m, i) => (
                      <tr
                        key={m.id}
                        className="border-t"
                        style={{ borderColor: "var(--su-border)" }}
                      >
                        <td className="px-4 py-2" style={{ color: "var(--su-text-dim)" }}>
                          {i + 1}
                        </td>
                        <td className="px-4 py-2">{m.subject}</td>
                        <td className="px-4 py-2">{m.topic}</td>
                        <td className="px-4 py-2">{m.subTopic}</td>
                        <td className="px-4 py-2">{m.weekOrder}</td>
                        <td className="px-4 py-2">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="px-4 py-2">
                          <DeliveryBadge delivery={m.delivery} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5 text-center" style={{ color: "var(--su-text-dim)" }}>
                {curriculum
                  ? "Kurikulum sudah dibuat tapi belum ada materi."
                  : "Belum ada kurikulum. Tambah via halaman murid atau API."}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    DRAFT: { bg: "rgba(100,116,139,0.12)", fg: "var(--su-text-dim)" },
    RAW: { bg: "rgba(59,130,246,0.12)", fg: "var(--su-info)" },
    PROCESSED: { bg: "rgba(245,158,11,0.12)", fg: "var(--su-warning)" },
    VIDEO_READY: { bg: "rgba(34,197,94,0.12)", fg: "var(--su-success)" },
    READY: { bg: "rgba(34,197,94,0.12)", fg: "var(--su-success)" },
  };
  const c = colors[status] ?? { bg: "rgba(100,116,139,0.12)", fg: "var(--su-text-dim)" };
  return (
    <span
      className="inline-block text-xs px-2 py-0.5 rounded font-medium"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {status}
    </span>
  );
}

function DeliveryBadge({ delivery }: { delivery: string }) {
  const icons: Record<string, string> = { TEXT: "📄", VIDEO: "🎬", TEXT_AND_VIDEO: "📄🎬" };
  return <span>{icons[delivery] ?? delivery}</span>;
}

export default function CurriculumPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          📚 Kurikulum
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
          Daftar kurikulum dan materi per murid
        </p>
      </div>
      <Suspense fallback={<SkeletonBlock width="100%" height="8rem" />}>
        <CurriculumTable />
      </Suspense>
    </div>
  );
}
