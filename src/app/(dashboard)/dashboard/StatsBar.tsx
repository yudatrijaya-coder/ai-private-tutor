"use client";

export function StatsBar({
  totalStudents,
  activeStudents,
  totalSessions,
  missedSessions,
}: {
  totalStudents: number;
  activeStudents: number;
  totalSessions: number;
  missedSessions: number;
}) {
  const stats = [
    { label: "Total Murid", value: totalStudents, icon: "👥" },
    { label: "Aktif", value: activeStudents, icon: "🟢" },
    {
      label: "Sesi Belajar",
      value: totalSessions,
      icon: "📅",
    },
    {
      label: "Missed",
      value: missedSessions,
      icon: "⚠️",
      danger: missedSessions > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl p-4"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: `1px solid ${stat.danger ? "var(--su-danger)" : "var(--su-border)"}`,
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
