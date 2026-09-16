import { prisma } from "@/lib/prisma";
import { getAdminOverview } from "@/lib/admin-insights";

/**
 * Admin dashboard sections — server components rendering the data assembled by
 * `getAdminOverview()`.
 *
 * All of these read persisted rows. Nothing is estimated.
 *
 * Kept as separate Suspense boundaries in `page.tsx` so a slow aggregate does
 * not hold up the stat tiles.
 */

/* ── Attention list ── */

export async function AttentionSection() {
  const { attention } = await getAdminOverview();

  if (attention.length === 0) {
    return (
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--su-bg-card)",
          border: "1px solid var(--su-border)",
        }}
      >
        <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          🚨 Perlu Perhatian
        </h2>
        <p className="text-sm mt-2" style={{ color: "var(--su-text-dim)" }}>
          Tidak ada masalah terbuka. Semua siswa aktif dan tidak ada topik yang
          tertinggal.
        </p>
      </div>
    );
  }

  const openCount = attention.length;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--su-bg-card)",
        border: "1px solid var(--su-danger)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          🚨 Perlu Perhatian ({openCount})
        </h2>
      </div>

      <div className="space-y-2">
        {attention.slice(0, 8).map((item, i) => (
          <div
            key={`${item.kind}-${item.id}-${i}`}
            className="flex items-start justify-between gap-3 p-3 rounded-lg text-sm"
            style={{ backgroundColor: "var(--su-bg-hover)" }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium shrink-0"
                  style={{
                    backgroundColor:
                      item.severity === "critical"
                        ? "rgba(239,68,68,0.12)"
                        : "rgba(245,158,11,0.12)",
                    color:
                      item.severity === "critical"
                        ? "var(--su-danger)"
                        : "var(--su-warning)",
                  }}
                >
                  {item.kind}
                </span>
                <span className="font-medium">{item.studentName}</span>
                <span className="text-xs" style={{ color: "var(--su-text-dim)" }}>
                  {item.studentId}
                </span>
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--su-text-dim)" }}>
                {item.title} — {item.detail}
              </p>
            </div>
            <a
              href={`/dashboard/students/${item.id}`}
              className="text-xs px-2 py-1 rounded shrink-0"
              style={{
                backgroundColor: "rgba(59,130,246,0.12)",
                color: "var(--su-info)",
              }}
            >
              Buka
            </a>
          </div>
        ))}
      </div>

      {openCount > 8 && (
        <p className="text-xs mt-3" style={{ color: "var(--su-text-dim)" }}>
          +{openCount - 8} item lagi
        </p>
      )}
    </div>
  );
}

/* ── Upcoming exams ── */

