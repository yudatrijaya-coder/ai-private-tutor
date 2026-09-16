import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { verifyGuardianToken, GUARDIAN_LINK_DAYS } from "@/lib/auth/guardian-link";
import { getStudentSnapshot } from "@/lib/student-snapshot";
import { gradeLabel } from "@/lib/grade-label";

/**
 * Parent-facing monitor page.
 *
 * Deliberately a public route guarded by a signed, expiring token instead of a
 * login: the parent receives a link from their child over WhatsApp and must be
 * able to open it on a phone with no account, no app and no password. The token
 * is the only credential, so:
 *   - the page is `noindex, nofollow` (a leaked-before-shared link must not be
 *     crawled into search results),
 *   - it renders one child only, read-only,
 *   - nothing here can mutate state.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pantau Belajar Anak — Senang Belajar",
  robots: { index: false, follow: false, nocache: true },
};

const SUBJECT_EMOJI: Record<string, string> = {
  Matematika: "🔢",
  "Matematika Penalaran": "🧩",
  "Matematika Tingkat Lanjut": "📐",
  "Bahasa Indonesia": "🇮🇩",
  Bahasa: "📖",
  "Bahasa Inggris": "🇬🇧",
  "Bahasa Inggris Tingkat Lanjut": "🎓",
  "Bahasa Mandarin": "🥟",
  IPA: "🔬",
  IPAS: "🌍",
  IPS: "🏛️",
  Ekonomi: "💰",
  Geografi: "🗺️",
  Sosiologi: "👥",
  Biologi: "🧬",
  Fisika: "⚡",
  Kimia: "⚗️",
  "Pendidikan Agama Islam": "🕌",
  Agama: "🕌",
  "Pendidikan Pancasila": "🤝",
  PKN: "🤝",
  PJOK: "⚽",
  Informatika: "💻",
  Seni: "🎨",
  Sejarah: "📜",
};

/** Mastery band → colour + wording a non-technical parent can read. */
function masteryBand(mastery: number): { label: string; color: string } {
  if (mastery >= 80) return { label: "Sangat baik", color: "var(--st-success)" };
  if (mastery >= 60) return { label: "Baik", color: "var(--st-primary)" };
  if (mastery >= 40) return { label: "Cukup", color: "var(--st-gold)" };
  return { label: "Perlu latihan", color: "var(--st-error)" };
}

const WEAKNESS_LABEL: Record<string, string> = {
  severe: "Belum paham",
  moderate: "Sering salah",
  mild: "Kadang salah",
  none: "Aman",
};

