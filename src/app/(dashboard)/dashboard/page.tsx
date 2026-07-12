import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { StudentCard } from "./StudentCard";
import { StatsBar } from "./StatsBar";
import { SkeletonStatsBar, SkeletonCard } from "@/components/Skeleton";

export const dynamic = "force-dynamic";

/* ── Stats section ── */

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

  const pendingCount = students.filter((s) => s.status === "PENDING").length;
  const newToday = students.filter(
    (s) => s.createdAt.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
  ).length;

  return (
    <div className="space-y-4">
      <StatsBar
        totalStudents={students.length}
        activeStudents={students.filter((s) => s.status === "ACTIVE").length}
        pendingStudents={pendingCount}
        totalSessions={totalSessions}
        missedSessions={missedSessions}
        newToday={newToday}
      />
    </div>
  );
}

/* ── Pending approvals ── */

async function PendingApprovalsSection() {
  const pending = await prisma.student.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (pending.length === 0) return null;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--su-bg-card)",
        border: "1px solid rgba(245,158,11,0.3)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          ⏳ Pendaftaran Baru ({pending.length})
        </h2>
        <a
          href="/dashboard/students?status=PENDING"
          className="text-xs px-3 py-1 rounded font-medium"
          style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--su-warning)" }}
        >
          Lihat Semua
        </a>
      </div>
      <div className="space-y-2">
        {pending.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between p-3 rounded-lg text-sm"
            style={{ backgroundColor: "var(--su-bg-hover)" }}
          >
            <div>
              <span className="font-medium" style={{ color: "var(--su-text)" }}>{s.name}</span>
              <span className="ml-2 text-xs" style={{ color: "var(--su-text-dim)" }}>
                {s.studentId}
              </span>
            </div>
            <a
              href={`/dashboard/students`}
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: "rgba(59,130,246,0.12)", color: "var(--su-info)" }}
            >
              Setujui
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Active student grid ── */

async function StudentGridSection() {
  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return (
    <div>
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
            <p className="text-lg font-medium" style={{ fontFamily: "var(--font-display)" }}>
              Belum ada murid aktif
            </p>
            <p className="text-sm mt-1">
              Murid baru bisa daftar via Telegram atau tambah manual di halaman Siswa
            </p>
          </div>
        )}
        {students.map((student) => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>
      {students.length >= 12 && (
        <div className="text-center mt-4">
          <a
            href="/dashboard/students"
            className="text-sm font-medium"
            style={{ color: "var(--su-info)" }}
          >
            Lihat semua siswa ({students.length}+) →
          </a>
        </div>
      )}
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
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          🏠 Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
          Overview AI Private Tutor
        </p>
      </div>

      <Suspense fallback={<StatsFallback />}>
        <StatsSection />
      </Suspense>

      <Suspense fallback={null}>
        <PendingApprovalsSection />
      </Suspense>

      <div>
        <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>
          🎯 Siswa Aktif
        </h2>
        <Suspense fallback={<StudentGridFallback />}>
          <StudentGridSection />
        </Suspense>
      </div>

      <div className="flex gap-3 mt-8">
        <a
          href="/dashboard/students"
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: "1px solid var(--su-border)",
            color: "var(--su-text)",
          }}
        >
          👥 Kelola Siswa
        </a>
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
          href="/dashboard/quizzes"
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: "1px solid var(--su-border)",
            color: "var(--su-text)",
          }}
        >
          📝 Quiz
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
          🤖 Agents
        </a>
      </div>
    </div>
  );
}
