"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

/* ------------------------------------------------------------------ */
/*  Labels                                                             */
/* ------------------------------------------------------------------ */

const gradeLabels: Record<string, string> = {
  SD_5: "SD Kelas 5",
  SMP_1: "SMP Kelas 1",
  SMA_2: "SMA Kelas 2",
};

/* ------------------------------------------------------------------ */
/*  Status / severity colour maps                                      */
/* ------------------------------------------------------------------ */

const severityStyles: Record<string, { bg: string; color: string }> = {
  LOW: {
    bg: "rgba(59,130,246,0.12)",
    color: "var(--su-info)",
  },
  MEDIUM: {
    bg: "rgba(245,158,11,0.12)",
    color: "var(--su-warning)",
  },
  HIGH: {
    bg: "rgba(239,68,68,0.12)",
    color: "var(--su-danger)",
  },
  EMERGENCY: {
    bg: "rgba(220,38,38,0.18)",
    color: "var(--su-danger)",
  },
};

const interventionStatusStyles: Record<string, { bg: string; color: string }> =
  {
    OPEN: { bg: "rgba(239,68,68,0.12)", color: "var(--su-danger)" },
    IN_PROGRESS: {
      bg: "rgba(245,158,11,0.12)",
      color: "var(--su-warning)",
    },
    RESOLVED: {
      bg: "rgba(34,197,94,0.12)",
      color: "var(--su-success)",
    },
    DISMISSED: {
      bg: "rgba(100,116,139,0.12)",
      color: "var(--su-text-dim)",
    },
  };

const sessionStatusStyles: Record<string, { bg: string; color: string }> = {
  SCHEDULED: { bg: "rgba(59,130,246,0.12)", color: "var(--su-info)" },
  COMPLETED: { bg: "rgba(34,197,94,0.12)", color: "var(--su-success)" },
  MISSED: { bg: "rgba(239,68,68,0.12)", color: "var(--su-danger)" },
  RESCHEDULED: {
    bg: "rgba(100,116,139,0.12)",
    color: "var(--su-text-dim)",
  },
};