function formatMinutes(min: number): string {
  if (min <= 0) return "0 menit";
  if (min < 60) return `${min} menit`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} jam ${m} menit` : `${h} jam`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Card({
  title,
  icon,
  children,
  accent,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section
      className="rounded-2xl p-5"
      style={{ backgroundColor: "var(--st-bg-card)" }}
    >
      <h2
        className="text-sm font-bold mb-4 flex items-center gap-2"
        style={{
          fontFamily: "var(--font-st-display)",
          color: accent ?? "var(--st-text)",
        }}
      >
        <span>{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function InvalidLink() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--st-bg)" }}
    >
      <div
        className="max-w-sm w-full rounded-2xl p-8 text-center space-y-3"
        style={{ backgroundColor: "var(--st-bg-card)" }}
      >
        <div className="text-4xl">🔒</div>
        <h1
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-st-display)" }}
        >
          Link tidak berlaku
        </h1>
        <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>
          Link pantau ini sudah kedaluwarsa atau tidak sah. Minta anak Anda
          membuat link baru dari menu <strong>Profil &amp; Link Login</strong> di
          halaman belajarnya.
        </p>
      </div>
    </main>
  );
}

export default async function MonitorPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const claims = await verifyGuardianToken(token);
  if (!claims) return <InvalidLink />;

  const snapshot = await getStudentSnapshot(claims.studentId, { days: 14 });
  if (!snapshot) return <InvalidLink />;

  // Parent-linked state drives the "cara dapat laporan mingguan" hint.
  const linked = await prisma.student.findUnique({
    where: { id: claims.studentId },
    select: { parentTelegramId: true, studentId: true },
  });
  const parentLinked = Boolean(linked?.parentTelegramId);

  const { student, today, week, subjects, weakTopics, upcomingExams, studyDays, recentActivities, alerts, badges } = snapshot;

  const maxMinutes = Math.max(...studyDays.map((d) => d.minutes), 1);
  const expiresOn = new Date(claims.expiresAt * 1000);

  return (
    <main
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: "var(--st-bg)", color: "var(--st-text)" }}
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {/* ── Header ── */}
        <header className="text-center space-y-1 pb-2">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--st-secondary)" }}
          >
            Senang Belajar · Pantau Belajar
          </p>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            {student.name}
          </h1>
          <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>
            {gradeLabel(student.gradeLevel)} · Seri {student.currentStreak} hari
            {student.longestStreak > student.currentStreak
              ? ` · Terbaik ${student.longestStreak} hari`
              : ""}
          </p>
        </header>

        {/* ── Today ── */}
        <Card title="Hari Ini" icon={today.active ? "✅" : "💤"}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Waktu belajar", value: formatMinutes(today.studyMinutes) },
              { label: "Aktivitas", value: `${today.activities}` },
              { label: "Kuis selesai", value: `${today.quizzes}` },
              { label: "Materi dibaca", value: `${today.slidesRead}` },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-3"
                style={{ backgroundColor: "var(--st-bg)" }}
              >
                <div className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                  {s.label}
                </div>
                <div
                  className="text-lg font-bold mt-0.5"
                  style={{ fontFamily: "var(--font-st-display)" }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
          {!today.active && (
            <p className="text-xs mt-3" style={{ color: "var(--st-text-dim)" }}>
              Belum ada aktivitas belajar hari ini. Ajakan singkat biasanya
              cukup untuk memulai.
            </p>
          )}
        </Card>

        {/* ── Last 14 days ── */}
        <Card title="Rutinitas 14 Hari Terakhir" icon="📅">
          <div className="flex items-end gap-1 h-24 mb-2">
            {studyDays.map((d) => {
              const h = d.minutes > 0 ? Math.max(6, (d.minutes / maxMinutes) * 100) : 2;
              return (
                <div
                  key={d.date}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${h}%`,
                    backgroundColor:
                      d.minutes > 0 ? "var(--st-primary)" : "rgba(168,162,158,0.25)",
                  }}
                  title={`${d.date}: ${formatMinutes(d.minutes)} · ${d.activities} aktivitas`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs" style={{ color: "var(--st-text-dim)" }}>
            <span>{formatDate(studyDays[0].date)}</span>
            <span>Hari ini</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: "Total belajar", value: formatMinutes(week.studyMinutes) },
              { label: "Hari aktif", value: `${week.activeDays} dari 7` },
              { label: "Kuis selesai", value: `${week.quizzes}` },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                  {s.label}
                </div>
                <div className="text-sm font-bold mt-0.5">{s.value}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Alerts ── */}
        {alerts.length > 0 && (
          <Card title="Perlu Perhatian" icon="⚠️" accent="var(--st-error)">
            <ul className="space-y-2">
              {alerts.map((a, i) => (
                <li
                  key={i}
                  className="rounded-xl p-3 text-sm"
                  style={{ backgroundColor: "rgba(239,68,68,0.08)" }}
                >
                  <span className="font-semibold">{a.issueType}</span>
                  <span className="block text-xs mt-0.5" style={{ color: "var(--st-text-dim)" }}>
                    {a.description}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* ── Upcoming exams ── */}
        {upcomingExams.length > 0 && (
          <Card title="Ujian Mendatang" icon="📝">
            <ul className="space-y-2">
              {upcomingExams.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-xl p-3 text-sm"
                  style={{ backgroundColor: "var(--st-bg)" }}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.title}</div>
                    <div className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                      {SUBJECT_EMOJI[e.subject] ?? "📚"} {e.subject} ·{" "}
                      {formatDateTime(e.scheduledAt)}
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-lg shrink-0 ml-2"
                    style={{
                      backgroundColor:
                        e.daysAway <= 1 ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.12)",
                      color: e.daysAway <= 1 ? "var(--st-error)" : "var(--st-primary)",
                    }}
                  >
                    {e.daysAway === 0
                      ? "Hari ini"
                      : e.daysAway === 1
                        ? "Besok"
                        : `${e.daysAway} hari`}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* ── Subjects ── */}
        <Card title="Penguasaan Mata Pelajaran" icon="📊">
          {subjects.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>
              Belum ada data penguasaan. Data muncul setelah anak menyelesaikan
              kuis atau ujian pertamanya.
            </p>
          ) : (
            <ul className="space-y-3">
              {subjects.map((s) => {
                const band = masteryBand(s.mastery);
                // No graded work yet (only slide/video browsing): a "0%" would
                // read as a failing grade, so show "belum diukur" instead.
                const unmeasured = s.quizCount === 0 && s.examCount === 0;
                return (
                  <li key={s.subject}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">
                        {SUBJECT_EMOJI[s.subject] ?? "📚"} {s.subject}
                      </span>
                      <span className="font-bold" style={{ color: band.color }}>
                        {unmeasured ? "—" : `${s.mastery}%`}
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: "rgba(168,162,158,0.2)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, s.mastery)}%`, backgroundColor: band.color }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1" style={{ color: "var(--st-text-dim)" }}>
                      <span>
                        {unmeasured
                          ? "Belum diukur"
                          : `${band.label} · ${s.quizCount} kuis${s.quizAccuracy !== null ? ` (akurasi ${s.quizAccuracy}%)` : ""}${s.examCount > 0 ? ` · ${s.examCount} ujian` : ""}`}
                      </span>
                      <span>{s.slidesRead} materi</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* ── Weak topics ── */}
        {weakTopics.length > 0 && (
          <Card title="Topik yang Perlu Diulang" icon="🎯">
            <ul className="space-y-2">
              {weakTopics.map((t) => (
                <li
                  key={`${t.subject}-${t.topic}`}
                  className="flex items-center justify-between rounded-xl p-3 text-sm"
                  style={{ backgroundColor: "var(--st-bg)" }}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.topic}</div>
                    <div className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                      {t.subject} · {WEAKNESS_LABEL[t.weaknessLevel] ?? t.weaknessLevel} ·{" "}
                      {t.quizAttempts + t.examAttempts}× dikerjakan
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold shrink-0 ml-2"
                    style={{ color: t.mastery < 40 ? "var(--st-error)" : "var(--st-gold)" }}
                  >
                    {t.mastery}%
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* ── Achievements ── */}
        {badges.length > 0 && (
          <Card title="Pencapaian Terbaru" icon="🏆">
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <span
                  key={b.name}
                  className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ backgroundColor: "rgba(251,191,36,0.15)", color: "var(--st-text)" }}
                  title={formatDate(b.unlockedAt)}
                >
                  {b.icon} {b.name}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* ── Recent activity ── */}
        <Card title="Aktivitas Terbaru" icon="🕒">
          {recentActivities.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>
              Belum ada aktivitas tercatat.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentActivities.map((a, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0">{a.detail}</span>
                  <span className="text-xs shrink-0" style={{ color: "var(--st-text-dim)" }}>
                    {formatDateTime(a.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ── How to get weekly reports ── */}
        <Card title={parentLinked ? "Laporan Mingguan Aktif" : "Aktifkan Laporan Mingguan"} icon="📨">
          {parentLinked ? (
            <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>
              Laporan mingguan dan peringatan dini sudah dikirim otomatis ke
              Telegram Anda. Kirim <code>/laporan</code> ke bot untuk meminta
              laporan kapan saja.
            </p>
          ) : (
            <div className="text-sm space-y-2" style={{ color: "var(--st-text-dim)" }}>
              <p>
                Dapatkan laporan mingguan otomatis lewat Telegram. Buka{" "}
                <strong>@senangbelajar_bot</strong> lalu kirim perintah:
              </p>
              <pre
                className="rounded-xl p-3 text-xs font-mono overflow-x-auto"
                style={{ backgroundColor: "var(--st-bg)", color: "var(--st-text)" }}
              >
                /parent_daftar {linked?.studentId ?? student.studentId}
              </pre>
            </div>
          )}
        </Card>

        <footer
          className="text-center text-xs pt-2 pb-6 space-y-1"
          style={{ color: "var(--st-text-dim)" }}
        >
          <p>
            Halaman ini hanya bisa dilihat lewat link pribadi. Link berlaku
            sampai {expiresOn.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}{" "}
            ({GUARDIAN_LINK_DAYS} hari).
          </p>
          <p>Data diperbarui otomatis setiap kali anak belajar.</p>
        </footer>
      </div>
    </main>
  );
}
