import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import Link from "next/link";

const STUDENT_JWT_SECRET = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET ?? "student-dev-secret-change-in-production",
);

const SUBJECT_META: Record<string, { emoji: string; color: string }> = {
  Matematika: { emoji: "🔢", color: "#818cf8" },
  "Bahasa Indonesia": { emoji: "📖", color: "#34d399" },
  "Bahasa Inggris": { emoji: "🌏", color: "#8b5cf6" },
  "Bahasa Mandarin": { emoji: "🀄", color: "#ef4444" },
  IPA: { emoji: "🔬", color: "#fbbf24" },
  IPAS: { emoji: "🔬", color: "#fbbf24" },
  IPS: { emoji: "🌍", color: "#f472b6" },
  Fisika: { emoji: "⚛️", color: "#3b82f6" },
  Kimia: { emoji: "🧪", color: "#a855f7" },
  Biologi: { emoji: "🧬", color: "#22c55e" },
  Ekonomi: { emoji: "💰", color: "#eab308" },
  Geografi: { emoji: "🌋", color: "#f97316" },
  Sosiologi: { emoji: "👥", color: "#ec4899" },
  Informatika: { emoji: "💻", color: "#06b6d4" },
  "Pendidikan Pancasila": { emoji: "🤝", color: "#fb923c" },
  PJOK: { emoji: "⚽", color: "#6366f1" },
  "Matematika Penalaran": { emoji: "🧮", color: "#a78bfa" },
};

async function getSessionStudent() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("student_session")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, STUDENT_JWT_SECRET);
    return payload as { studentId: string; name: string };
  } catch {
    return null;
  }
}

async function SubjectGrid() {
  noStore();
  const session = await getSessionStudent();
  if (!session) return null;

  const student = await prisma.student.findUnique({
    where: { studentId: session.studentId },
    select: { id: true },
  });
  if (!student) return null;

  // Get ALL curricula
  const curricula = await prisma.curriculum.findMany({
    where: { studentId: student.id },
    select: { id: true },
  });

  const subjects = await prisma.material.findMany({
    where: { curriculumId: { in: curricula.map(c => c.id) } },
    select: { subject: true },
    distinct: ["subject"],
    orderBy: { subject: "asc" },
  });

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      {subjects.map((s) => {
        const meta = SUBJECT_META[s.subject] ?? { emoji: "📚", color: "#94a3b8" };
        return (
          <Link
            key={s.subject}
            href={`/student/big-mindmap/${encodeURIComponent(s.subject)}`}
            className="flex flex-col items-center gap-1.5 rounded-2xl p-4 transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: meta.color + "15" }}
          >
            <span className="text-3xl">{meta.emoji}</span>
            <span className="text-xs font-semibold text-center" style={{ color: meta.color }}>
              {s.subject}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default async function BigMindmapIndexPage() {
  return (
    <div className="min-h-0 flex-1 flex flex-col" style={{ background: "linear-gradient(135deg, #fef9ef, #fdf2e9, #fef7e6)" }}>
      {/* Header */}
      <div className="px-6 py-3 flex items-center justify-between shrink-0 border-b border-amber-200/50 bg-white/60 backdrop-blur-sm z-10">
        <Link href="/student" className="text-sm text-amber-700 hover:text-amber-900 transition-colors">← Dashboard</Link>
        <h1 className="text-base font-bold text-amber-900 truncate mx-2" style={{ fontFamily: "'Fredoka One', 'Nunito', sans-serif" }}>
          🗺️ Peta Besar
        </h1>
        <div />
      </div>

      {/* Petunjuk */}
      <div className="px-6 py-3 shrink-0">
        <p className="text-xs text-amber-500" style={{ fontFamily: "'Nunito', sans-serif" }}>
          Pilih mapel untuk melihat peta konsep semua topik sekaligus. Klik topic untuk detail.
        </p>
      </div>

      {/* Grid mapel */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full text-amber-400 text-sm">
            <span className="animate-bounce text-4xl mr-3">🗺️</span> Memuat...
          </div>
        }>
          <SubjectGrid />
        </Suspense>
      </div>
    </div>
  );
}
