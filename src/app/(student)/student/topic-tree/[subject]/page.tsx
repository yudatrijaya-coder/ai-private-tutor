import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import Link from "next/link";

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

const THEMES: Record<string, { gradient: string; accent: string; emoji: string }> = {
  IPAS: { gradient: "from-cyan-500/30 via-blue-600/20 to-purple-700/30", accent: "#06b6d4", emoji: "🔬" },
  Matematika: { gradient: "from-indigo-500/30 via-violet-600/20 to-purple-700/30", accent: "#818cf8", emoji: "🔢" },
  "Bahasa Indonesia": { gradient: "from-emerald-500/30 via-teal-600/20 to-green-700/30", accent: "#34d399", emoji: "📖" },
  "Bahasa Inggris": { gradient: "from-rose-500/30 via-pink-600/20 to-red-700/30", accent: "#f43f5e", emoji: "🌏" },
  "Pendidikan Pancasila": { gradient: "from-violet-500/30 via-purple-600/20 to-fuchsia-700/30", accent: "#a78bfa", emoji: "🤝" },
  PJOK: { gradient: "from-orange-500/30 via-amber-600/20 to-yellow-700/30", accent: "#fb923c", emoji: "⚽" },
  Informatika: { gradient: "from-sky-500/30 via-cyan-600/20 to-blue-700/30", accent: "#38bdf8", emoji: "💻" },
};

const TOPIC_EMOJIS: Record<string, string> = {
  Cahaya: "💡", Bunyi: "🔊", Ekosistem: "🌿", Ekonomi: "💰",
  "Indonesia Kaya": "🌏", "Air Sumber Kehidupan": "💧", "Perubahan Fisik": "🔄",
  "Daerah Bersejarah": "🏛️", "Pecahan": "📐", "Aku yang Unik": "✨",
};

async function MindmapContent({ subject }: { subject: string }) {
  noStore();
  const sessionId = await getSessionStudentId();
  if (!sessionId) return null;

  const decoded = decodeURIComponent(subject);
  const theme = THEMES[decoded] ?? { gradient: "from-slate-500/30 via-gray-600/20 to-zinc-700/30", accent: "#94a3b8", emoji: "📚" };

  const curriculum = await prisma.curriculum.findFirst({
    where: { studentId: sessionId },
    include: {
      materials: {
        where: { subject: decoded },
        select: { topic: true, subTopic: true, id: true },
        orderBy: { weekOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const materials = curriculum?.materials ?? [];

  // Group by topic
  const groups = new Map<string, { subTopics: string[]; id: string }>();
  for (const m of materials) {
    if (!groups.has(m.topic)) {
      groups.set(m.topic, { subTopics: [], id: m.id });
    }
    if (m.subTopic) groups.get(m.topic)!.subTopics.push(m.subTopic);
  }

  const topics = Array.from(groups.entries());

  if (topics.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0c0c1d, #1a0a2e)" }}>
        <p className="text-white/40">Belum ada materi untuk {decoded}</p>
      </div>
    );
  }

  // Colors untuk setiap topic node
  const colors = ["#06b6d4", "#818cf8", "#34d399", "#f43f5e", "#fb923c", "#a78bfa", "#fbbf24", "#38bdf8", "#e879f9", "#4ade80"];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0c0c1d 0%, #1a0a2e 50%, #0f0f20 100%)" }}>
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {topics.map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full blur-3xl animate-pulse"
            style={{
              width: 200 + Math.random() * 300,
              height: 200 + Math.random() * 300,
              left: `${5 + Math.random() * 90}%`,
              top: `${5 + Math.random() * 90}%`,
              background: colors[i % colors.length],
              opacity: 0.04 + Math.random() * 0.04,
              animationDuration: `${4 + Math.random() * 6}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Back + title */}
        <div className="flex items-center justify-between mb-8">
          <Link href={`/student/subject/${subject}`} className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            ← Kembali
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{theme.emoji}</span>
            <h1 className="text-xl font-bold text-white">{decoded}</h1>
          </div>
          <div />
        </div>

        {/* Mindmap Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-auto">
          {topics.map(([topic, data], idx) => {
            const color = colors[idx % colors.length];
            const emoji = TOPIC_EMOJIS[topic] || "📌";
            return (
              <div key={topic} className="relative">
                {/* Connector line (vertical, between cards) */}
                {idx > 0 && (
                  <div className="hidden md:block absolute -top-6 left-1/2 w-px h-6" style={{ background: `linear-gradient(to bottom, ${colors[(idx-1) % colors.length]}, ${color})`, opacity: 0.3 }} />
                )}

                {/* Topic card */}
                <div
                  className="rounded-2xl p-5 transition-all hover:scale-[1.02] duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${color}15, ${color}08)`,
                    border: `1px solid ${color}30`,
                    boxShadow: `0 4px 24px ${color}10`,
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ background: `${color}25` }}
                    >
                      {emoji}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">{topic}</h2>
                      <p className="text-xs" style={{ color: `${color}99` }}>
                        {data.subTopics.length} subtopik
                      </p>
                    </div>
                  </div>

                  {/* Subtopics */}
                  {data.subTopics.length > 0 && (
                    <div className="space-y-2 relative">
                      {/* Vertical line connector */}
                      <div className="absolute left-3 top-0 bottom-0 w-px" style={{ background: `${color}20` }} />

                      {data.subTopics.slice(0, 4).map((st, si) => (
                        <div key={si} className="flex items-start gap-3 pl-2 relative">
                          {/* Dot on line */}
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                            style={{ background: color, opacity: 0.5 }}
                          />
                          <Link
                            href={`/student/slides/${data.id}`}
                            className="text-sm transition-opacity hover:opacity-70"
                            style={{ color: "rgba(255,255,255,0.7)" }}
                          >
                            {st}
                          </Link>
                        </div>
                      ))}
                      {data.subTopics.length > 4 && (
                        <p className="text-xs pl-7" style={{ color: "rgba(255,255,255,0.3)" }}>
                          +{data.subTopics.length - 4} lainnya
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quick links */}
                  <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: `1px solid ${color}15` }}>
                    <Link
                      href={`/student/slides/${data.id}`}
                      className="text-xs px-2.5 py-1 rounded-lg transition-opacity hover:opacity-70"
                      style={{ background: `${color}20`, color }}
                    >
                      📖 Baca
                    </Link>
                    <Link
                      href={`/student/quiz?quizId=${data.id}`}
                      className="text-xs px-2.5 py-1 rounded-lg transition-opacity hover:opacity-70"
                      style={{ background: `${color}20`, color }}
                    >
                      📝 Quiz
                    </Link>
                    <Link
                      href={`/student/quiz?subject=${encodeURIComponent(decoded)}&exam=true`}
                      className="text-xs px-2.5 py-1 rounded-lg transition-opacity hover:opacity-70"
                      style={{ background: `${color}20`, color }}
                    >
                      📋 Exam
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary bar */}
        <div
          className="mt-8 rounded-2xl p-5 text-center"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            🌳 {topics.length} topik · {materials.length} materi · {decoded} — Kurikulum Merdeka SD Kelas 5
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function MindmapPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0c0c1d, #1a0a2e)" }}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="text-6xl animate-bounce">🧠</div>
          <p className="text-white/40">Memuat topic tree...</p>
        </div>
      </div>
    }>
      <MindmapContent subject={subject} />
    </Suspense>
  );
}
