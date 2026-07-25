import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import Link from "next/link";
import VideoPlayer from "@/components/VideoPlayer";

const STUDENT_JWT_SECRET = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET ?? "student-dev-secret-change-in-production",
);

const SUBJECT_META: Record<string, { emoji: string }> = {
  Matematika: { emoji: "🔢" },
  "Bahasa Indonesia": { emoji: "📖" },
  "Bahasa Inggris": { emoji: "🌏" },
  "Bahasa Mandarin": { emoji: "🀄" },
  IPA: { emoji: "🔬" },
  IPAS: { emoji: "🔬" },
  IPS: { emoji: "🌍" },
  Fisika: { emoji: "⚛️" },
  Kimia: { emoji: "🧪" },
  Biologi: { emoji: "🧬" },
  Ekonomi: { emoji: "💰" },
  Geografi: { emoji: "🌋" },
  Sosiologi: { emoji: "👥" },
  Informatika: { emoji: "💻" },
  "Pendidikan Pancasila": { emoji: "🤝" },
  PJOK: { emoji: "⚽" },
  "Matematika Penalaran": { emoji: "🧮" },
  "Matematika Tingkat Lanjut": { emoji: "📐" },
  "Bahasa Inggris Tingkat Lanjut": { emoji: "🌏" },
};

async function getSessionStudent() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("student_session")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, STUDENT_JWT_SECRET);
    return payload as { studentId: string; studentIdentifier: string; name: string; gradeLevel?: string };
  } catch { return null; }
}

const MOTIVASI_EMOJIS = ["💪", "🚲", "🌟", "🏆", "🔦", "📈", "🔥"];