const sessionTypeLabels: Record<string, string> = {
  DAILY: "📖 Harian",
  INTENSIVE: "🎯 Intensif",
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type StudentData = {
  id: string;
  name: string;
  gradeLevel: string;
  status: string;
  characterPreference?: string | null;
  interests?: string | null;
  createdAt: Date;
  scheduleSessions: Array<{
    id: string;
    type: string;
    topic: string | null;
    subject: string | null;
    scheduledAt: Date;
    durationMin: number;
    status: string;
  }>;
  progressSnaps: Array<{
    id: string;
    subject: string;
    mastery: number;
    snapDate: Date;
  }>;
  interventions: Array<{
    id: string;
    issueType: string;
    severity: string;
    description: string;
    status: string;
    createdAt: Date;
  }>;
  curriculums: Array<{
    id: string;
    version: number;
    materials: Array<{
      id: string;
      topic: string;
      status: string;
      delivery: string;
    }>;
  }>;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getLatestMasteryBySubject(
  snaps: StudentData["progressSnaps"],
): Record<string, number> {
  const latest: Record<string, { mastery: number; date: Date }> = {};
  for (const s of snaps) {
    const existing = latest[s.subject];
    if (!existing || s.snapDate > existing.date) {
      latest[s.subject] = { mastery: s.mastery, date: s.snapDate };
    }
  }
  const result: Record<string, number> = {};
  for (const [subject, v] of Object.entries(latest)) {
    result[subject] = v.mastery;
  }
  return result;
}

function getMasteryColor(pct: number): string {
  if (pct >= 0.7) return "var(--su-success)";
  if (pct >= 0.4) return "var(--su-warning)";
  return "var(--su-danger)";
}

function getMasteryLabel(pct: number): string {
  if (pct >= 0.7) return "Baik";
  if (pct >= 0.4) return "Sedang";
  return "Perlu Perhatian";
}

/* ------------------------------------------------------------------ */
/*  Badge component                                                    */
/* ------------------------------------------------------------------ */

function Badge({
  label,
  bg,
  color,
}: {
  label: string;
  bg: string;
  color: string;
}) {
  return (
    <span
      className="inline-block text-xs px-2 py-0.5 rounded font-medium"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Severity badge                                                     */
/* ------------------------------------------------------------------ */

function SeverityBadge({ severity }: { severity: string }) {
  const style = severityStyles[severity] ?? {
    bg: "rgba(100,116,139,0.12)",
    color: "var(--su-text-dim)",
  };
  return <Badge label={severity} bg={style.bg} color={style.color} />;
}

/* ------------------------------------------------------------------ */
/*  Material status badge                                              */
/* ------------------------------------------------------------------ */

function MaterialStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    DRAFT: { bg: "rgba(100,116,139,0.12)", color: "var(--su-text-dim)" },
    RAW: { bg: "rgba(59,130,246,0.12)", color: "var(--su-info)" },
    PROCESSED: {
      bg: "rgba(245,158,11,0.12)",
      color: "var(--su-warning)",
    },
    VIDEO_READY: {
      bg: "rgba(34,197,94,0.12)",
      color: "var(--su-success)",
    },
    READY: { bg: "rgba(34,197,94,0.15)", color: "var(--su-success)" },
    ARCHIVED: {
      bg: "rgba(100,116,139,0.12)",
      color: "var(--su-text-dim)",
    },
  };
  const style = colors[status] ?? {
    bg: "rgba(100,116,139,0.12)",
    color: "var(--su-text-dim)",
  };
  return <Badge label={status} bg={style.bg} color={style.color} />;
}

/* ------------------------------------------------------------------ */
/*  Section card wrapper                                               */
/* ------------------------------------------------------------------ */

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--su-bg-card)",
        border: "1px solid var(--su-border)",
      }}
    >
      <h2
        className="text-lg font-semibold mb-4"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function StudentDetailView({ student }: { student: StudentData }) {
  const latestMastery = getLatestMasteryBySubject(student.progressSnaps);
  const weekSchedule = student.scheduleSessions.slice(0, 7);

  /* Intervention split */
  const activeInterventions = student.interventions.filter((i) =>
    ["OPEN", "IN_PROGRESS"].includes(i.status),
  );
  const resolvedInterventions = student.interventions.filter((i) =>
    ["RESOLVED", "DISMISSED"].includes(i.status),
  );
  const [showResolved, setShowResolved] = useState(false);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-3 mb-2">
        <a
          href="/dashboard"
          className="text-sm hover:underline"
          style={{ color: "var(--su-text-dim)" }}
        >
          ← Kembali
        </a>
      </div>

      {/* ── Student Header Card ── */}
      <SectionCard title="">
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ backgroundColor: "var(--su-bg-hover)" }}
          >
            {student.characterPreference === "mbappe"
              ? "⚽"
              : student.characterPreference === "lisa"
                ? "💖"
                : "🦉"}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1
                className="text-2xl font-bold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {student.name}
              </h1>
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor:
                    student.status === "ACTIVE"
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(245,158,11,0.15)",
                  color:
                    student.status === "ACTIVE"
                      ? "var(--su-success)"
                      : "var(--su-warning)",
                }}
              >
                {student.status}
              </span>
            </div>
            <div
              className="text-sm mt-1"
              style={{ color: "var(--su-text-dim)" }}
            >
              {gradeLabels[student.gradeLevel]} · Karakter:{" "}
              {student.characterPreference || "Default"} · Bergabung{" "}
              {format(new Date(student.createdAt), "d MMMM yyyy", {
                locale: id,
              })}
            </div>
            {student.interests && (
              <div
                className="text-sm mt-1"
                style={{ color: "var(--su-text-dim)" }}
              >
                🎯 {student.interests}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── Grid: Mastery (left 2/3) + Schedule (right 1/3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Mastery Chart ── */}
        <div className="lg:col-span-2">
          <SectionCard title="📊 Penguasaan Materi">
            {Object.entries(latestMastery).length === 0 ? (
              <p
                className="text-sm"
                style={{ color: "var(--su-text-dim)" }}
              >
                Belum ada data quiz — mulai belajar dulu!
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(latestMastery)
                  .sort(([, a], [, b]) => b - a)
                  .map(([subject, pct]) => {
                    const color = getMasteryColor(pct);
                    const label = getMasteryLabel(pct);
                    return (
                      <div key={subject}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{subject}</span>
                          <span style={{ color }}>
                            {Math.round(pct * 100)}% ·{" "}
                            <span className="text-xs">{label}</span>
                          </span>
                        </div>
                        <div
                          className="h-2.5 rounded-full overflow-hidden"
                          style={{
                            backgroundColor: "var(--su-bg-hover)",
                          }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct * 100}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── This Week's Schedule ── */}
        <div>
          <SectionCard title="📅 Jadwal Pekan Ini">
            {weekSchedule.length === 0 ? (
              <p
                className="text-sm"
                style={{ color: "var(--su-text-dim)" }}
              >
                Belum ada jadwal
              </p>
            ) : (
              <div className="space-y-2">
                {weekSchedule.map((s) => {
                  const dt = new Date(s.scheduledAt);
                  const dayName = format(dt, "EEEE", { locale: id });
                  const time = format(dt, "HH:mm");
                  const badge = sessionStatusStyles[s.status] ?? {
                    bg: "rgba(100,116,139,0.12)",
                    color: "var(--su-text-dim)",
                  };

                  return (
                    <div
                      key={s.id}
                      className="p-3 rounded-lg text-sm"
                      style={{ backgroundColor: "var(--su-bg-hover)" }}
                    >
                      {/* Date + status row */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-xs">
                          {dayName}
                        </span>
                        <Badge
                          label={s.status}
                          bg={badge.bg}
                          color={badge.color}
                        />
                      </div>

                      {/* Time + type + duration */}
                      <div
                        className="text-xs"
                        style={{ color: "var(--su-text-dim)" }}
                      >
                        {time} ·{" "}
                        {sessionTypeLabels[s.type] ?? s.type} ·{" "}
                        {s.durationMin} mnt
                      </div>

                      {/* Topic */}
                      {s.topic && (
                        <div
                          className="text-xs mt-0.5 truncate"
                          style={{ color: "var(--su-text-dim)" }}
                        >
                          {s.topic}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* ── Interventions ── */}
      <SectionCard title="🛡️ Intervensi">
        {/* Active interventions */}
        {activeInterventions.length === 0 &&
        resolvedInterventions.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--su-text-dim)" }}>
            Tidak ada intervensi
          </p>
        ) : (
          <div className="space-y-2 mb-3">
            {activeInterventions.map((inv) => {
              const sevStyle =
                severityStyles[inv.severity] ?? severityStyles.LOW;
              const invStyle =
                interventionStatusStyles[inv.status] ??
                interventionStatusStyles.OPEN;
              return (
                <div
                  key={inv.id}
                  className="flex items-start justify-between p-3 rounded-lg text-sm"
                  style={{ backgroundColor: "var(--su-bg-hover)" }}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Severity dot */}
                    <span
                      className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                      style={{
                        backgroundColor: sevStyle.color,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {inv.issueType.replace(/_/g, " ")}
                        </span>
                        <SeverityBadge severity={inv.severity} />
                      </div>
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{ color: "var(--su-text-dim)" }}
                      >
                        {inv.description}
                      </p>
                    </div>
                  </div>
                  <Badge
                    label={inv.status}
                    bg={invStyle.bg}
                    color={invStyle.color}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Resolved interventions (collapsed) */}
        {resolvedInterventions.length > 0 && (
          <>
            <button
              onClick={() => setShowResolved((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium cursor-pointer hover:underline"
              style={{
                color: "var(--su-text-dim)",
                background: "none",
                border: "none",
                padding: 0,
              }}
            >
              {showResolved ? "▼" : "▶"} Riwayat Intervensi (
              {resolvedInterventions.length})
            </button>

            {showResolved && (
              <div className="space-y-2 mt-2">
                {resolvedInterventions.map((inv) => {
                  const sevStyle =
                    severityStyles[inv.severity] ?? severityStyles.LOW;
                  const invStyle =
                    interventionStatusStyles[inv.status] ??
                    interventionStatusStyles.RESOLVED;
                  return (
                    <div
                      key={inv.id}
                      className="flex items-start justify-between p-3 rounded-lg text-sm opacity-70"
                      style={{ backgroundColor: "var(--su-bg-hover)" }}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full mt-1 shrink-0"
                          style={{ backgroundColor: sevStyle.color }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {inv.issueType.replace(/_/g, " ")}
                            </span>
                            <SeverityBadge severity={inv.severity} />
                          </div>
                          <p
                            className="text-xs mt-0.5 truncate"
                            style={{ color: "var(--su-text-dim)" }}
                          >
                            {inv.description}
                          </p>
                        </div>
                      </div>
                      <Badge
                        label={inv.status}
                        bg={invStyle.bg}
                        color={invStyle.color}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </SectionCard>

      {/* ── Curriculum Progress ── */}
      {student.curriculums.length > 0 && (
        <SectionCard
          title={`📋 Kurikulum (v${student.curriculums[0].version})`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr style={{ color: "var(--su-text-dim)" }}>
                  <th className="pb-2 pr-4">Topik</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Delivery</th>
                </tr>
              </thead>
              <tbody>
                {student.curriculums[0].materials.map((m) => (
                  <tr
                    key={m.id}
                    className="border-t"
                    style={{ borderColor: "var(--su-border)" }}
                  >
                    <td className="py-2 pr-4">{m.topic}</td>
                    <td className="py-2 pr-4">
                      <MaterialStatusBadge status={m.status} />
                    </td>
                    <td className="py-2">{m.delivery}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
