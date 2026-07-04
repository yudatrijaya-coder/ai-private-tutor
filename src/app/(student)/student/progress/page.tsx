import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";

function StreakCalendar({ snapDates }: { snapDates: Date[] }) {
  const today = new Date();
  const days: { date: Date; studied: boolean }[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const studied = snapDates.some(
      (sd) =>
        sd.getDate() === d.getDate() &&
        sd.getMonth() === d.getMonth() &&
        sd.getFullYear() === d.getFullYear()
    );
    days.push({ date: d, studied });
  }

  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: "var(--st-bg-card)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🔥</span>
        <span
          className="font-bold text-lg"
          style={{ fontFamily: "var(--font-st-display)" }}
        >
          Streak
        </span>
      </div>
      {/* Day name headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {dayNames.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium"
            style={{ color: "var(--st-text-dim)" }}
          >
            {d}
          </div>
        ))}
      </div>
      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                day.studied
                  ? "text-white"
                  : "text-xs"
              }`}
              style={{
                backgroundColor: day.studied
                  ? "var(--st-primary)"
                  : day.date.getDay() === 0 || day.date.getDay() === 6
                  ? "rgba(168,162,158,0.1)"
                  : "transparent",
                color: day.studied ? "#fff" : "var(--st-text-dim)",
              }}
            >
              {day.studied ? "✓" : day.date.getDate()}
            </div>
            <span className="text-[10px]" style={{ color: "var(--st-text-dim)" }}>
              {day.date.getDate()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MasteryChart({
  data,
}: {
  data: { subject: string; mastery: number; emoji: string }[];
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: "var(--st-bg-card)" }}
    >
      <h3
        className="font-bold text-base mb-4"
        style={{ fontFamily: "var(--font-st-display)" }}
      >
        📊 Penguasaan Materi
      </h3>
      <div className="space-y-3">
        {data.map((item) => {
          const barColor =
            item.mastery >= 80
              ? "var(--st-success)"
              : item.mastery >= 50
              ? "var(--st-gold)"
              : "var(--st-secondary)";
          return (
            <div key={item.subject}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">
                  {item.emoji} {item.subject}
                </span>
                <span
                  className="text-xs font-bold"
                  style={{ color: barColor }}
                >
                  {Math.round(item.mastery)}%
                </span>
              </div>
              <div
                className="w-full h-3 rounded-full overflow-hidden"
                style={{ backgroundColor: "#e5e7eb" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${item.mastery}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BadgesSection({
  badges,
}: {
  badges: { name: string; icon: string; unlocked: boolean }[];
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: "var(--st-bg-card)" }}
    >
      <h3
        className="font-bold text-base mb-4"
        style={{ fontFamily: "var(--font-st-display)" }}
      >
        🏆 Lencana
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {badges.map((badge) => (
          <div
            key={badge.name}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
            style={{
              backgroundColor: badge.unlocked
                ? "rgba(251,191,36,0.1)"
                : "rgba(168,162,158,0.05)",
              opacity: badge.unlocked ? 1 : 0.4,
            }}
          >
            <span className="text-2xl">{badge.unlocked ? badge.icon : "🔒"}</span>
            <span
              className="text-[10px] text-center font-medium leading-tight"
              style={{ color: "var(--st-text)" }}
            >
              {badge.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ALL_BADGES = [
  { name: "Awal Belajar", icon: "🌱", minQuiz: 1 },
  { name: "Rajin 3 Hari", icon: "🔥", minDays: 3 },
  { name: "Rajin 7 Hari", icon: "💪", minDays: 7 },
  { name: "Matematika 50%", icon: "🔢", minMastery: 50, subject: "Matematika" },
  { name: "Bahasa 50%", icon: "📖", minMastery: 50, subject: "Bahasa" },
  { name: "IPA 50%", icon: "🔬", minMastery: 50, subject: "IPA" },
  { name: "Skor Sempurna", icon: "🏅", minPerfect: 1 },
  { name: "Kolektor Quiz", icon: "📚", minQuiz: 10 },
  { name: "Master Pelajaran", icon: "👑", minMasteryAll: 80 },
];

const EMOJI_MAP: Record<string, string> = {
  Matematika: "🔢",
  Bahasa: "📖",
  IPA: "🔬",
  IPS: "🌍",
  Agama: "🕌",
  PKN: "🤝",
};

export default async function ProgressPage() {
  noStore();

  const student = await prisma.student.findFirst({
    where: { status: "ACTIVE" },
    include: {
      progressSnaps: {
        orderBy: { snapDate: "desc" },
      },
      attempts: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <span className="text-6xl">📊</span>
        <h2
          className="text-xl font-bold"
          style={{ fontFamily: "var(--font-st-display)" }}
        >
          Belum ada data
        </h2>
        <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>
          Ayo mulai belajar dulu!
        </p>
      </div>
    );
  }

  // Aggregate mastery by subject (latest snap per subject)
  const latestSnaps = new Map<string, number>();
  const snapDates: Date[] = [];
  for (const snap of student.progressSnaps) {
    snapDates.push(snap.snapDate);
    if (!latestSnaps.has(snap.subject) || snap.snapDate > student.progressSnaps.find(s => s.subject === snap.subject)!.snapDate) {
      const existing = latestSnaps.get(snap.subject);
      const existingSnap = student.progressSnaps.find(s => s.subject === snap.subject && s.snapDate.getTime() === existing);
      if (!existingSnap || snap.snapDate > existingSnap.snapDate) {
        latestSnaps.set(snap.subject, snap.mastery);
      }
    }
  }

  // Better: get latest per subject
  const subjectLatest = new Map<string, { mastery: number; snapDate: Date }>();
  for (const snap of student.progressSnaps) {
    const existing = subjectLatest.get(snap.subject);
    if (!existing || snap.snapDate > existing.snapDate) {
      subjectLatest.set(snap.subject, { mastery: snap.mastery, snapDate: snap.snapDate });
    }
  }

  const masteryData = Array.from(subjectLatest.entries()).map(([subject, data]) => ({
    subject,
    mastery: data.mastery * 100,
    emoji: EMOJI_MAP[subject] ?? "📚",
  }));

  // Unique study dates
  const studyDates = Array.from(
    new Set(snapDates.map((d) => d.toDateString()))
  ).map((d) => new Date(d));

  // Calculate badges
  const totalQuizzes = student.attempts.length;
  const perfectScores = student.attempts.filter((a) => a.score === a.maxScore).length;
  const maxMastery = Math.max(...Array.from(subjectLatest.values()).map(v => v.mastery * 100), 0);
  const allAbove80 = masteryData.length > 0 && masteryData.every((m) => m.mastery >= 80);

  const badges = ALL_BADGES.map((b) => {
    let unlocked = false;
    if (b.minQuiz && totalQuizzes >= b.minQuiz) unlocked = true;
    if (b.minDays && studyDates.length >= b.minDays) unlocked = true;
    if (b.minMastery && b.subject && (subjectLatest.get(b.subject)?.mastery ?? 0) * 100 >= b.minMastery) unlocked = true;
    if (b.minPerfect && perfectScores >= b.minPerfect) unlocked = true;
    if (b.minMasteryAll && allAbove80) unlocked = true;
    return { name: b.name, icon: b.icon, unlocked };
  });

  return (
    <div className="space-y-5">
      {/* Streak Calendar */}
      <StreakCalendar snapDates={studyDates} />

      {/* Mastery Chart */}
      {masteryData.length > 0 && <MasteryChart data={masteryData} />}

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="rounded-2xl p-4 text-center"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <span className="text-2xl">📝</span>
          <p
            className="text-xl font-bold mt-1"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            {totalQuizzes}
          </p>
          <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
            Quiz
          </p>
        </div>
        <div
          className="rounded-2xl p-4 text-center"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <span className="text-2xl">🔥</span>
          <p
            className="text-xl font-bold mt-1"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            {studyDates.length}
          </p>
          <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
            Hari Belajar
          </p>
        </div>
        <div
          className="rounded-2xl p-4 text-center"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <span className="text-2xl">📈</span>
          <p
            className="text-xl font-bold mt-1"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            {Math.round(maxMastery)}%
          </p>
          <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
            Tertinggi
          </p>
        </div>
      </div>

      {/* Badges */}
      <BadgesSection badges={badges} />
    </div>
  );
}
