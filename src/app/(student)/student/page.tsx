import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import Link from "next/link";
import { SkeletonStudentPage } from "@/components/Skeleton";
import { QuoteRotator } from "@/components/QuoteRotator";
import { RecommendationCarousel } from "@/components/RecommendationCarousel";
import { getYouTubeForTopic } from "@/data/youtube";
import { DashboardTracker } from "@/components/DashboardTracker";
import { TrackedSubjectCircle } from "@/components/TrackedSubjectCircle";
import SchoolScheduleSection from "@/components/SchoolScheduleSection";
import { MoodleQuickLink } from "@/components/MoodleQuickLink";

const STUDENT_JWT_SECRET = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET ?? "student-dev-secret-change-in-production",
);

/** Baca student_session cookie dan dapatkan studentId dan studentIdentifier (kode) */
async function getSessionStudent(): Promise<{
  id: string;
  identifier: string;
  name: string;
  gradeLevel?: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("student_session")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, STUDENT_JWT_SECRET);
    const p = payload as {
      studentId: string;
      studentIdentifier: string;
      name: string;
      gradeLevel?: string;
    };
    return {
      id: p.studentId,
      identifier: p.studentIdentifier,
      name: p.name,
      gradeLevel: p.gradeLevel,
    };
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
  "Bahasa Mandarin": { emoji: "🀄", color: "#ef4444" },
};

/* ── Map subject + grade level → PDF SIBI path ── */
const PDF_MAP: Record<string, Record<string, string>> = {
  SD_5: {
    IPAS: "IPAS_SD5_BS.pdf",
    PJOK: "PJOK_SD5_BS.pdf",
    Informatika: "Koding_SD5_BS.pdf",
    "Bahasa Inggris": "Inggris_SD5_BS.pdf",
    "Bahasa Indonesia": "Indonesia_SD5_BS.pdf",
    "Pendidikan Pancasila": "Pancasila_SD5_BS.pdf",
  },
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
  const dir =
    gradeLevel === "SD_5" ? "pdf-sd5" : gradeLevel === "SMA_2" ? "pdf-sma11" : "pdf-smp7";
  return `/${dir}/${pdfFile}`;
}

function getMeta(subject: string) {
  return SUBJECT_META[subject] ?? { emoji: "📚", color: "#94a3b8" };
}

/* ── Quote Rotator ── */
function QuoteSection() {
  return (
    <div className="mb-4">
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: "var(--st-bg-card)" }}
      >
        <QuoteRotator />
      </div>
    </div>
  );
}

