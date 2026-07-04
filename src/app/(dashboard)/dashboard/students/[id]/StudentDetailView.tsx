"use client";

import { format } from "date-fns";
import { id } from "date-fns/locale";

const gradeLabels: Record<string, string> = {
  SD_5: "SD Kelas 5",
  SMP_1: "SMP Kelas 1",
  SMA_2: "SMA Kelas 2",
};

const severityColors: Record<string, string> = {
  LOW: "var(--su-info)",
  MEDIUM: "var(--su-warning)",
  HIGH: "var(--su-danger)",
  EMERGENCY: "var(--su-danger)",
};

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

export function StudentDetailView({ student }: { student: StudentData }) {
  const latestMastery = getLatestMasteryBySubject(student.progressSnaps);
  const weekSchedule = student.scheduleSessions.slice(0, 7);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3 mb-2">
        <a
          href="/dashboard"
          className="text-sm hover:underline"
          style={{ color: "var(--su-text-dim)" }}
        >
          ← Kembali
        </a>
      </div>

      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)" }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ backgroundColor: "var(--su-bg-hover)" }}
          >
            {student.characterPreference === "mbappe" ? "⚽" : student.characterPreference === "lisa" ? "💖" : "🦉"}
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
            <div className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
              {gradeLabels[student.gradeLevel]} · Karakter: {student.characterPreference || "Default"} ·{" "}
              Bergabung {format(new Date(student.createdAt), "d MMMM yyyy", { locale: id })}
            </div>
            {student.interests && (
              <div className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
                🎯 {student.interests}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Mastery Overview */}
        <div
          className="lg:col-span-2 rounded-xl p-5"
          style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)" }}
        >
          <h2 className="text-lg font-semibold mb-4">📊 Mastery Overview</h2>
          <div className="space-y-3">
            {Object.entries(latestMastery).length === 0 && (
              <p className="text-sm" style={{ color: "var(--su-text-dim)" }}>
                Belum ada data quiz — mulai belajar dulu!
              </p>
            )}
            {Object.entries(latestMastery).map(([subject, pct]) => {
              const color =
                pct >= 70
                  ? "var(--su-success)"
                  : pct >= 40
                    ? "var(--su-warning)"
                    : "var(--su-danger)";
              return (
                <div key={subject}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{subject}</span>
                    <span style={{ color }}>{Math.round(pct * 100)}%</span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--su-bg-hover)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
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
        </div>

        {/* Right: Schedule */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)" }}
        >
          <h2 className="text-lg font-semibold mb-4">📅 Jadwal Pekan Ini</h2>
          <div className="space-y-2">
            {weekSchedule.length === 0 && (
              <p className="text-sm" style={{ color: "var(--su-text-dim)" }}>
                Belum ada jadwal
              </p>
            )}
            {weekSchedule.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-2 rounded-lg text-sm"
                style={{ backgroundColor: "var(--su-bg-hover)" }}
              >
                <div>
                  <span className="font-medium">
                    {format(new Date(s.scheduledAt), "EEEE", { locale: id })}
                  </span>
                  <span className="ml-2" style={{ color: "var(--su-text-dim)" }}>
                    {format(new Date(s.scheduledAt), "HH:mm")}
                  </span>
                  <span className="ml-2 text-xs">
                    {s.type === "DAILY" ? "📖 Daily" : "🎯 Intensive"}
                  </span>
                </div>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    s.status === "COMPLETED"
                      ? "text-green-400 bg-green-400/10"
                      : s.status === "MISSED"
                        ? "text-red-400 bg-red-400/10"
                        : "text-blue-400 bg-blue-400/10"
                  }`}
                >
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interventions */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)" }}
      >
        <h2 className="text-lg font-semibold mb-4">🛡️ Intervensi</h2>
        {student.interventions.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--su-text-dim)" }}>
            Tidak ada intervensi aktif
          </p>
        ) : (
          <div className="space-y-2">
            {student.interventions.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-lg text-sm"
                style={{ backgroundColor: "var(--su-bg-hover)" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: severityColors[inv.severity] || "var(--su-info)",
                    }}
                  />
                  <div>
                    <span className="font-medium">{inv.issueType}</span>
                    <span className="ml-2" style={{ color: "var(--su-text-dim)" }}>
                      {inv.description}
                    </span>
                  </div>
                </div>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: "rgba(59,130,246,0.1)",
                    color: "var(--su-info)",
                  }}
                >
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Curriculum Progress */}
      {student.curriculums.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)" }}
        >
          <h2 className="text-lg font-semibold mb-4">📋 Kurikulum (v{student.curriculums[0].version})</h2>
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
                  <tr key={m.id} className="border-t" style={{ borderColor: "var(--su-border)" }}>
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
        </div>
      )}
    </div>
  );
}

function MaterialStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "var(--su-text-dim)",
    RAW: "var(--su-info)",
    PROCESSED: "var(--su-warning)",
    VIDEO_READY: "var(--su-success)",
    READY: "var(--su-success)",
    ARCHIVED: "var(--su-text-dim)",
  };

  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded"
      style={{
        backgroundColor: `${colors[status] || "var(--su-text-dim)"}15`,
        color: colors[status] || "var(--su-text-dim)",
      }}
    >
      {status}
    </span>
  );
}

function getLatestMasteryBySubject(
  snaps: StudentData["progressSnaps"]
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
