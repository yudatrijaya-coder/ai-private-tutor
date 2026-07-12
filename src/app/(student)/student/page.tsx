import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import Link from "next/link";
import { SkeletonStudentPage } from "@/components/Skeleton";

const STUDENT_JWT_SECRET = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET ?? "student-dev-secret-change-in-production",
);

/** Baca student_session cookie dan dapatkan studentId (UUID) */
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

const SUBJECT_META: Record<string, { emoji: string; color: string }> = {
  Matematika: { emoji: "🔢", color: "#818cf8" },
  "Bahasa Indonesia": { emoji: "📖", color: "#34d399" },
  Bahasa: { emoji: "📖", color: "#34d399" },
  IPA: { emoji: "🔬", color: "#fbbf24" },
  IPAS: { emoji: "🔬", color: "#fbbf24" },
  IPS: { emoji: "🌍", color: "#f472b6" },
  Agama: { emoji: "🕌", color: "#a78bfa" },
  PKN: { emoji: "🤝", color: "#fb923c" },
  "Pendidikan Pancasila": { emoji: "🤝", color: "#fb923c" },
  PJOK: { emoji: "⚽", color: "#6366f1" },
  Informatika: { emoji: "💻", color: "#06b6d4" },
  "Bahasa Inggris": { emoji: "🌏", color: "#8b5cf6" },
};

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
      href={`/student/subject/${encodeURIComponent(name)}`}
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

  const sessionId = await getSessionStudentId();
  const student = sessionId
    ? await prisma.student.findUnique({
        where: { id: sessionId },
        include: {
          progressSnaps: {
            orderBy: { snapDate: "desc" },
            take: 10,
          },
        },
      })
    : null;

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

  const sessionId = await getSessionStudentId();
  const student = sessionId
    ? await prisma.student.findUnique({
        where: { id: sessionId },
        include: {
          scheduleSessions: {
            where: { status: "SCHEDULED" },
            orderBy: { scheduledAt: "asc" },
            take: 5,
          },
        },
      })
    : null;

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

/* ── Subject grid — fetch from curriculum ── */

async function SubjectGridSection() {
  noStore();

  const sessionId = await getSessionStudentId();
  if (!sessionId) return null;

  const curriculum = await prisma.curriculum.findFirst({
    where: { studentId: sessionId },
    select: {
      materials: {
        select: { subject: true },
        distinct: ["subject"],
        orderBy: { subject: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const subjects = (curriculum?.materials || []).map((m) => m.subject);

  if (subjects.length === 0) return null;

  return (
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
          {subjects.map((subject) => {
            const meta = SUBJECT_META[subject] ?? { emoji: "📚", color: "#94a3b8" };
            return (
              <SubjectCircle
                key={subject}
                name={subject}
                emoji={meta.emoji}
                color={meta.color}
                progress={0}
              />
            );
          })}
        </div>
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

      {/* Subject Grid — from curriculum */}
      <Suspense
        fallback={
          <div className="mb-5">
            <div className="w-32 h-4 bg-gray-200 rounded mb-3 animate-pulse" />
            <div
              className="rounded-2xl p-4 animate-pulse"
              style={{ backgroundColor: "var(--st-bg-card)" }}
            >
              <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="w-16 h-16 rounded-full bg-gray-200" />
                    <div className="w-16 h-3 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <SubjectGridSection />
      </Suspense>

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

      {/* ── Settings Section ── */}
      <section className="mb-5">
        <h3
          className="text-base font-bold mb-3"
          style={{ fontFamily: "var(--font-st-display)" }}
        >
          ⚙️ Pengaturan
        </h3>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <Link
            href="/student/password"
            className="flex items-center gap-3 p-4 transition-opacity hover:opacity-80"
            style={{ borderBottom: "1px solid var(--st-bg, #f0f4ff)" }}
          >
            <span className="text-xl">🔑</span>
            <div className="flex-1">
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                Buat atau ganti password login
              </p>
            </div>
            <span style={{ color: "var(--st-text-dim)" }}>→</span>
          </Link>
          <Link
            href="/student/profile-link"
            className="flex items-center gap-3 p-4 transition-opacity hover:opacity-80"
          >
            <span className="text-xl">🔗</span>
            <div className="flex-1">
              <p className="text-sm font-medium">Profil & Link Login</p>
              <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                Lihat ID siswa & bagikan ke orang tua
              </p>
            </div>
            <span style={{ color: "var(--st-text-dim)" }}>→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