/* ── Rekomendasi Hari Ini ── */
async function RecommendationSection() {
  noStore();
  const session = await getSessionStudent();
  if (!session) return null;

  const student = await prisma.student.findUnique({
    where: { id: session.id },
    select: { gradeLevel: true },
  });

  // Ambil materi dari jadwal hari ini + beberapa random
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaySessions = await prisma.scheduleSession.findMany({
    where: {
      studentId: session.id,
      scheduledAt: { gte: today, lt: tomorrow },
      status: "SCHEDULED",
    },
    orderBy: { scheduledAt: "asc" },
  });

  // Collect unique topics from today's sessions
  const topicKeys = new Set<string>();
  const todayTopics: { subject: string; topic: string }[] = [];

  for (const s of todaySessions) {
    const key = `${s.subject}|${s.topic}`;
    if (s.subject && s.topic && !topicKeys.has(key)) {
      topicKeys.add(key);
      todayTopics.push({ subject: s.subject, topic: s.topic });
    }
  }

  // Fallback: ambil random materials jika tidak ada jadwal hari ini
  if (todayTopics.length === 0) {
    const fallbackMats = await prisma.material.findMany({
      where: {
        curriculum: {
          studentId: session.id,
        },
      },
      select: { subject: true, topic: true },
      take: 20,
      orderBy: { weekOrder: "asc" },
    });
    const seen = new Set<string>();
    for (const m of fallbackMats) {
      const key = `${m.subject}|${m.topic}`;
      if (!seen.has(key)) {
        seen.add(key);
        todayTopics.push({ subject: m.subject, topic: m.topic });
      }
    }
  }

  // Shuffle and take max 5
  const shuffled = todayTopics.sort(() => Math.random() - 0.5).slice(0, 5);

  if (shuffled.length === 0) return null;

  // For each topic, generate recommendations
  const recommendations: {
    type: string;
    icon: string;
    label: string;
    subtitle: string;
    href: string;
    color: string;
  }[] = [];

  for (const t of shuffled) {
    const meta = getMeta(t.subject);
    // 1. Baca slide
    recommendations.push({
      type: "slide",
      icon: "📖",
      label: `Baca slide: ${t.topic}`,
      subtitle: `${t.subject} — Pelajari konsepnya dulu!`,
      href: `/student/subject/${encodeURIComponent(t.subject)}`,
      color: meta.color,
    });

    // 2. Quiz
    recommendations.push({
      type: "quiz",
      icon: "📝",
      label: `Kerjain quiz: ${t.topic}`,
      subtitle: `${t.subject} — Uji pemahaman kamu!`,
      href: `/student/quiz?subject=${encodeURIComponent(t.subject)}`,
      color: meta.color,
    });

    // 3. Mindmap
    recommendations.push({
      type: "mindmap",
      icon: "🧠",
      label: `Lihat mindmap: ${t.topic}`,
      subtitle: `${t.subject} — Biar makin paham!`,
      href: `/student/topic-tree/${encodeURIComponent(t.subject)}`,
      color: "#a78bfa",
    });

    // 4. YouTube video (if available)
    const videos = getYouTubeForTopic(t.subject, t.topic, student?.gradeLevel);
    if (videos.length > 0) {
      recommendations.push({
        type: "video",
        icon: "▶️",
        label: `Tonton video: ${t.topic}`,
        subtitle: videos[0].channel,
        href: videos[0].url,
        color: "#ef4444",
      });
    }

    // 5. Buku SIBI (if available)
    const pdfUrl = getPdfUrl(t.subject, student?.gradeLevel);
    if (pdfUrl) {
      recommendations.push({
        type: "sibi",
        icon: "📚",
        label: `Baca buku ${t.subject}`,
        subtitle: "Buku SIBI Kurikulum Merdeka",
        href: pdfUrl,
        color: "#f59e0b",
      });
    }
  }

  // Shuffle final recs — ambil banyak, nanti di-carousel 3 per halaman
  const finalRecs = recommendations.sort(() => Math.random() - 0.5);

  return (
    <div className="mb-5" data-recs-section="true">
      <h3
        className="text-base font-bold mb-3 px-1"
        style={{ fontFamily: "var(--font-st-display)" }}
      >
        ✨ Rekomendasi Hari Ini
      </h3>
      <RecommendationCarousel items={finalRecs} />
    </div>
  );
}

/* ── Aktivitas Cepat ── */
function QuickActionsSection({ gradeLevel }: { gradeLevel?: string }) {
  const actions = [
    { icon: "📝", label: "Quiz", href: "/student/quiz", color: "#6366f1" },
    { icon: "📋", label: "Exam", href: "/student/quiz?exam=true", color: "#f59e0b" },
    { icon: "🗺️", label: "Big Map", href: "/student/big-mindmap", color: "#a78bfa" },
    { icon: "🎬", label: "Video", href: "/student/videos", color: "#ef4444" },
    { icon: "🏆", label: "Pencapaian", href: "/student/achievement", color: "#22c55e" },
  ];

  return (
    <div className="mb-5">
      <h3
        className="text-base font-bold mb-3"
        style={{ fontFamily: "var(--font-st-display)" }}
      >
        🚀 Aktivitas Cepat
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex flex-col items-center gap-1.5 rounded-2xl p-4 transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: "var(--st-bg-card)" }}
          >
            <span className="text-3xl">{a.icon}</span>
            <span className="text-xs font-semibold text-center">{a.label}</span>
          </Link>
        ))}
        {/* Buku SIBI - pilih subject random yang punya PDF */}
        <SibiQuickLink gradeLevel={gradeLevel} />
        {/* Modul Moodle */}
        <MoodleQuickLink gradeLevel={gradeLevel} />
      </div>
    </div>
  );
}

