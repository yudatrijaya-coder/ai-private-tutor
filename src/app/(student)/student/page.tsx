import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { SkeletonStudentPage } from "@/components/Skeleton";

const SUBJECTS = [
  { name: "Matematika", emoji: "🔢", color: "#818cf8" },
  { name: "Bahasa", emoji: "📖", color: "#34d399" },
  { name: "IPA", emoji: "🔬", color: "#fbbf24" },
  { name: "IPS", emoji: "🌍", color: "#f472b6" },
  { name: "Agama", emoji: "🕌", color: "#a78bfa" },
  { name: "PKN", emoji: "🤝", color: "#fb923c" },
];

function SubjectCircle({
  name,
  emoji,
  color,
  progress,
}: {
  name: string;
  emoji: string;
  color: string;
  progress: number;
}) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <Link
      href={`/student/quiz?subject=${name}`}
      className="flex flex-col items-center gap-1.5"
    >
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="absolute inset-0 w-16 h-16 -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="5"
          />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="text-2xl relative z-10">{emoji}</span>
      </div>
      <span
        className="text-xs font-medium text-center"
        style={{ color: "var(--st-text)" }}
      >
        {name}
      </span>
    </Link>
  );
}

/* ── Hero card section ── */

async function HeroSection() {
  noStore();

  const student = await prisma.student.findFirst({
    where: { status: "ACTIVE" },
    include: {
      progressSnaps: {
        orderBy: { snapDate: "desc" },
        take: 10,
      },
    },
  });

  if (!student) return null;

  const totalMastery =
    student.progressSnaps.length > 0
      ? Math.round(
          student.progressSnaps.reduce((sum, s) => sum + s.mastery, 0) /
            student.progressSnaps.length *
            100,
        )
      : 0;

  return (
    <div
      className="rounded-2xl p-5 mb-5 relative overflow-hidden"
      style={{ backgroundColor: "var(--st-primary)" }}
    >
      <div className="relative z-10">
        <p className="text-white/80 text-xs mb-1">✨ Lanjut Belajar</p>
        <h2
          className="text-white text-xl font-bold mb-3"
          style={{ fontFamily: "var(--font-st-display)" }}
        >
          {totalMastery >= 70
            ? "Keren! Kamu udah jago! 🎉"
            : totalMastery >= 40
              ? "Terus semangat! 💪"
              : "Ayo mulai belajar hari ini! 🚀"}
        </h2>
        <Link
          href="/student/quiz"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-transform hover:scale-105 active:scale-95"
          style={{
            backgroundColor: "#fff",
            color: "var(--st-primary)",
            fontFamily: "var(--font-st-display)",
          }}
        >
          Mulai Quiz ➜
        </Link>
      </div>
      <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-2 w-16 h-16 rounded-full bg-white/10" />
    </div>
  );
}

/* ── Schedule section ── */

async function ScheduleSection() {
  noStore();

  const student = await prisma.student.findFirst({
    where: { status: "ACTIVE" },
    include: {
      scheduleSessions: {
        where: { status: "SCHEDULED" },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      },
    },
  });

  if (!student) return null;

  const todaySessions = student.scheduleSessions.filter((s) => {
    const today = new Date();
    const sDate = new Date(s.scheduledAt);
    return (
      sDate.getDate() === today.getDate() &&
      sDate.getMonth() === today.getMonth() &&
      sDate.getFullYear() === today.getFullYear()
    );
  });

  return (
    <div className="mb-5">
      <h3
        className="text-base font-bold mb-3"
        style={{ fontFamily: "var(--font-st-display)" }}
      >
        📅 Jadwal Hari Ini
      </h3>
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: "var(--st-bg-card)" }}
      >
        {todaySessions.length === 0 ? (
          <div className="flex flex-col items-center py-4 gap-2">
            <span className="text-2xl">🎉</span>
            <p
              className="text-sm text-center"
              style={{ color: "var(--st-text-dim)" }}
            >
              Tidak ada jadwal hari ini. Santai aja dulu!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaySessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: "var(--st-bg)" }}
              >
                <span className="text-lg">
                  {session.type === "DAILY" ? "📖" : "⚡"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {session.subject ?? session.topic ?? "Belajar"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                    {new Date(session.scheduledAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {session.durationMin} menit
                  </p>
                </div>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor:
                      session.type === "DAILY"
                        ? "rgba(99,102,241,0.1)"
                        : "rgba(249,115,22,0.1)",
                    color: "var(--st-primary)",
                  }}
                >
                  {session.type === "DAILY" ? "Harian" : "Intensif"}
                </span>
              </div>
            ))}
          </div>
        )}
        {student.scheduleSessions.length > 5 && (
          <button
            className="w-full text-center text-xs font-semibold mt-3 pt-3 border-t"
            style={{
              color: "var(--st-primary)",
              borderColor: "#e5e7eb",
            }}
          >
            Lihat semua jadwal →
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Page ── */

export default function StudentHomePage() {
  return (
    <>
      <Suspense
        fallback={
          <div
            className="rounded-2xl p-5 mb-5 animate-pulse"
            style={{ backgroundColor: "var(--st-primary)" }}
          >
            <div className="w-1/3 h-3 bg-white/30 rounded mb-2" />
            <div className="w-2/3 h-6 bg-white/30 rounded mb-3" />
            <div className="w-32 h-10 bg-white/30 rounded-xl" />
          </div>
        }
      >
        <HeroSection />
      </Suspense>

      {/* Subject Grid — static, no Suspense needed */}
      <div className="mb-5">
        <h3
          className="text-base font-bold mb-3"
          style={{ fontFamily: "var(--font-st-display)" }}
        >
          📚 Mata Pelajaran
        </h3>
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <div className="grid grid-cols-3 gap-y-4 gap-x-2">
            {SUBJECTS.map((subj) => (
              <SubjectCircle
                key={subj.name}
                name={subj.name}
                emoji={subj.emoji}
                color={subj.color}
                progress={0}
              />
            ))}
          </div>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="mb-5 animate-pulse">
            <div className="w-32 h-4 bg-gray-200 rounded mb-3" />
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{ backgroundColor: "var(--st-bg-card)" }}
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-6 h-6 bg-gray-200 rounded" />
                  <div className="flex-1 space-y-1">
                    <div className="w-2/3 h-3 bg-gray-200 rounded" />
                    <div className="w-1/2 h-2 bg-gray-200 rounded" />
                  </div>
                  <div className="w-16 h-5 bg-gray-200 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        }
      >
        <ScheduleSection />
      </Suspense>
    </>
  );
}