export async function UpcomingExamSection() {
  const { upcomingExams } = await getAdminOverview();

  if (upcomingExams.length === 0) return null;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--su-bg-card)",
        border: "1px solid var(--su-border)",
      }}
    >
      <h2 className="font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>
        📝 Ujian 7 Hari ke Depan ({upcomingExams.length})
      </h2>

      <div className="space-y-2">
        {upcomingExams.map((e) => (
          <div
            key={e.scheduleId}
            className="flex items-center justify-between gap-3 p-3 rounded-lg text-sm"
            style={{ backgroundColor: "var(--su-bg-hover)" }}
          >
            <div className="min-w-0">
              <div className="font-medium truncate">{e.title}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--su-text-dim)" }}>
                {e.studentName} ({e.studentCode}) ·{" "}
                {new Date(e.scheduledAt).toLocaleString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Jakarta",
                })}{" "}
                WIB
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-xs px-2 py-1 rounded"
                style={{
                  backgroundColor:
                    e.status === "CONFIRMED"
                      ? "rgba(34,197,94,0.12)"
                      : "rgba(245,158,11,0.12)",
                  color:
                    e.status === "CONFIRMED"
                      ? "var(--su-success)"
                      : "var(--su-warning)",
                }}
              >
                {e.status === "CONFIRMED" ? "Konfirmasi" : "Belum konfirmasi"}
              </span>
              <span
                className="text-xs font-bold px-2 py-1 rounded"
                style={{
                  backgroundColor:
                    e.daysAway <= 1 ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.12)",
                  color: e.daysAway <= 1 ? "var(--su-danger)" : "var(--su-accent)",
                }}
              >
                {e.daysAway === 0
                  ? "Hari ini"
                  : e.daysAway === 1
                    ? "Besok"
                    : `${e.daysAway} hari`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 7-day activity trend ── */

export async function ActivityTrendSection() {
  const { activityTrend, system, content, sessions } = await getAdminOverview();

  const max = Math.max(...activityTrend.map((d) => d.count), 1);
  const total = activityTrend.reduce((s, d) => s + d.count, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Trend */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--su-bg-card)",
          border: "1px solid var(--su-border)",
        }}
      >
        <h2 className="font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>
          📊 Aktivitas 7 Hari
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--su-text-dim)" }}>
          {total.toLocaleString("id-ID")} aktivitas belajar tercatat
        </p>

        <div className="flex items-end gap-2 h-28">
          {activityTrend.map((d) => {
            const h = d.count > 0 ? Math.max(6, (d.count / max) * 100) : 2;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px]" style={{ color: "var(--su-text-dim)" }}>
                  {d.count}
                </span>
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${h}%`,
                    backgroundColor:
                      d.count > 0 ? "var(--su-accent)" : "rgba(139,143,163,0.2)",
                  }}
                  title={`${d.date}: ${d.count} aktivitas`}
                />
                <span className="text-[10px]" style={{ color: "var(--su-text-dim)" }}>
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* System + content health */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--su-bg-card)",
          border: "1px solid var(--su-border)",
        }}
      >
        <h2 className="font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>
          🩺 Kesehatan Sistem
        </h2>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs" style={{ color: "var(--su-text-dim)" }}>
              Sesi selesai
            </div>
            <div className="font-bold mt-0.5">{sessions.completionRate}%</div>
            <div className="text-[10px]" style={{ color: "var(--su-text-dim)" }}>
              {sessions.completed} selesai · {sessions.missed} terlewat
            </div>
          </div>

          <div>
            <div className="text-xs" style={{ color: "var(--su-text-dim)" }}>
              Log agent gagal
            </div>
            <div
              className="font-bold mt-0.5"
              style={{
                color: system.agentFailed7d > 0 ? "var(--su-danger)" : "var(--su-success)",
              }}
            >
              {system.agentFailed7d.toLocaleString("id-ID")}
            </div>
            <div className="text-[10px]" style={{ color: "var(--su-text-dim)" }}>
              7 hari terakhir (total {system.agentFailed.toLocaleString("id-ID")})
            </div>
          </div>

          <div>
            <div className="text-xs" style={{ color: "var(--su-text-dim)" }}>
              Panggilan AI 7 hari
            </div>
            <div className="font-bold mt-0.5">
              {system.apiCalls7d.toLocaleString("id-ID")}
            </div>
            <div className="text-[10px]" style={{ color: "var(--su-text-dim)" }}>
              {(system.tokens7d / 1000).toFixed(0)}rb token · $
              {system.cost7d.toFixed(4)}
            </div>
          </div>

          <div>
            <div className="text-xs" style={{ color: "var(--su-text-dim)" }}>
              Latensi rata-rata
            </div>
            <div
              className="font-bold mt-0.5"
              style={{
                color: system.suspiciousLatency ? "var(--su-warning)" : "var(--su-success)",
              }}
            >
              {system.avgLatencyMs === null
                ? "—"
                : `${(system.avgLatencyMs / 1000).toFixed(1)}s`}
            </div>
            <div className="text-[10px]" style={{ color: "var(--su-text-dim)" }}>
              {system.suspiciousLatency ? "di atas 20s — perlu dicek" : "normal"}
            </div>
          </div>

          <div>
            <div className="text-xs" style={{ color: "var(--su-text-dim)" }}>
              Perlu diulang
            </div>
            <div className="font-bold mt-0.5">{system.dueReviews}</div>
            <div className="text-[10px]" style={{ color: "var(--su-text-dim)" }}>
              soal jatuh tempo (spaced repetition)
            </div>
          </div>

          <div>
            <div className="text-xs" style={{ color: "var(--su-text-dim)" }}>
              Rencana perbaikan
            </div>
            <div className="font-bold mt-0.5">
              {system.improvementPlansApplied.toLocaleString("id-ID")}
            </div>
            <div className="text-[10px]" style={{ color: "var(--su-text-dim)" }}>
              sudah diterapkan dari hasil ujian
            </div>
          </div>
        </div>

        <div
          className="mt-4 pt-4 grid grid-cols-4 gap-2 text-center"
          style={{ borderTop: "1px solid var(--su-border)" }}
        >
          {[
            { label: "Materi", value: content.materials },
            { label: "Quiz", value: content.quizzes },
            { label: "Ujian", value: content.exams },
            { label: "Kurikulum", value: content.curriculums },
          ].map((c) => (
            <div key={c.label}>
              <div className="text-sm font-bold">
                {c.value.toLocaleString("id-ID")}
              </div>
              <div className="text-[10px]" style={{ color: "var(--su-text-dim)" }}>
                {c.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Class breakdown (per grade level) ── */

export async function GradeBreakdownSection() {
  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    select: { gradeLevel: true, studentId: true, id: true },
  });

  if (students.length === 0) return null;

  const byGrade = new Map<string, number>();
  for (const s of students) {
    byGrade.set(s.gradeLevel, (byGrade.get(s.gradeLevel) ?? 0) + 1);
  }

  // Session completion per grade — the number that tells an admin which class
  // is actually turning up.
  const sessions = await prisma.scheduleSession.findMany({
    where: { student: { status: "ACTIVE" } },
    select: { status: true, student: { select: { gradeLevel: true } } },
  });

  const gradeStats = new Map<string, { completed: number; missed: number; scheduled: number }>();
  for (const s of sessions) {
    const g = s.student.gradeLevel;
    const cur = gradeStats.get(g) ?? { completed: 0, missed: 0, scheduled: 0 };
    if (s.status === "COMPLETED") cur.completed++;
    else if (s.status === "MISSED") cur.missed++;
    else if (s.status === "SCHEDULED") cur.scheduled++;
    gradeStats.set(g, cur);
  }

  const GRADE_LABEL: Record<string, string> = {
    SD_5: "SD Kelas 5",
    SD_6: "SD Kelas 6",
    SMP_1: "SMP Kelas 7",
    SMP_2: "SMP Kelas 8",
    SMP_3: "SMP Kelas 9",
    SMA_1: "SMA Kelas 10",
    SMA_2: "SMA Kelas 11",
    SMA_3: "SMA Kelas 12",
  };

  const rows = Array.from(byGrade.entries())
    .map(([grade, count]) => {
      const st = gradeStats.get(grade) ?? { completed: 0, missed: 0, scheduled: 0 };
      const graded = st.completed + st.missed;
      return {
        grade,
        label: GRADE_LABEL[grade] ?? grade,
        count,
        ...st,
        rate: graded ? Math.round((st.completed / graded) * 100) : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--su-bg-card)",
        border: "1px solid var(--su-border)",
      }}
    >
      <h2 className="font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>
        🎓 Sebaran Jenjang
      </h2>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.grade}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">
                {r.label}{" "}
                <span style={{ color: "var(--su-text-dim)" }}>({r.count} murid)</span>
              </span>
              <span
                className="text-xs font-bold"
                style={{
                  color:
                    r.rate >= 60
                      ? "var(--su-success)"
                      : r.rate >= 30
                        ? "var(--su-warning)"
                        : "var(--su-danger)",
                }}
              >
                {r.completed + r.missed > 0 ? `${r.rate}% hadir` : "belum ada sesi"}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "rgba(139,143,163,0.2)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, r.rate)}%`,
                  backgroundColor:
                    r.rate >= 60
                      ? "var(--su-success)"
                      : r.rate >= 30
                        ? "var(--su-warning)"
                        : "var(--su-danger)",
                }}
              />
            </div>
            <div className="text-[10px] mt-1" style={{ color: "var(--su-text-dim)" }}>
              {r.completed} selesai · {r.missed} terlewat · {r.scheduled} terjadwal
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
