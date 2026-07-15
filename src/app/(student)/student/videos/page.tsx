import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import Link from "next/link";

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

const MOTIVASI_QUOTES = [
  "Jangan pernah menyerah! 💪",
  "Belajar itu seperti naik sepeda 🚲",
  "Kesalahan itu batu loncatan 🌟",
  "Kamu hebat! 🏆",
  "Ilmu itu cahaya 🔦",
  "Bandingkan dengan dirimu kemarin 📈",
  "Sukses itu soal bertahan 🔥",
];

async function VideoContent() {
  noStore();
  const session = await getSessionStudent();
  if (!session) return <div className="text-center py-20 text-amber-400">Silakan login dulu</div>;

  const student = await prisma.student.findUnique({
    where: { studentId: session.studentIdentifier },
    select: { id: true, name: true },
  });
  if (!student) return <div className="text-center py-20 text-amber-400">Siswa tidak ditemukan</div>;

  // Ambil semua subject dari kurikulum
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

  const studentKey = student.name || "Raihan";

  return (
    <div className="space-y-8">
      {/* ── Mindmap Videos ── */}
      <div>
        <h2 className="text-base font-bold mb-3" style={{ fontFamily: "'Fredoka One', 'Nunito', sans-serif" }}>
          🧠 Video Peta Besar
        </h2>
        <p className="text-xs text-amber-500 mb-4">
          Tonton penjelasan直升机 peta besar 1 mapel penuh
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => {
            const meta = SUBJECT_META[s.subject] ?? { emoji: "📚" };
            const studentKeyLower = studentKey.toLowerCase();
            const videoFile = `${studentKeyLower}_${s.subject.toLowerCase().replace(/\\s+/g, "_")}`;
            return (
              <div
                key={s.subject}
                className="rounded-2xl overflow-hidden border border-amber-200/40"
                style={{ backgroundColor: "var(--st-bg-card)" }}
              >
                <Link href={`/student/big-mindmap/${encodeURIComponent(s.subject)}`}>
                  <div className="aspect-video bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
                    <video
                      className="w-full h-full object-cover"
                      preload="none"
                      controls
                    >
                      <source src={`/videos/mindmap/${videoFile}.mp4`} type="video/mp4" />
                    </video>
                  </div>
                </Link>
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meta.emoji}</span>
                    <span className="text-sm font-semibold">{s.subject}</span>
                  </div>
                  <Link
                    href={`/student/big-mindmap/${encodeURIComponent(s.subject)}`}
                    className="text-xs text-amber-600 hover:text-amber-800"
                  >
                    Buka Big Map →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Motivasi Videos ── */}
      <div>
        <h2 className="text-base font-bold mb-3" style={{ fontFamily: "'Fredoka One', 'Nunito', sans-serif" }}>
          💪 Video Motivasi
        </h2>
        <p className="text-xs text-amber-500 mb-4">
          Semangat dari karakter favoritmu!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOTIVASI_QUOTES.map((_, i) => {
            const videoSrc = `/videos/motivasi/motivasi_${studentKey.toLowerCase()}_${i}.mp4`;
            const emojis = ["💪", "🚲", "🌟", "🏆", "🔦", "📈", "🔥"];
            return (
              <div
                key={i}
                className="rounded-2xl overflow-hidden border border-purple-200/40"
                style={{ backgroundColor: "var(--st-bg-card)" }}
              >
                <div className="aspect-video bg-gradient-to-br from-purple-100 to-indigo-200 flex items-center justify-center">
                  <video
                    className="w-full h-full object-cover"
                    preload="none"
                    controls
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target) {
                        target.style.display = 'none';
                        const container = target.closest('.aspect-video');
                        const fallback = container?.querySelector('.fallback') as HTMLElement | null;
                        if (fallback) fallback.style.display = 'flex';
                      }
                    }}
                  >
                    <source src={videoSrc} type="video/mp4" />
                  </video>
                  <div className="fallback hidden items-center justify-center text-center p-4">
                    <span className="text-4xl">{emojis[i]}</span>
                    <p className="text-xs text-gray-500 mt-2">Video belum siap</p>
                  </div>
                </div>
                <div className="p-3">
                  <span className="text-xs font-medium text-purple-700">{emojis[i]} Motivasi #{i + 1}</span>
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
    <div className="min-h-0 flex-1 flex flex-col" style={{ background: "linear-gradient(135deg, #fef9ef, #fdf2e9, #fef7e6)" }}>
      <div className="px-6 py-3 flex items-center justify-between shrink-0 border-b border-amber-200/50 bg-white/60 backdrop-blur-sm z-10">
        <Link href="/student" className="text-sm text-amber-700 hover:text-amber-900 transition-colors">← Dashboard</Link>
        <h1 className="text-base font-bold text-amber-900 truncate mx-2" style={{ fontFamily: "'Fredoka One', 'Nunito', sans-serif" }}>
          🎬 Video Pembelajaran
        </h1>
        <div />
      </div>
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <Suspense fallback={<div className="text-center py-20 text-amber-400">Memuat video...</div>}>
          <VideoContent />
        </Suspense>
      </div>
    </div>
  );
}
