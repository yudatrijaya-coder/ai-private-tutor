"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, Flame, Target } from "lucide-react";

/**
 * "Progres Saya" — the student's own progress panel.
 *
 * Client component so it can call `/api/student/progress` and render after the
 * shell, keeping the home page's server render fast. Every number comes from
 * persisted rows via `getStudentSnapshot`; nothing is estimated client-side.
 *
 * Wording rule: this is read by a 10-16 year old. Plain language, no jargon, no
 * shaming when a number is low — a red number is information, not a verdict.
 */

interface SubjectProgress {
  subject: string;
  mastery: number;
  quizCount: number;
  quizAccuracy: number | null;
  examCount: number;
  examAccuracy: number | null;
  slidesRead: number;
  videosWatched: number;
  lastActiveAt: string;
}

interface Snapshot {
  today: {
    studyMinutes: number;
    activities: number;
    quizzes: number;
    slidesRead: number;
    active: boolean;
  };
  week: {
    studyMinutes: number;
    activeDays: number;
    quizzes: number;
    exams: number;
  };
  student: {
    currentStreak: number;
    longestStreak: number;
    xp: number;
  };
  subjects: SubjectProgress[];
  weakTopics: {
    subject: string;
    topic: string;
    mastery: number;
    weaknessLevel: string;
    quizAttempts: number;
    examAttempts: number;
  }[];
  upcomingExams: {
    id: string;
    title: string;
    subject: string;
    daysAway: number;
    scheduledAt: string;
  }[];
  studyDays: { date: string; minutes: number; activities: number }[];
}

const SUBJECT_EMOJI: Record<string, string> = {
  Matematika: "🔢",
  "Bahasa Indonesia": "🇮🇩",
  "Bahasa Inggris": "🇬🇧",
  IPA: "🔬",
  IPAS: "🌍",
  IPS: "🏛️",
  Informatika: "💻",
  PJOK: "⚽",
  "Pendidikan Pancasila": "🤝",
  "Pendidikan Agama Islam": "🕌",
};

const WEAKNESS_HINT: Record<string, string> = {
  severe: "Belum paham — coba tonton video materinya lagi",
  moderate: "Sering salah — latihan 5 soal lagi",
  mild: "Kadang salah — sekali ulang cukup",
};

function formatMinutes(min: number): string {
  if (min <= 0) return "0 mnt";
  if (min < 60) return `${min} mnt`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}j ${m}m` : `${h} jam`;
}

export default function StudentProgressPanel() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/student/progress")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http"))))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Stay silent on failure: the rest of the home page is still usable, and an
  // error card for a secondary panel is noise.
  if (failed) return null;

  if (!data) {
    return (
      <section className="mb-5">
        <div className="w-40 h-4 bg-gray-200 rounded mb-3 animate-pulse" />
        <div
          className="rounded-2xl p-4 animate-pulse h-32"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        />
      </section>
    );
  }

  const maxMinutes = Math.max(...data.studyDays.map((d) => d.minutes), 1);
  const focus = data.subjects
    .filter((s) => s.mastery < 60)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3);

  return (
    <section className="mb-5 space-y-4">
      {/* ── Today ── */}
      <div>
        <h3
          className="text-base font-bold mb-3"
          style={{ fontFamily: "var(--font-st-display)" }}
        >
          📈 Progres Saya
        </h3>
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { label: "Belajar hari ini", value: formatMinutes(data.today.studyMinutes) },
              { label: "Kuis selesai", value: `${data.today.quizzes}` },
              { label: "Materi dibaca", value: `${data.today.slidesRead}` },
              { label: "Seri", value: `${data.student.currentStreak}🔥` },
            ].map((s) => (
              <div key={s.label}>
                <div
                  className="text-lg font-bold"
                  style={{ fontFamily: "var(--font-st-display)" }}
                >
                  {s.value}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--st-text-dim)" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {!data.today.active && (
            <p
              className="text-xs rounded-xl p-3"
              style={{ backgroundColor: "var(--st-bg)", color: "var(--st-text-dim)" }}
            >
              Belum ada aktivitas hari ini. Mulai dari satu misi di atas — 10
              menit sudah cukup untuk menjaga serimu.
            </p>
          )}

          {/* 14-day bars */}
          <div>
            <div className="text-xs mb-2" style={{ color: "var(--st-text-dim)" }}>
              Rutinitas 14 hari terakhir · {data.week.activeDays} hari aktif minggu ini
            </div>
            <div className="flex items-end gap-1 h-16">
              {data.studyDays.map((d) => {
                const h = d.minutes > 0 ? Math.max(8, (d.minutes / maxMinutes) * 100) : 3;
                return (
                  <div
                    key={d.date}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${h}%`,
                      backgroundColor:
                        d.minutes > 0 ? "var(--st-primary)" : "rgba(168,162,158,0.25)",
                    }}
                    title={`${d.date}: ${formatMinutes(d.minutes)}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Upcoming exams ── */}
      {data.upcomingExams.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <h4
            className="text-sm font-bold mb-3 flex items-center gap-2"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            <CalendarClock size={16} /> Ujian Terdekat
          </h4>
          <ul className="space-y-2">
            {data.upcomingExams.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm">
                <span className="min-w-0 truncate">
                  {SUBJECT_EMOJI[e.subject] ?? "📚"} {e.title}
                </span>
                <span
                  className="text-xs font-bold px-2 py-1 rounded-lg shrink-0 ml-2"
                  style={{
                    backgroundColor:
                      e.daysAway <= 1 ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.12)",
                    color: e.daysAway <= 1 ? "var(--st-error)" : "var(--st-primary)",
                  }}
                >
                  {e.daysAway === 0 ? "Hari ini" : e.daysAway === 1 ? "Besok" : `${e.daysAway} hari`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Focus areas ── */}
      {focus.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <h4
            className="text-sm font-bold mb-3 flex items-center gap-2"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            <Target size={16} /> Fokus Berikutnya
          </h4>
          <ul className="space-y-3">
            {focus.map((s) => (
              <li key={s.subject}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>
                    {SUBJECT_EMOJI[s.subject] ?? "📚"} {s.subject}
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: s.mastery < 40 ? "var(--st-error)" : "var(--st-gold)" }}
                  >
                    {s.mastery}%
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "rgba(168,162,158,0.2)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, s.mastery)}%`,
                      backgroundColor: s.mastery < 40 ? "var(--st-error)" : "var(--st-gold)",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Weak topics ── */}
      {data.weakTopics.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <h4
            className="text-sm font-bold mb-3 flex items-center gap-2"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            <AlertTriangle size={16} /> Perlu Diulang
          </h4>
          <ul className="space-y-2">
            {data.weakTopics.slice(0, 5).map((t) => (
              <li
                key={`${t.subject}-${t.topic}`}
                className="rounded-xl p-3 text-sm"
                style={{ backgroundColor: "var(--st-bg)" }}
              >
                <div className="font-medium truncate">{t.topic}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--st-text-dim)" }}>
                  {t.subject} · {WEAKNESS_HINT[t.weaknessLevel] ?? "Perlu latihan lagi"}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Streak footer ── */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between text-sm"
        style={{ backgroundColor: "var(--st-bg-card)" }}
      >
        <span className="flex items-center gap-2">
          <Flame size={16} style={{ color: "var(--st-secondary)" }} />
          Seri terbaikmu: <strong>{data.student.longestStreak} hari</strong>
        </span>
        <span style={{ color: "var(--st-text-dim)" }}>
          {data.student.xp.toLocaleString("id-ID")} XP
        </span>
      </div>
    </section>
  );
}