async function VideoContent() {
  noStore();
  const session = await getSessionStudent();
  if (!session) return <div className="text-center py-20 text-amber-400">Silakan login dulu</div>;

  const student = await prisma.student.findUnique({
    where: { studentId: session.studentIdentifier },
    select: { id: true, name: true },
  });
  if (!student) return <div className="text-center py-20 text-amber-400">Siswa tidak ditemukan</div>;

  // Ambil subject + video dari DB (generatedVideoUrl dan videoUrl YouTube)
  const curricula = await prisma.curriculum.findMany({
    where: { studentId: student.id },
    select: { id: true },
  });

  const subjectVideos = await prisma.material.findMany({
    where: { curriculumId: { in: curricula.map(c => c.id) } },
    select: {
      subject: true,
      topic: true,
      videoUrl: true,
      metadata: true,
    },
    distinct: ["subject"],
    orderBy: { subject: "asc" },
  });

  const subjects = subjectVideos.map(m => ({
    subject: m.subject,
    topic: m.topic,
    videoUrl: m.videoUrl ?? null,
    generatedVideoUrl: (m.metadata as any)?.generatedVideoUrl ?? null,
  }));

  const studentKey = (student.name || "Raihan").toLowerCase().replace(/\s+/g, "_");

  return (
    <div className="space-y-8">
      {/* ── Mindmap Videos ── */}
      <div>
        <h2
          className="text-base font-bold mb-3"
          style={{ fontFamily: "'Fredoka One', 'Nunito', sans-serif" }}
        >
          🧠 Video Peta Besar
        </h2>
        <p className="text-xs text-amber-500 mb-4">
          Tonton penjelasan peta besar 1 mapel penuh
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => {
            const meta = SUBJECT_META[s.subject] ?? { emoji: "📚" };
            const videoSrc = s.generatedVideoUrl;
            const ytSrc = s.videoUrl;
            const hasVideo = !!(videoSrc || ytSrc);

            // Fallback: jika tidak ada video dari DB, tampilkan placeholder
            const videoPlayerSrc = videoSrc
              ? videoSrc
              : ytSrc
                ? undefined // VideoPlayer akan handle undefined dengan emoji fallback
                : `/videos/mindmap/default_${s.subject.toLowerCase().replace(/\s+/g, "_")}.mp4`;

            return (
              <div
                key={s.subject}
                className="rounded-2xl overflow-hidden border border-amber-200/40"
                style={{ backgroundColor: "var(--st-bg-card)" }}
              >
                {/* Thumbnail / Player */}
                <a
                  href={hasVideo ? (videoSrc ?? ytSrc ?? "#") : `/student/big-mindmap/${encodeURIComponent(s.subject)}`}
                  target={hasVideo ? "_blank" : undefined}
                  rel={hasVideo ? "noopener noreferrer" : undefined}
                >
                  <div className="aspect-video bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
                    <VideoPlayer
                      src={videoPlayerSrc}
                      fallbackEmoji={meta.emoji}
                    />
                  </div>
                </a>

                {/* Label bar */}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meta.emoji}</span>
                    <span className="text-sm font-semibold">{s.subject}</span>
                  </div>
                  <div className="flex gap-2">
                    {videoSrc && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">SIBI</span>
                    )}
                    {ytSrc && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">YT</span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="px-3 pb-3 flex gap-2">
                  {videoSrc && (
                    <a
                      href={videoSrc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center text-xs py-1.5 rounded-lg bg-amber-50 text-amber-700 font-medium hover:bg-amber-100 transition-colors"
                    >
                      🎬 Video SIBI
                    </a>
                  )}
                  {ytSrc && (
                    <a
                      href={ytSrc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center text-xs py-1.5 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors"
                    >
                      ▶️ YouTube
                    </a>
                  )}
                  <Link
                    href={`/student/big-mindmap/${encodeURIComponent(s.subject)}`}
                    className="flex-1 text-center text-xs py-1.5 rounded-lg bg-purple-50 text-purple-700 font-medium hover:bg-purple-100 transition-colors"
                  >
                    🗺️ Big Map
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Motivasi Videos ── */}
      <div>
        <h2
          className="text-base font-bold mb-3"
          style={{ fontFamily: "'Fredoka One', 'Nunito', sans-serif" }}
        >
          💪 Video Motivasi
        </h2>
        <p className="text-xs text-amber-500 mb-4">
          Semangat dari karakter favoritmu!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOTIVASI_EMOJIS.map((emoji, i) => {
            const videoSrc = `/videos/motivasi/motivasi_${studentKey}_${i}.mp4`;
            return (
              <div
                key={i}
                className="rounded-2xl overflow-hidden border border-purple-200/40"
                style={{ backgroundColor: "var(--st-bg-card)" }}
              >
                <div className="aspect-video bg-gradient-to-br from-purple-100 to-indigo-200 flex items-center justify-center">
                  <VideoPlayer
                    src={videoSrc}
                    fallbackEmoji={emoji}
                  />
                </div>
                <div className="p-3">
                  <span className="text-xs font-medium text-purple-700">
                    {emoji} Motivasi #{i + 1}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default async function VideosPage() {
  return (
    <div
      className="min-h-0 flex-1 flex flex-col"
      style={{ background: "linear-gradient(135deg, #fef9ef, #fdf2e9, #fef7e6)" }}
    >
      <div className="px-6 py-3 flex items-center justify-between shrink-0 border-b border-amber-200/50 bg-white/60 backdrop-blur-sm z-10">
        <Link
          href="/student"
          className="text-sm text-amber-700 hover:text-amber-900 transition-colors"
        >
          ← Dashboard
        </Link>
        <h1
          className="text-base font-bold text-amber-900 truncate mx-2"
          style={{ fontFamily: "'Fredoka One', 'Nunito', sans-serif" }}
        >
          🎬 Video Pembelajaran
        </h1>
        <div />
      </div>
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <Suspense
          fallback={
            <div className="text-center py-20 text-amber-400">Memuat video...</div>
          }
        >
          <VideoContent />
        </Suspense>
      </div>
    </div>
  );
}