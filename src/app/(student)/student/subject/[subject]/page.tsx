import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import Link from "next/link";
import { getYouTubeForTopic } from "@/data/youtube";

const STUDENT_JWT_SECRET = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET ?? "student-dev-secret-change-in-production",
);

async function getSessionStudent(): Promise<{ studentId: string; studentIdentifier: string; name: string; gradeLevel?: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("student_session")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, STUDENT_JWT_SECRET);
    return payload as { studentId: string; studentIdentifier: string; name: string; gradeLevel?: string };
  } catch {
    return null;
  }
}

/* ── Map subject + grade level → PDF path ── */
const PDF_MAP: Record<string, Record<string, string>> = {
  // SD Kelas 5 — pdf-sd5
  SD_5: {
    IPAS: "IPAS_SD5_BS.pdf",
    PJOK: "PJOK_SD5_BS.pdf",
    Informatika: "Koding_SD5_BS.pdf",
    "Bahasa Inggris": "Inggris_SD5_BS.pdf",
    "Bahasa Indonesia": "Indonesia_SD5_BS.pdf",
    "Pendidikan Pancasila": "Pancasila_SD5_BS.pdf",
  },
  // SMP Kelas 7 — pdf-smp7
  SMP_1: {
    IPA: "IPA_SMP7_BS.pdf",
    IPS: "IPS_SMP7_BS.pdf",
    PJOK: "PJOK_SMP7_BS.pdf",
    Informatika: "Informatika_SMP7_BS.pdf",
    "Bahasa Indonesia": "Indonesia_SMP7_BS.pdf",
    Matematika: "Matematika_SMP7_BS.pdf",
    "Pendidikan Pancasila": "Pancasila_SMP7_BS.pdf",
    "Bahasa Inggris": "Inggris_SMP7_BS.pdf",
  },
  // SMA Kelas 11 — pdf-sma11
  SMA_2: {
    "Bahasa Indonesia": "Indonesia_SMA11_BS.pdf",
    Geografi: "Geografi_SMA11_BS.pdf",
    Informatika: "Informatika_SMA11_BS.pdf",
    PJOK: "PJOK_SMA11_BS.pdf",
    Sosiologi: "Sosiologi_SMA11_BS.pdf",
    Matematika: "Matematika_TL_SMA11_BS.pdf",
    Ekonomi: "Ekonomi_SMA11_BS.pdf",
    "Pendidikan Pancasila": "Pancasila_SMA11_BS.pdf",
    "Bahasa Inggris": "Inggris_SMA11_BS.pdf",
  },
};

function getPdfUrl(subject: string, gradeLevel?: string): string | null {
  const gradeMap = PDF_MAP[gradeLevel ?? ""];
  if (!gradeMap) return null;
  const pdfFile = gradeMap[subject];
  if (!pdfFile) return null;
  const dir = gradeLevel === "SD_5" ? "pdf-sd5" : gradeLevel === "SMA_2" ? "pdf-sma11" : "pdf-smp7";
  return `/${dir}/${pdfFile}`;
}

