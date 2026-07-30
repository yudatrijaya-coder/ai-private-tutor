"use client";

export function StudentCard({
  student,
}: {
  student: {
    id: string;
    studentId: string;
    name: string;
    gradeLevel: string;
    status: string;
    characterPreference?: string | null;
    createdAt: Date;
    subjectMastery?: Array<{
      subject: string;
      mastery: number;
      quizCount: number;
    }>;
  };
}) {
  const gradeLabels: Record<string, string> = {
    SD_5: "SD Kelas 5",
    SMP_1: "SMP Kelas 1",
    SMA_2: "SMA Kelas 2",
  };

  const statusColor =
    student.status === "ACTIVE"
      ? "var(--su-success)"
      : student.status === "PAUSED"
        ? "var(--su-warning)"
        : "var(--su-text-dim)";

  return (
    <a
      href={`/dashboard/students/${student.studentId}`}
      className="block rounded-xl p-4 transition-all hover:-translate-y-0.5"
      style={{
        backgroundColor: "var(--su-bg-card)",
        border: "1px solid var(--su-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: "var(--su-bg-hover)" }}
          >
            {student.characterPreference === "mbappe" ? "⚽" : student.characterPreference === "lisa" ? "💖" : "🦉"}
          </div>
          <div>
            <div
              className="font-semibold"
            >
              {student.name}
            </div>
            <div className="text-xs" style={{ color: "var(--su-text-dim)" }}>
              {gradeLabels[student.gradeLevel] || student.gradeLevel}
            </div>
          </div>
        </div>
        <span
          className="w-2.5 h-2.5 rounded-full inline-block mt-1.5"
          style={{ backgroundColor: statusColor }}
        />
      </div>

      {/* Real mastery bars from StudentSubjectMastery (top 3 by mastery) */}
      <div className="space-y-1.5">
        {!student.subjectMastery?.length ? (
          <div className="text-xs py-2" style={{ color: "var(--su-text-dim)" }}>
            Belum ada data quiz
          </div>
        ) : (
          student.subjectMastery.map((m) => (
            <MasteryBar
              key={m.subject}
              subject={m.subject}
              pct={Math.round(m.mastery * 100)}
              color={masteryColor(m.mastery)}
            />
          ))
        )}
      </div>

      <div
        className="text-xs mt-3 pt-3 border-t"
        style={{
          color: "var(--su-text-dim)",
          borderColor: "var(--su-border)",
        }}
      >
        📅 Bergabung {new Date(student.createdAt).toLocaleDateString("id-ID")}
      </div>
    </a>
  );
}

function masteryColor(mastery: number): string {
  if (mastery >= 0.75) return "var(--su-success)";
  if (mastery >= 0.5) return "var(--su-warning)";
  return "var(--su-danger)";
}

function MasteryBar({
  subject,
  pct,
  color,
}: {
  subject: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span>{subject}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--su-bg-hover)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
