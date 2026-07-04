"use client";

const AGENT_META: Record<
  string,
  { label: string; icon: string; description: string }
> = {
  CURRICULUM: {
    label: "Curriculum",
    icon: "📋",
    description: "Menyusun kurikulum & silabus",
  },
  CONTENT: {
    label: "Content",
    icon: "📝",
    description: "Menyiapkan materi ajar",
  },
  MEDIA: {
    label: "Media",
    icon: "🎬",
    description: "Produksi video & aset visual",
  },
  ASSESSMENT: {
    label: "Assessment",
    icon: "✍️",
    description: "Membuat soal & evaluasi",
  },
  TUTOR: {
    label: "Tutor",
    icon: "🤖",
    description: "Interaksi pembelajaran harian",
  },
  GUARDIAN: {
    label: "Guardian",
    icon: "🛡️",
    description: "Monitoring & intervensi",
  },
  SCHEDULER: {
    label: "Scheduler",
    icon: "📅",
    description: "Penjadwalan sesi belajar",
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; order: number }
> = {
  QUEUED: { label: "Antre", color: "var(--su-info)", order: 0 },
  ACTIVE: { label: "Aktif", color: "var(--su-success)", order: 1 },
  RETRYING: { label: "Ulang", color: "var(--su-warning)", order: 2 },
  COMPLETED: { label: "Selesai", color: "var(--su-success)", order: 3 },
  FAILED: { label: "Gagal", color: "var(--su-danger)", order: 4 },
};

const STATUS_ORDER = ["QUEUED", "ACTIVE", "RETRYING", "COMPLETED", "FAILED"];

export type AgentLogSummary = {
  agentType: string;
  queued: number;
  active: number;
  completed: number;
  failed: number;
  retrying: number;
  total: number;
};

export function AgentPipelineView({
  agents,
}: {
  agents: AgentLogSummary[];
}) {
  const hasData = agents.some((a) => a.total > 0);
  const agentTypes = Object.keys(AGENT_META);

  // Merge with zero-filled defaults so all 7 agents always appear
  const merged = agentTypes.map((type) => {
    const existing = agents.find((a) => a.agentType === type);
    return existing ?? {
      agentType: type,
      queued: 0,
      active: 0,
      completed: 0,
      failed: 0,
      retrying: 0,
      total: 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          🤖 Agent Pipeline
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
          Status real-time pipeline agent AI —{" "}
          {hasData
            ? `${agents.reduce((s, a) => s + a.total, 0)} total aktivitas`
            : "belum ada aktivitas"}
        </p>
      </div>

      {!hasData && (
        <div
          className="col-span-full text-center py-16 rounded-xl"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: "1px dashed var(--su-border)",
            color: "var(--su-text-dim)",
          }}
        >
          <div className="text-4xl mb-3">🤖</div>
          <p
            className="text-lg font-medium"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Belum ada aktivitas agent
          </p>
          <p className="text-sm mt-1">
            Agent akan muncul saat pipeline pembelajaran mulai berjalan
          </p>
        </div>
      )}

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {merged.map((agent) => {
          const meta = AGENT_META[agent.agentType] ?? {
            label: agent.agentType,
            icon: "⚙️",
            description: "",
          };

          const statusCounts: { label: string; color: string; value: number }[] =
            STATUS_ORDER.map((key) => ({
              label: STATUS_CONFIG[key].label,
              color: STATUS_CONFIG[key].color,
              value: agent[key as keyof typeof agent] as number,
            }));

          return (
            <div
              key={agent.agentType}
              className="rounded-xl p-4 transition-all hover:-translate-y-0.5"
              style={{
                backgroundColor: "var(--su-bg-card)",
                border: "1px solid var(--su-border)",
              }}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ backgroundColor: "var(--su-bg-hover)" }}
                  >
                    {meta.icon}
                  </div>
                  <div>
                    <div
                      className="font-semibold text-sm"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {meta.label}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--su-text-dim)" }}
                    >
                      {meta.description}
                    </div>
                  </div>
                </div>

                {/* Total Badge */}
                {agent.total > 0 && (
                  <span
                    className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-xs font-mono font-medium"
                    style={{
                      backgroundColor: "var(--su-bg-hover)",
                      color: "var(--su-text)",
                    }}
                  >
                    {agent.total}
                  </span>
                )}
              </div>

              {/* Stacked Status Bar */}
              {agent.total > 0 && (
                <div
                  className="h-2 rounded-full overflow-hidden flex gap-0.5 mb-2.5"
                  style={{ backgroundColor: "var(--su-bg-hover)" }}
                >
                  {statusCounts
                    .filter((s) => s.value > 0)
                    .map((s) => (
                      <div
                        key={s.label}
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(s.value / agent.total) * 100}%`,
                          backgroundColor: s.color,
                        }}
                        title={`${s.label}: ${s.value}`}
                      />
                    ))}
                </div>
              )}

              {/* Status Legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {statusCounts.map((s) => (
                  <span
                    key={s.label}
                    className="text-[11px] flex items-center gap-1"
                    style={{ color: "var(--su-text-dim)" }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.label}
                    {s.value > 0 && (
                      <span
                        className="font-mono font-medium"
                        style={{ color: "var(--su-text)" }}
                      >
                        {s.value}
                      </span>
                    )}
                  </span>
                ))}
              </div>

              {/* Active pulse indicator */}
              {agent.active > 0 && (
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: "var(--su-success)" }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-2 w-2"
                      style={{ backgroundColor: "var(--su-success)" }}
                    />
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--su-success)" }}
                  >
                    {agent.active} agent aktif
                  </span>
                </div>
              )}

              {/* Warning for failed */}
              {agent.failed > 0 && (
                <div
                  className="mt-1.5 text-xs flex items-center gap-1"
                  style={{ color: "var(--su-danger)" }}
                >
                  ⚠️ {agent.failed} gagal
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
