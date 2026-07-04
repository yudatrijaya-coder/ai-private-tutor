import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { StudentCard } from "./StudentCard";
import { StatsBar } from "./StatsBar";
import { SkeletonStatsBar, SkeletonCard } from "@/components/Skeleton";

export const dynamic = "force-dynamic";

/* ── Stats section with its own data fetching ── */

async function StatsSection() {
  const students = await prisma.student.findMany({
    orderBy: { createdAt: "desc" },
  });

  const totalSessions = students.length
    ? await prisma.scheduleSession.count()
    : 0;
  const missedSessions = students.length
    ? await prisma.scheduleSession.count({ where: { status: "MISSED" } })
    : 0;

  return (
    <StatsBar
      totalStudents={students.length}
      activeStudents={students.filter((s) => s.status === "ACTIVE").length}
      totalSessions={totalSessions}
      missedSessions={missedSessions}
    />
  );
}

/* ── Student grid with its own data fetching ── */

async function StudentGridSection() {
  const students = await prisma.student.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.length === 0 && (
        <div
          className="col-span-full text-center py-16 rounded-xl"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: "1px dashed var(--su-border)",
            color: "var(--su-text-dim)",
          }}
        >
          <div className="text-4xl mb-3">📚</div>
          <p
            className="text-lg font-medium"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Belum ada murid terdaftar
          </p>
          <p className="text-sm mt-1">
            Tambah murid baru via halaman settings atau Telegram bot
          </p>
        </div>
      )}
      {students.map((student) => (
        <StudentCard key={student.id} student={student} />
      ))}
    </div>
  );
}

/* ── Fallback skeletons ── */

function StatsFallback() {
  return <SkeletonStatsBar />;
}

function StudentGridFallback() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/* ── Page ── */

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Stats Bar — independently loaded */}
      <Suspense fallback={<StatsFallback />}>
        <StatsSection />
      </Suspense>

      {/* Student Grid — independently loaded */}
      <Suspense fallback={<StudentGridFallback />}>
        <StudentGridSection />
      </Suspense>

      {/* Quick Links */}
      <div className="flex gap-3 mt-8">
        <a
          href="/dashboard/curriculum"
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: "1px solid var(--su-border)",
            color: "var(--su-text)",
          }}
        >
          📚 Kurikulum
        </a>
        <a
          href="/dashboard/agents"
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: "1px solid var(--su-border)",
            color: "var(--su-text)",
          }}
        >
          🤖 Agent Pipeline
        </a>
        <a
          href="/dashboard/settings"
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: "1px solid var(--su-border)",
            color: "var(--su-text)",
          }}
        >
          ⚙️ Settings
        </a>
      </div>
    </div>
  );
}