async function SibiQuickLink({ gradeLevel }: { gradeLevel?: string }) {
  if (!gradeLevel) return null;
  const gradeMap = PDF_MAP[gradeLevel];
  if (!gradeMap) return null;
  const entries = Object.entries(gradeMap);
  const randomEntry = entries[Math.floor(Math.random() * entries.length)];
  const dir = gradeLevel === "SD_5" ? "pdf-sd5" : gradeLevel === "SMA_2" ? "pdf-sma11" : "pdf-smp7";

  return (
    <a
      href={`/${dir}/${randomEntry[1]}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1.5 rounded-2xl p-4 transition-all hover:scale-105 active:scale-95"
      style={{ backgroundColor: "var(--st-bg-card)" }}
    >
      <span className="text-3xl">📚</span>
      <span className="text-xs font-semibold text-center">Buku SIBI</span>
    </a>
  );
}

/* ── Schedule section — INTERAKTIF ── */
async function ScheduleSection() {
  noStore();

  const session = await getSessionStudent();
  if (!session) return null;

  const student = await prisma.student.findUnique({
    where: { id: session.id },
    select: { gradeLevel: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaySessions = await prisma.scheduleSession.findMany({
    where: {
      studentId: session.id,
      scheduledAt: { gte: today, lt: tomorrow },
      status: "SCHEDULED",
    },
    orderBy: { scheduledAt: "asc" },
  });

  if (todaySessions.length === 0) return null;

  // Get matching materials for each session (by subject+topic)
  const matQueries = todaySessions.map((s) => ({
    subject: s.subject ?? "",
    topic: s.topic ?? "",
  }));
  const materials = await prisma.material.findMany({
    where: {
      curriculum: { studentId: session.id },
      OR: matQueries.map((mq) => ({
        subject: mq.subject,
        topic: mq.topic,
      })),
    },
    select: {
      id: true,
      subject: true,
      topic: true,
      quizzes: { select: { id: true }, take: 1 },
    },
  });
  const matByKey = new Map(
    materials.map((m) => [`${m.subject}|${m.topic}`, m])
  );

  return (
    <div className="mb-5">
      <h3
        className="text-base font-bold mb-3"
        style={{ fontFamily: "var(--font-st-display)" }}
      >
        📅 Jadwal Hari Ini
      </h3>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--st-bg-card)" }}
      >
        <div className="divide-y" style={{ borderColor: "var(--st-bg, #f0f4ff)" }}>
          {todaySessions.map((sessionItem) => {
            const meta = getMeta(sessionItem.subject ?? "");
            const subject = sessionItem.subject ?? "";
            const topic = sessionItem.topic ?? "";

            // Cari materialId dari matching subject+topic
            const mat = matByKey.get(`${subject}|${topic}`);
            const matId = mat?.id;
            const quizId = mat?.quizzes[0]?.id;

            // YouTube videos
            const videos = getYouTubeForTopic(subject, topic, student?.gradeLevel);
            const pdfUrl = getPdfUrl(subject, student?.gradeLevel);

            return (
              <div key={sessionItem.id} className="p-4 space-y-3">
                {/* Header jadwal */}
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {sessionItem.type === "DAILY" ? "📖" : "⚡"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {subject ? `${subject} — ${topic}` : topic || "Belajar"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                      {new Date(sessionItem.scheduledAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {sessionItem.durationMin} menit
                    </p>
                  </div>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                    style={{
                      backgroundColor:
                        sessionItem.type === "DAILY"
                          ? "rgba(99,102,241,0.1)"
                          : "rgba(249,115,22,0.1)",
                      color: "var(--st-primary)",
                    }}
                  >
                    {sessionItem.type === "DAILY" ? "Harian" : "Intensif"}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {matId && (
                    <Link
                      href={`/student/slides/${matId}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                      style={{
                        backgroundColor: `${meta.color}15`,
                        color: meta.color,
                      }}
                    >
                      📖 Baca
                    </Link>
                  )}
                  {matId && (
                    <Link
                      href={`/student/quiz?quizId=${quizId || matId}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                      style={{
                        backgroundColor: "rgba(99,102,241,0.1)",
                        color: "var(--st-primary)",
                      }}
                    >
                      📝 Quiz
                    </Link>
                  )}
                  {matId && (
                    <Link
                      href={`/student/mindmap/${encodeURIComponent(subject)}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                      style={{
                        backgroundColor: "rgba(167,139,250,0.1)",
                        color: "#a78bfa",
                      }}
                    >
                      🧠 Mindmap
                    </Link>
                  )}
                  {videos.length > 0 && (
                    <a
                      href={videos[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                      style={{
                        backgroundColor: "rgba(239,68,68,0.1)",
                        color: "#ef4444",
                      }}
                    >
                      ▶️ Video
                    </a>
                  )}
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                      style={{
                        backgroundColor: "rgba(245,158,11,0.1)",
                        color: "#d97706",
                      }}
                    >
                      📚 Buku
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Subject grid ── */
async function SubjectGridSection() {
  noStore();

  const session = await getSessionStudent();
  if (!session) return null;

  const curricula = await prisma.curriculum.findMany({
    where: { studentId: session.id },
    select: {
      materials: {
        select: { subject: true },
        distinct: ["subject"],
        orderBy: { subject: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Collect unique subjects from ALL curricula
  const subjectSet = new Set<string>();
  for (const c of curricula) {
    for (const m of c.materials) {
      subjectSet.add(m.subject);
    }
  }
  const subjects = Array.from(subjectSet).sort();
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
              <TrackedSubjectCircle
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

/* ── Settings ── */
function SettingsSection() {
  return (
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
  );
}

/* ── Skeleton fallbacks ── */
function SkeletonRecs() {
  return (
    <div className="mb-5">
      <div className="w-40 h-4 bg-gray-200 rounded mb-3 animate-pulse" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl animate-pulse" style={{ backgroundColor: "var(--st-bg-card)" }}>
            <div className="w-10 h-10 rounded-xl bg-gray-200" />
            <div className="flex-1 space-y-1">
              <div className="w-3/4 h-3 bg-gray-200 rounded" />
              <div className="w-1/2 h-2 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonSchedule() {
  return (
    <div className="mb-5 animate-pulse">
      <div className="w-32 h-4 bg-gray-200 rounded mb-3" />
      <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: "var(--st-bg-card)" }}>
        {[1, 2, 3].map((i) => (
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
  );
}

/* ── Page ── */
export default function StudentHomePage() {
  return (
    <DashboardTracker>
    <>
      {/* Rekomendasi Hari Ini */}
      <Suspense fallback={<SkeletonRecs />}>
        <RecommendationSection />
      </Suspense>

      {/* Quote */}
      <QuoteSection />

      {/* Aktivitas Cepat */}
      <Suspense fallback={null}>
        <QuickActionsDynamic />
      </Suspense>

      {/* Subject Grid */}
      <Suspense
        fallback={
          <div className="mb-5">
            <div className="w-32 h-4 bg-gray-200 rounded mb-3 animate-pulse" />
            <div className="rounded-2xl p-4 animate-pulse" style={{ backgroundColor: "var(--st-bg-card)" }}>
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

      {/* Jadwal Sekolah (dari SiKumbang) */}
      <Suspense fallback={<SkeletonSchedule />}>
        <SchoolScheduleServer />
      </Suspense>

      {/* Jadwal Interaktif */}
      <Suspense fallback={<SkeletonSchedule />}>
        <ScheduleSection />
      </Suspense>

      {/* Pengaturan */}
      <SettingsSection />
    </>
    </DashboardTracker>
  );
}

/* ── QuickActions with gradeLevel ── */
async function QuickActionsDynamic() {
  const session = await getSessionStudent();
  if (!session) return null;
  const student = await prisma.student.findUnique({
    where: { id: session.id },
    select: { gradeLevel: true },
  });
  return <QuickActionsSection gradeLevel={student?.gradeLevel} />;
}

/* ── School Schedule Server Wrapper ── */
async function SchoolScheduleServer() {
  const session = await getSessionStudent();
  if (!session) return null;
  return (
    <SchoolScheduleSection
      studentCode={session.identifier}
      studentName={session.name}
    />
  );
}