const SUBJECT_META: Record<string, { emoji: string; color: string }> = {
  Matematika: { emoji: "🔢", color: "#818cf8" },
  Bahasa: { emoji: "📖", color: "#34d399" },
  "Bahasa Indonesia": { emoji: "📖", color: "#34d399" },
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

function getMeta(subject: string) {
  return SUBJECT_META[subject] ?? { emoji: "📚", color: "#94a3b8" };
}

/* ── Content ── */
async function SubjectContent({ subject }: { subject: string }) {
  noStore();

  const session = await getSessionStudent();
  if (!session) return null;

  const decodedSubject = decodeURIComponent(subject);
  const meta = getMeta(decodedSubject);

  // Dapatkan grade level student
  const studentData = await prisma.student.findUnique({
    where: { id: session.studentId },
    select: { gradeLevel: true },
  });

  // Cari curriculum student
  const curriculum = await prisma.curriculum.findFirst({
    where: { studentId: session.studentId },
    include: {
      materials: {
        where: { subject: decodedSubject },
        include: {
          _count: { select: { quizzes: true } },
          quizzes: {
            select: { id: true, type: true, maxScore: true },
            take: 1,
          },
        },
        orderBy: { weekOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!curriculum || curriculum.materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <span className="text-6xl">{meta.emoji}</span>
        <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-st-display)" }}>
          Belum ada materi untuk {decodedSubject}
        </h2>
        <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>
          Materi akan tersedia setelah kurikulum dibuat
        </p>
        <Link
          href="/student"
          className="text-sm underline"
          style={{ color: "var(--st-primary)" }}
        >
          ← Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const totalQuizCount = curriculum.materials.reduce(
    (sum, m) => sum + m._count.quizzes, 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/student"
          className="text-sm"
          style={{ color: "var(--st-text-dim)" }}
        >
          ← Beranda
        </Link>
      </div>

      {/* Subject Hero */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{ backgroundColor: meta.color }}
      >
        <div className="relative z-10">
          <div className="text-4xl mb-2">{meta.emoji}</div>
          <h1
            className="text-white text-xl font-bold"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            {decodedSubject}
          </h1>
          <p className="text-white/80 text-sm mt-1">
            {curriculum.materials.length} topik · {totalQuizCount} quiz
          </p>
        </div>
        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-2 w-16 h-16 rounded-full bg-white/10" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {getPdfUrl(decodedSubject, studentData?.gradeLevel) ? (
          <Link
            href={getPdfUrl(decodedSubject, studentData?.gradeLevel)!}
            target="_blank"
            className="flex flex-col items-center gap-1.5 rounded-2xl p-4 transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: "var(--st-bg-card)" }}
          >
            <span className="text-2xl">📖</span>
            <span className="text-xs font-medium text-center">Buku SIBI</span>
          </Link>
        ) : (
          <span
            className="flex flex-col items-center gap-1.5 rounded-2xl p-4 opacity-50 cursor-not-allowed"
            style={{ backgroundColor: "var(--st-bg-card)" }}
            title="Buku SIBI belum tersedia untuk jenjang ini"
          >
            <span className="text-2xl">📖</span>
            <span className="text-xs font-medium text-center">Buku SIBI</span>
          </span>
        )}
        <Link
          href={`/student/quiz?subject=${encodeURIComponent(decodedSubject)}`}
          className="flex flex-col items-center gap-1.5 rounded-2xl p-4 transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <span className="text-2xl">📝</span>
          <span className="text-xs font-medium text-center">Quiz</span>
        </Link>
        <Link
          href={`/student/quiz?subject=${encodeURIComponent(decodedSubject)}&exam=true`}
          className="flex flex-col items-center gap-1.5 rounded-2xl p-4 transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <span className="text-2xl">📋</span>
          <span className="text-xs font-medium text-center">Exam</span>
        </Link>
        <Link
          href={`/student/topic-tree/${encodeURIComponent(decodedSubject)}`}
          className="flex flex-col items-center gap-1.5 rounded-2xl p-4 transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <span className="text-2xl">🌳</span>
          <span className="text-xs font-medium text-center">Topic Tree</span>
        </Link>
      </div>

      {/* Topic List */}
      <h2
        className="text-base font-bold"
        style={{ fontFamily: "var(--font-st-display)" }}
      >
        📚 Daftar Topik
      </h2>

      <div className="space-y-3">
        {curriculum.materials.map((material) => {
          const hasQuiz = material._count.quizzes > 0;
          const quizId = material.quizzes[0]?.id;

          return (
            <div
              key={material.id}
              className="rounded-2xl p-4"
              style={{ backgroundColor: "var(--st-bg-card)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold text-sm truncate"
                    style={{ fontFamily: "var(--font-st-display)" }}
                  >
                    {material.topic}
                  </h3>
                  {material.subTopic && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--st-text-dim)" }}>
                      {material.subTopic}
                    </p>
                  )}
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2"
                  style={{
                    backgroundColor: `${meta.color}20`,
                    color: meta.color,
                  }}
                >
                  Minggu {material.weekOrder}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* Baca Buku — link ke slide viewer */}
                <Link
                  href={`/student/slides/${material.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80 active:scale-95"
                  style={{
                    backgroundColor: `${meta.color}15`,
                    color: meta.color,
                  }}
                >
                  📖 Baca
                </Link>

                {/* Quiz */}
                {hasQuiz && quizId ? (
                  <Link
                    href={`/student/quiz?quizId=${quizId}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80 active:scale-95"
                    style={{
                      backgroundColor: "rgba(99,102,241,0.1)",
                      color: "var(--st-primary)",
                    }}
                  >
                    📝 Quiz
                  </Link>
                ) : (
                  <span
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium opacity-40 cursor-not-allowed"
                    style={{
                      backgroundColor: "rgba(168,162,158,0.1)",
                      color: "var(--st-text-dim)",
                    }}
                  >
                    📝 Quiz
                  </span>
                )}

                {/* Exam */}
                <Link
                  href={`/student/quiz?subject=${encodeURIComponent(decodedSubject)}&exam=true`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80 active:scale-95"
                  style={{
                    backgroundColor: "rgba(245,158,11,0.1)",
                    color: "#d97706",
                  }}
                >
                  📋 Exam
                </Link>

                {/* Mindmap — per topik */}
                <Link
                  href={`/student/mindmap/${encodeURIComponent(decodedSubject)}?id=${material.id}`}
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-xs transition-all hover:opacity-80 active:scale-95"
                  style={{
                    backgroundColor: "rgba(167,139,250,0.1)",
                    color: "#a78bfa",
                  }}
                  title="Lihat mindmap untuk topik ini"
                >
                  🧠
                </Link>

                {/* YouTube — per topik */}
                {(() => {
                  const ytVideos = getYouTubeForTopic(decodedSubject, material.topic, studentData?.gradeLevel);
                  if (ytVideos.length === 0) return null;
                  return (
                    <div className="flex gap-0.5">
                      {ytVideos.slice(0, 3).map((yt, i) => (
                        <a
                          key={i}
                          href={yt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-xs transition-all hover:opacity-80 active:scale-95"
                          style={{
                            backgroundColor: "rgba(239,68,68,0.1)",
                            color: "#ef4444",
                          }}
                          title={`${yt.channel} — ${yt.title}`}
                        >
                          ▶️
                        </a>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Page ── */
export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin text-4xl">📚</div>
        </div>
      }
    >
      <SubjectContent subject={subject} />
    </Suspense>
  );
}
