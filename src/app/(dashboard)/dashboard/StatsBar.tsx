"use client";

export function StatsBar({
  totalStudents,
  activeStudents,
  pendingStudents = 0,
  totalSessions,
  missedSessions,
  newToday = 0,
}: {
  totalStudents: number;
  activeStudents: number;
  pendingStudents?: number;
  totalSessions: number;
  missedSessions: number;
  newToday?: number;
}) {
  const stats = [
    { label: "Total Murid", value: totalStudents, icon: "👥" },
    { label: "Aktif", value: activeStudents, icon: "🟢" },
    { label: "Pending", value: pendingStudents, icon: "⏳", warn: pendingStudents > 0 },
    { label: "Hari Ini", value: newToday, icon: "🆕" },
    { label: "Sesi Belajar", value: totalSessions, icon: "📅" },
    {
      label: "Missed",
      value: missedSessions,
      icon: "⚠️",
      danger: missedSessions > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl p-4"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: `1px solid ${stat.danger ? "var(--su-danger)" : stat.warn ? "rgba(245,158,11,0.3)" : "var(--su-border)"}`,
          }}
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
