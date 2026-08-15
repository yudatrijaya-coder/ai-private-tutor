import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { SkeletonProgressPage } from "@/components/Skeleton";
import SelfCompareCard from "@/components/SelfCompareCard";

const STUDENT_JWT_SECRET = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET ?? "student-dev-secret-change-in-production",
);

async function getSessionStudentId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("student_session")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, STUDENT_JWT_SECRET);
    return (payload as { studentId: string }).studentId;
  } catch {
    return null;
  }
}

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
        sd.getFullYear() === d.getFullYear(),
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
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors`}
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
                <span className="text-xs font-bold" style={{ color: barColor }}>
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

function colorFor(subject: string): string {
  if (SUBJECT_COLORS[subject]) return SUBJECT_COLORS[subject];
  const c = TREND_COLORS[Object.keys(SUBJECT_COLORS).length % TREND_COLORS.length];
  SUBJECT_COLORS[subject] = c;
  return c;
}

const TREND_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#06b6d4", "#ec4899", "#84cc16"];
const SUBJECT_COLORS: Record<string, string> = {};

function formatShort(ts: number): string {
  const d = new Date(ts);
  return d.getDate() + "/" + (d.getMonth() + 1);
}

function MasteryTrendChart({
  series,
}: {
  series: {
    subject: string;
    emoji: string;
    color: string;
    points: { date: Date; mastery: number }[];
  }[];
}) {
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) return null;
  const W = 340;
  const H = 150;
  const padL = 30;
  const padR = 12;
  const padT = 12;
  const padB = 22;
  const iw = W - padL - padR;
  const ih = H - padT - padB;

  const minT = Math.min(...all.map((p) => p.date.getTime()));
  const maxT = Math.max(...all.map((p) => p.date.getTime()));
  const spanT = Math.max(1, maxT - minT);

  const x = (t: number) => padL + ((t - minT) / spanT) * iw;
  const y = (m: number) => padT + ih - (Math.max(0, Math.min(100, m)) / 100) * ih;

  const gridLines = [0, 25, 50, 75, 100];

  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: "var(--st-bg-card)" }}
    >
      <h3
        className="font-bold text-base mb-4"
        style={{ fontFamily: "var(--font-st-display)" }}
      >
        📈 Perkembangan Penguasaan
      </h3>
      <svg viewBox={"0 0 " + W + " " + H} className="w-full h-auto">
        {gridLines.map((g) => (
          <g key={g}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(g)}
              y2={y(g)}
              stroke="rgba(168,162,158,0.15)"
              strokeWidth={1}
            />
            <text
              x={padL - 6}
              y={y(g) + 3}
              textAnchor="end"
              fontSize={9}
              fill="var(--st-text-dim)"
            >
              {g}
            </text>
          </g>
        ))}
        {series
          .filter((s) => s.points.length >= 2)
          .map((s) => {
            const pts = s.points
              .map(
                (p) =>
                  x(p.date.getTime()).toFixed(1) + "," + y(p.mastery).toFixed(1),
              )
              .join(" ");
            return (
              <g key={s.subject}>
                <polyline
                  points={pts}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {s.points.map((p, i) => (
                  <circle
                    key={i}
                    cx={x(p.date.getTime())}
                    cy={y(p.mastery)}
                    r={2.5}
                    fill={s.color}
                  />
                ))}
              </g>
            );
          })}
        <text x={padL} y={H - 6} fontSize={9} fill="var(--st-text-dim)">
          {formatShort(minT)}
        </text>
        <text
          x={W - padR}
          y={H - 6}
          textAnchor="end"
          fontSize={9}
          fill="var(--st-text-dim)"
        >
          {formatShort(maxT)}
        </text>
      </svg>
      <div className="mt-3 space-y-1">
        {series.map((s) => (
          <div key={s.subject} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="font-medium">
              {s.emoji} {s.subject}
            </span>
            <span className="ml-auto font-bold" style={{ color: s.color }}>
              {s.points.length > 0
                ? Math.round(s.points[s.points.length - 1].mastery) + "%"
                : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyStudyChart({
  weekly,
}: {
  weekly: { label: string; minutes: number }[];
}) {
  if (weekly.length === 0) return null;
  const W = 340;
  const H = 120;
  const padL = 30;
  const padR = 12;
  const padT = 14;
  const padB = 20;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const maxM = Math.max(...weekly.map((w) => w.minutes), 1);
  const bw = iw / weekly.length;

  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: "var(--st-bg-card)" }}
    >
      <h3
        className="font-bold text-base mb-4"
        style={{ fontFamily: "var(--font-st-display)" }}
      >
        ⏱️ Waktu Belajar per Minggu
      </h3>
      <svg viewBox={"0 0 " + W + " " + H} className="w-full h-auto">
        {weekly.map((w, i) => {
          const h = Math.max(2, (w.minutes / maxM) * ih);
          const bx = padL + i * bw;
          return (
            <g key={i}>
              <rect
                x={bx + bw * 0.15}
                y={padT + ih - h}
                width={bw * 0.7}
                height={h}
                rx={3}
                fill="var(--st-primary)"
              />
              <text
                x={bx + bw / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize={9}
                fill="var(--st-text-dim)"
              >
                {w.label}
              </text>
              {w.minutes > 0 && (
                <text
                  x={bx + bw / 2}
                  y={padT + ih - h - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--st-text-dim)"
                >
                  {Math.round((w.minutes / 60) * 10) / 10}j
                </text>
              )}
            </g>
          );
        })}
      </svg>
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
  "Bahasa Indonesia": "📖",
  "Bahasa Inggris": "🌏",
  IPA: "🔬",
  IPAS: "🔬",
  IPS: "🌍",
  Agama: "🕌",
  PKN: "🤝",
  "Pendidikan Pancasila": "🤝",
  PJOK: "⚽",
  Informatika: "💻",
  Fisika: "⚛️",
  Kimia: "🧪",
  Geografi: "🌏",
  Ekonomi: "💰",
  Sosiologi: "👥",
};

/* ── Progress content ── */

async function ProgressContent() {
  noStore();

  const sessionId = await getSessionStudentId();
  const student = sessionId
    ? await prisma.student.findUnique({
        where: { id: sessionId },
        include: {
          progressSnaps: {
            orderBy: { snapDate: "desc" },
          },
          attempts: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      })
    : null;

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
  const snapDates: Date[] = [];
  for (const snap of student.progressSnaps) {
    snapDates.push(snap.snapDate);
  }

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

  // Perkembangan: trend mastery per subject (per hari, 90 hari terakhir)
  const nowMs = Date.now();
  const subjectTrend = new Map<string, { subject: string; emoji: string; points: Map<string, { date: Date; mastery: number }> }>();
  for (const snap of student.progressSnaps) {
    if (nowMs - snap.snapDate.getTime() > 90 * 86400000) continue;
    let entry = subjectTrend.get(snap.subject);
    if (!entry) {
      entry = { subject: snap.subject, emoji: EMOJI_MAP[snap.subject] ?? "📚", points: new Map() };
      subjectTrend.set(snap.subject, entry);
    }
    const dk = snap.snapDate.toDateString();
    const existing = entry.points.get(dk);
    if (!existing || snap.snapDate > existing.date) {
      entry.points.set(dk, { date: snap.snapDate, mastery: snap.mastery * 100 });
    }
  }
  const trendSeries = Array.from(subjectTrend.values())
    .map((e) => ({
      subject: e.subject,
      emoji: e.emoji,
      color: colorFor(e.subject),
      points: Array.from(e.points.values()).sort((a, b) => a.date.getTime() - b.date.getTime()),
    }))
    .filter((s) => s.points.length >= 2);

  // Waktu belajar per minggu (5 minggu terakhir)
  const weeks: { start: number; label: string; minutes: number }[] = [];
  for (const snap of student.progressSnaps) {
    const d = snap.snapDate;
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    const key = monday.getTime();
    let w = weeks.find((x) => x.start === key);
    if (!w) {
      w = { start: key, label: monday.getDate() + "/" + (monday.getMonth() + 1), minutes: 0 };
      weeks.push(w);
    }
    w.minutes += snap.studyMinutes ?? 0;
  }
  weeks.sort((a, b) => a.start - b.start);
  const weeklyData = weeks.slice(-5);

  // Unique study dates
  const studyDates = Array.from(
    new Set(snapDates.map((d) => d.toDateString())),
  ).map((d) => new Date(d));

  // Calculate badges
  const totalQuizzes = student.attempts.length;
  const perfectScores = student.attempts.filter((a) => a.score === a.maxScore).length;
  const allAbove80 = masteryData.length > 0 && masteryData.every((m) => m.mastery >= 80);

  const badges = ALL_BADGES.map((b) => {
    let unlocked = false;
    if (b.minQuiz && totalQuizzes >= b.minQuiz) unlocked = true;
    if (b.minDays && studyDates.length >= b.minDays) unlocked = true;
    if (
      b.minMastery &&
      b.subject &&
      (subjectLatest.get(b.subject)?.mastery ?? 0) * 100 >= b.minMastery
    )
      unlocked = true;
    if (b.minPerfect && perfectScores >= b.minPerfect) unlocked = true;
    if (b.minMasteryAll && allAbove80) unlocked = true;
    return { name: b.name, icon: b.icon, unlocked };
  });

  const maxMastery = Math.max(
    ...Array.from(subjectLatest.values()).map((v) => v.mastery * 100),
    0,
  );

  return (
    <div className="space-y-5">
      <SelfCompareCard />
      <StreakCalendar snapDates={studyDates} />
      {trendSeries.length > 0 && <MasteryTrendChart series={trendSeries} />}
      {masteryData.length > 0 && <MasteryChart data={masteryData} />}
      {weeklyData.length > 0 && <WeeklyStudyChart weekly={weeklyData} />}

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

      <BadgesSection badges={badges} />
    </div>
  );
}

/* ── Page ── */

export default function ProgressPage() {
  return (
    <Suspense fallback={<SkeletonProgressPage />}>
      <ProgressContent />
    </Suspense>
  );
}
