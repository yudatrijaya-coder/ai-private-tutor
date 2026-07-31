"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";

/* ── Types ── */
interface GamificationData {
  xp: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  rank: number;
  totalStudents: number;
  dueReviews: number;
  badges: {
    unlocked: BadgeRow[];
    locked: BadgeRow[];
    unlockedCount: number;
    totalCount: number;
  };
}

interface BadgeRow {
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  unlockedAt?: string;
}

interface SubjectMastery {
  subject: string;
  quizCount: number;
  quizTotalScore: number;
  quizTotalMax: number;
  quizBestScore: number;
  quizBestMax: number;
  examCount: number;
  slidesRead: number;
  mindmapsOpen: number;
  videosWatched: number;
  mastery: number;
  lastActiveAt: string;
}

interface ActivitySummary {
  totalQuizzes: number;
  totalExams: number;
  totalSlides: number;
  totalMindmaps: number;
  totalVideos: number;
  overallMastery: number;
  subjects: SubjectMastery[];
  recentActivity: { type: string; subject: string; topic?: string; createdAt: string }[];
}

const EMOJI: Record<string, string> = {
  Matematika: "🔢", Bahasa: "📖", "Bahasa Indonesia": "📖",
  IPA: "🔬", IPAS: "🔬", IPS: "🌍", Agama: "🕌",
  PKN: "🤝", "Pendidikan Pancasila": "🤝",
  PJOK: "⚽", Informatika: "💻", "Bahasa Inggris": "🌏",
};

const ACTIVITY_EMOJI: Record<string, string> = {
  quiz_complete: "📝", exam_complete: "📋",
  slide_view: "📄", mindmap_view: "🧠", video_click: "🎬",
  quiz_start: "🎯", exam_start: "🎯",
};

const CATEGORY_LABEL: Record<string, string> = {
  milestone: "🏆 Pencapaian",
  streak: "🔥 Konsistensi",
  mastery: "📚 Penguasaan",
  consistency: "💪 Rajin",
};

function MasteryBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--st-bg-card)" }}>
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function AchievementPage() {
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [mastery, setMastery] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [badgeFilter, setBadgeFilter] = useState<string>("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/students/gamification").then((r) => r.json()),
      fetch("/api/students/mastery").then((r) => r.json()),
    ])
      .then(([g, m]) => {
        if (g.error) { setError(g.error); return; }
        setGamification(g);
        setMastery(m);
      })
      .catch(() => setError("Gagal memuat data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin text-4xl">🏆</div></div>;
  if (error) return <div className="text-center py-20"><div className="text-4xl mb-3">😅</div><p className="text-sm" style={{ color: "var(--st-text-dim)" }}>{error}</p></div>;
  if (!gamification || !mastery) return null;

  const filtered = activeFilter === "all" ? mastery.subjects : mastery.subjects.filter((s) => s.subject === activeFilter);

  const badgeCategories = [...new Set(gamification.badges.unlocked.map((b) => b.category))];
  const filteredBadges = badgeFilter === "all"
    ? gamification.badges.unlocked
    : gamification.badges.unlocked.filter((b) => b.category === badgeFilter);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="text-center py-4">
        <div className="text-5xl mb-2">🏆</div>
        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-st-display)" }}>
          Pencapaian Belajar
        </h1>
      </div>

      {/* Gamification Hero Card */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--st-primary)", color: "#fff" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-st-display)" }}>
              ⭐ {gamification.xp.toLocaleString()} XP
            </p>
            <p className="text-xs opacity-80 mt-1">
              Peringkat #{gamification.rank} dari {gamification.totalStudents} siswa
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg">🔥 {gamification.currentStreak} hari</p>
            <p className="text-xs opacity-80">Terpanjang: {gamification.longestStreak} hari</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-lg font-bold">{gamification.badges.unlockedCount}</p>
            <p className="text-xs opacity-80">🏅 Badge</p>
          </div>
          <div>
            <p className="text-lg font-bold">{mastery.totalQuizzes}</p>
            <p className="text-xs opacity-80">📝 Quiz</p>
          </div>
          <div>
            <p className="text-lg font-bold">{mastery.totalSlides + mastery.totalMindmaps}</p>
            <p className="text-xs opacity-80">📄 Materi</p>
          </div>
          <div>
            <p className="text-lg font-bold">{gamification.dueReviews}</p>
            <p className="text-xs opacity-80">🔄 Review</p>
          </div>
        </div>
      </div>

      {/* Badge Section */}
      {gamification.badges.unlockedCount > 0 && (
        <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: "var(--st-bg-card)" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">🏅 Badge</h2>
            <span className="text-xs" style={{ color: "var(--st-text-dim)" }}>
              {gamification.badges.unlockedCount}/{gamification.badges.totalCount}
            </span>
          </div>
          {badgeCategories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setBadgeFilter("all")}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{ backgroundColor: badgeFilter === "all" ? "var(--st-primary)" : "var(--st-bg)", color: badgeFilter === "all" ? "#fff" : "var(--st-text)" }}>
                Semua
              </button>
              {badgeCategories.map((c) => (
                <button key={c} onClick={() => setBadgeFilter(c)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{ backgroundColor: badgeFilter === c ? "var(--st-primary)" : "var(--st-bg)", color: badgeFilter === c ? "#fff" : "var(--st-text)" }}>
                  {CATEGORY_LABEL[c] || c}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {filteredBadges.map((b) => (
              <div key={b.code} className="text-center p-2 rounded-xl" style={{ backgroundColor: "var(--st-bg)" }}>
                <div className="text-2xl mb-1">{b.icon}</div>
                <p className="text-xs font-bold leading-tight">{b.name}</p>
                {b.unlockedAt && (
                  <p className="text-[10px]" style={{ color: "var(--st-text-dim)" }}>
                    {new Date(b.unlockedAt).toLocaleDateString("id-ID")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Mastery */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--st-primary)", color: "#fff" }}>
        <p className="text-xs font-medium opacity-80 mb-1">Penguasaan Keseluruhan</p>
        <p className="text-4xl font-bold" style={{ fontFamily: "var(--font-st-display)" }}>
          {Math.round(mastery.overallMastery * 100)}%
        </p>
      </div>

      {/* Subject Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setActiveFilter("all")}
          className="shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all"
          style={{ backgroundColor: activeFilter === "all" ? "var(--st-primary)" : "var(--st-bg-card)", color: activeFilter === "all" ? "#fff" : "var(--st-text)" }}>
          📊 Semua
        </button>
        {mastery.subjects.map((s) => (
          <button key={s.subject} onClick={() => setActiveFilter(s.subject)}
            className="shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all"
            style={{ backgroundColor: activeFilter === s.subject ? "var(--st-primary)" : "var(--st-bg-card)", color: activeFilter === s.subject ? "#fff" : "var(--st-text)" }}>
            {EMOJI[s.subject] || "📚"} {s.subject}
          </button>
        ))}
      </div>

      {/* Subject Mastery Cards */}
      {filtered.map((s) => (
        <div key={s.subject} className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: "var(--st-bg-card)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">{EMOJI[s.subject] || "📚"} {s.subject}</h2>
              <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                Terakhir: {new Date(s.lastActiveAt).toLocaleDateString("id-ID")}
              </p>
            </div>
            <span className="text-lg font-bold" style={{ color: s.mastery >= 0.8 ? "#22c55e" : s.mastery >= 0.5 ? "#f59e0b" : "#ef4444" }}>
              {Math.round(s.mastery * 100)}%
            </span>
          </div>
          <MasteryBar value={s.mastery} label="Penguasaan" />
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="text-center p-2 rounded-xl" style={{ backgroundColor: "var(--st-bg)" }}>
              <p className="text-sm font-bold">{s.quizCount}</p>
              <p className="text-[10px]" style={{ color: "var(--st-text-dim)" }}>Quiz</p>
            </div>
            <div className="text-center p-2 rounded-xl" style={{ backgroundColor: "var(--st-bg)" }}>
              <p className="text-sm font-bold">{s.slidesRead}</p>
              <p className="text-[10px]" style={{ color: "var(--st-text-dim)" }}>Slide</p>
            </div>
            <div className="text-center p-2 rounded-xl" style={{ backgroundColor: "var(--st-bg)" }}>
              <p className="text-sm font-bold">{s.mindmapsOpen}</p>
              <p className="text-[10px]" style={{ color: "var(--st-text-dim)" }}>Mindmap</p>
            </div>
            <div className="text-center p-2 rounded-xl" style={{ backgroundColor: "var(--st-bg)" }}>
              <p className="text-sm font-bold">{s.videosWatched}</p>
              <p className="text-[10px]" style={{ color: "var(--st-text-dim)" }}>Video</p>
            </div>
            <div className="text-center p-2 rounded-xl" style={{ backgroundColor: "var(--st-bg)" }}>
              <p className="text-sm font-bold">{s.examCount}</p>
              <p className="text-[10px]" style={{ color: "var(--st-text-dim)" }}>Exam</p>
            </div>
            <div className="text-center p-2 rounded-xl" style={{ backgroundColor: "var(--st-bg)" }}>
              <p className="text-sm font-bold">{s.quizBestScore}/{s.quizBestMax}</p>
              <p className="text-[10px]" style={{ color: "var(--st-text-dim)" }}>Best</p>
            </div>
          </div>
        </div>
      ))}

      {/* Recent Activity */}
      {mastery.recentActivity.length > 0 && (
        <div className="rounded-2xl p-5 space-y-2" style={{ backgroundColor: "var(--st-bg-card)" }}>
          <h3 className="font-bold text-sm">⚡ Aktivitas Terbaru</h3>
          {mastery.recentActivity.slice(0, 10).map((a, i) => (
            <div key={i} className="flex items-center gap-3 text-xs py-1.5">
              <span>{ACTIVITY_EMOJI[a.type] || "📌"}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate">{EMOJI[a.subject] || ""} {a.subject}{a.topic ? ` · ${a.topic}` : ""}</p>
              </div>
              <span style={{ color: "var(--st-text-dim)" }}>{formatRelativeTime(a.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Back */}
      <div className="text-center pt-2">
        <Link href="/student" className="inline-block text-xs underline" style={{ color: "var(--st-text-dim)" }}>
          ← Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}j lalu`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}h lalu`;
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}