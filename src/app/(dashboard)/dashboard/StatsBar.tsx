"use client";

/**
 * Admin overview stat tiles.
 *
 * Extended from 7 to 12 tiles: the operational numbers (completion rate, active
 * last 7 days, attention items, API latency) existed in the database but were
 * never shown, so an admin had to open several pages to notice a problem.
 */

export function StatsBar({
  totalStudents,
  activeStudents,
  pendingStudents = 0,
  totalSessions,
  missedSessions,
  newToday = 0,
  studyMinutes7d = 0,
  completedSessions = 0,
  activeLast7d = 0,
  attentionCount = 0,
  dueReviews = 0,
  avgLatencyMs = null,
}: {
  totalStudents: number;
  activeStudents: number;
  pendingStudents?: number;
  totalSessions: number;
  missedSessions: number;
  newToday?: number;
  studyMinutes7d?: number;
  completedSessions?: number;
  activeLast7d?: number;
  attentionCount?: number;
  dueReviews?: number;
  avgLatencyMs?: number | null;
}) {
  const studyLabel =
    studyMinutes7d >= 60
      ? `${Math.floor(studyMinutes7d / 60)}j ${studyMinutes7d % 60}m`
      : `${studyMinutes7d}m`;

  const graded = completedSessions + missedSessions;
  const completionRate = graded ? Math.round((completedSessions / graded) * 100) : 0;

  const latencyLabel =
    avgLatencyMs === null
      ? "—"
      : avgLatencyMs >= 1000
        ? `${(avgLatencyMs / 1000).toFixed(1)}s`
        : `${Math.round(avgLatencyMs)}ms`;

  const stats = [
    { label: "Total Murid", value: totalStudents, icon: "👥" },
    { label: "Aktif", value: activeStudents, icon: "🟢" },
    { label: "Pending", value: pendingStudents, icon: "⏳", warn: pendingStudents > 0 },
    { label: "Hari Ini", value: newToday, icon: "🆕" },
    {
      label: "Belajar 7h",
      value: `${activeLast7d}/${activeStudents}`,
      icon: "📖",
      hint: "murid yang belajar minggu ini",
    },
    { label: "Total Belajar 7h", value: studyLabel, icon: "⏱️" },
    { label: "Sesi Belajar", value: totalSessions, icon: "📅" },
    {
      label: "Sesi Selesai",
      value: graded ? `${completionRate}%` : "—",
      icon: "✅",
      hint: `${completedSessions} selesai · ${missedSessions} terlewat`,
    },
    {
      label: "Missed",
      value: missedSessions,
      icon: "⚠️",
      danger: missedSessions > 0,
    },
    {
      label: "Perlu Perhatian",
      value: attentionCount,
      icon: "🚨",
      danger: attentionCount > 0,
    },
    {
      label: "Perlu Diulang",
      value: dueReviews,
      icon: "🔁",
      warn: dueReviews > 0,
    },
    {
      label: "Latensi AI",
      value: latencyLabel,
      icon: "⚡",
      warn: avgLatencyMs !== null && avgLatencyMs > 20_000,
      hint: "rata-rata 7 hari",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl p-4"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: `1px solid ${
              stat.danger
                ? "var(--su-danger)"
                : stat.warn
                  ? "rgba(245,158,11,0.3)"
                  : "var(--su-border)"
            }`,
          }}
          title={stat.hint}
        >
          <div className="text-sm" style={{ color: "var(--su-text-dim)" }}>
            {stat.icon} {stat.label}
          </div>
          <div
            className="text-2xl font-bold mt-1"
            style={{
              fontFamily: "var(--font-display)",
              color: stat.danger ? "var(--su-danger)" : "var(--su-text)",
            }}
          >
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
