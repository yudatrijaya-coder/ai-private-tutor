"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ── Types ── */

interface ExamListItem {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  questionCount: number;
  maxScore: number;
  createdAt: string;
  attempt: {
    id: string;
    score: number;
    maxScore: number;
    status: string;
    createdAt: string;
  } | null;
}

interface ExamQuestion {
  id: string;
  topic: string;
  subTopic: string | null;
  question: string;
  options: string[];
  difficulty: string;
}

interface ExamDetail {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  maxScore: number;
  questionCount: number;
  questions: ExamQuestion[];
  attempt: {
    id: string;
    score: number;
    maxScore: number;
    status: string;
    createdAt: string;
  } | null;
}

interface ExamResult {
  score: number;
  totalQuestions: number;
  correctCount: number;
  attemptNumber?: number;
  details?: {
    questionIndex: number;
    correct: boolean;
    correctIndex: number;
    userAnswer?: string;
    correctAnswer?: string;
    explanation: string;
  }[];
}

const SUBJECT_EMOJI: Record<string, string> = {
  Matematika: "🔢",
  "Matematika Penalaran": "🧩",
  "Matematika Tingkat Lanjut": "📐",
  "Bahasa Indonesia": "🇮🇩",
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
  "Pendidikan Pancasila": "🤝",
  PJOK: "⚽",
  Informatika: "💻",
  Sejarah: "📜",
};

function emojiFor(subject: string): string {
  return SUBJECT_EMOJI[subject] ?? "📋";
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/* ── Main component ── */

export default function ExamPage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // active exam session
  const [activeExam, setActiveExam] = useState<ExamDetail | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [confirmStart, setConfirmStart] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [previousAttempt, setPreviousAttempt] = useState<ExamResult | null>(null);

  const hasFetchedRef = useRef(false);

  // Resolve student from session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.student?.studentId) {
          setStudentId(data.student.studentId);
        } else {
          setError("Sesi tidak valid. Login ulang.");
        }
      })
      .catch(() => setError("Gagal memuat sesi"));
  }, []);

  // Fetch exam list
  useEffect(() => {
    if (!studentId || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    setLoading(true);
    fetch(`/api/students/exams?studentId=${encodeURIComponent(studentId)}`)
      .then((r) => r.json())
      .then((data) => {
        setExams(data.exams || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError("Gagal memuat daftar exam");
      });
  }, [studentId]);

  const loadExam = useCallback(
    async (examId: string) => {
      if (!studentId) return;
      setError(null);
      setReviewMode(false);
      try {
        const r = await fetch(
          `/api/students/exams/${examId}?studentId=${encodeURIComponent(studentId)}`,
        );
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || "Gagal memuat exam");
          return;
        }
        setActiveExam(data.exam);
        setCurrentIdx(0);
        setAnswers(new Array(data.exam.questionCount).fill(null));
        setResult(null);
        // Already attempted → reconstruct result from stored attempt (if available);
        // fresh → confirmation first
        if (data.exam.attempt) {
          setPreviousAttempt({
            score: data.exam.attempt.score,
            totalQuestions: data.exam.questionCount,
            correctCount: Math.round(
              (data.exam.attempt.score / Math.max(1, data.exam.attempt.maxScore)) *
                data.exam.questionCount,
            ),
            // per-question details (correctIndex + explanation) from stored attempt
            details: data.exam.attempt.details ?? null,
            attemptNumber: data.exam.attempt.attemptNumber ?? 1,
          });
          setConfirmStart(false);
        } else {
          setPreviousAttempt(null);
          setConfirmStart(true);
        }
      } catch {
        setError("Gagal memuat exam");
      }
    },
    [studentId],
  );

  const handleStart = () => {
    setConfirmStart(true);
  };

  const handleSubmit = async () => {
    if (!activeExam || !studentId || submitting) return;
    setSubmitting(true);
    try {
      const payload: Record<number, string> = {};
      activeExam.questions.forEach((q, idx) => {
        const ans = answers[idx];
        if (ans !== null) payload[idx] = LETTERS[ans];
      });

      const r = await fetch("/api/exam/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, examId: activeExam.id, answers: payload }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Gagal mengirim jawaban");
        setSubmitting(false);
        return;
      }
      setResult({
        score: data.score,
        totalQuestions: data.totalQuestions,
        correctCount: data.correctCount,
        details: data.details,
      });
      setSubmitting(false);
    } catch {
      setSubmitting(false);
      setError("Gagal mengirim jawaban");
    }
  };

  const handleRetake = () => {
    // Reset to fresh attempt: show confirm start modal, clear previous result
    setResult(null);
    setPreviousAttempt(null);
    setAnswers(new Array(activeExam?.questionCount ?? 0).fill(null));
    setCurrentIdx(0);
    setConfirmStart(true);
  };

  const answeredCount = answers.filter((a) => a !== null).length;

  /* ── Render: result (fresh submit OR previous attempt) ── */
  const displayResult = result ?? previousAttempt;
  if (displayResult && activeExam) {
    const pct = activeExam.questions.length > 0
      ? Math.round((displayResult.correctCount / activeExam.questions.length) * 100)
      : 0;
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div
          className="rounded-2xl p-6 text-center"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <div className="text-5xl mb-3">{pct >= 70 ? "🎉" : pct >= 50 ? "💪" : "📚"}</div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            {activeExam.subject} — Selesai!
          </h1>
          <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>
            {activeExam.title}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "var(--st-bg)" }}
            >
              <div className="text-2xl font-bold">{pct}%</div>
              <div className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                Nilai
              </div>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "var(--st-bg)" }}
            >
              <div className="text-2xl font-bold text-green-600">{displayResult.correctCount}</div>
              <div className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                Benar
              </div>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "var(--st-bg)" }}
            >
              <div className="text-2xl font-bold text-red-500">
                {displayResult.totalQuestions - displayResult.correctCount}
              </div>
              <div className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                Salah
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={() => setReviewMode(true)}
              className="px-5 py-2.5 rounded-xl font-semibold text-white"
              style={{ backgroundColor: "var(--st-primary)" }}
            >
              Lihat Pembahasan
            </button>
            <button
              onClick={handleRetake}
              className="px-5 py-2.5 rounded-xl font-semibold"
              style={{ backgroundColor: "var(--st-bg-card)", border: "1px solid var(--st-border, #e5e7eb)" }}
            >
              🔄 Ulangi Exam
            </button>
            <button
              onClick={() => {
                setActiveExam(null);
                setResult(null);
                setExams([]);
                hasFetchedRef.current = false;
                setLoading(true);
                if (studentId) {
                  fetch(`/api/students/exams?studentId=${encodeURIComponent(studentId)}`)
                    .then((r) => r.json())
                    .then((d) => {
                      setExams(d.exams || []);
                      setLoading(false);
                    })
                    .catch(() => setLoading(false));
                }
              }}
              className="px-5 py-2.5 rounded-xl font-semibold"
              style={{ backgroundColor: "var(--st-bg-card)", border: "1px solid var(--st-border, #e5e7eb)" }}
            >
              Kembali
            </button>
          </div>
        </div>

        {reviewMode && (
          <div className="mt-6 space-y-4">
            {activeExam.questions.map((q, idx) => {
              const detail = displayResult.details?.find((d) => d.questionIndex === idx);
              // Fresh submit: answers[idx] holds the user's choice (number index).
              // Previous attempt: detail.userAnswer is the letter the student picked.
              const userAns =
                answers[idx] ??
                (detail?.userAnswer
                  ? LETTERS.indexOf(detail.userAnswer.toUpperCase())
                  : null);
              const isCorrect = detail?.correct ?? false;
              return (
                <div
                  key={q.id}
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: "var(--st-bg-card)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: isCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                        color: isCorrect ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {isCorrect ? "✅ Benar" : "❌ Salah"}
                    </span>
                    <span className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                      {q.difficulty} · {q.topic}
                    </span>
                  </div>
                  <p className="font-semibold mb-3">{q.question}</p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => {
                      const isUser = userAns === oi;
                      const isKey = detail?.correctIndex === oi;
                      return (
                        <div
                          key={oi}
                          className="rounded-xl px-3 py-2 text-sm"
                          style={{
                            backgroundColor: isKey
                              ? "rgba(34,197,94,0.12)"
                              : isUser
                                ? "rgba(239,68,68,0.12)"
                                : "var(--st-bg)",
                            border: `1px solid ${
                              isKey
                                ? "#22c55e"
                                : isUser
                                  ? "#ef4444"
                                  : "transparent"
                            }`,
                          }}
                        >
                          <span className="font-bold mr-2">{LETTERS[oi]}.</span>
                          {opt}
                          {isKey && <span className="ml-2 text-green-600 font-semibold">✓ kunci</span>}
                          {isUser && !isKey && <span className="ml-2 text-red-500 font-semibold">✗ jawabanmu</span>}
                        </div>
                      );
                    })}
                  </div>
                  {detail?.explanation && (
                    <div
                      className="mt-3 text-sm rounded-xl p-3"
                      style={{ backgroundColor: "var(--st-bg)" }}
                    >
                      <span className="font-semibold">💡 Pembahasan:</span> {detail.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ── Render: confirm start modal ── */
  if (confirmStart && activeExam) {
    const total = activeExam.questions.length;
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div
          className="rounded-2xl p-6 text-center"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <div className="text-5xl mb-3">🧠</div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            {emojiFor(activeExam.subject)} {activeExam.subject}
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--st-text-dim)" }}>
            {activeExam.title}
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl p-4" style={{ backgroundColor: "var(--st-bg)" }}>
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                Soal
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: "var(--st-bg)" }}>
              <div className="text-2xl font-bold">PG</div>
              <div className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                Format
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: "var(--st-bg)" }}>
              <div className="text-2xl font-bold">1x</div>
              <div className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                Kesempatan
              </div>
            </div>
          </div>

          <div
            className="rounded-xl p-3 mb-6 text-sm"
            style={{ backgroundColor: "var(--st-bg)" }}
          >
            ⏱️ Jawaban dikunci saat exam dimulai. Kamu tidak bisa keluar atau
            membuka chat lain sampai selesai.
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setConfirmStart(false);
                setActiveExam(null);
              }}
              className="px-5 py-2.5 rounded-xl font-semibold"
              style={{
                backgroundColor: "var(--st-bg)",
                border: "1px solid var(--st-border, #e5e7eb)",
              }}
            >
              Batal
            </button>
            <button
              onClick={() => setConfirmStart(false)}
              className="px-6 py-2.5 rounded-xl font-semibold text-white"
              style={{ backgroundColor: "var(--st-primary)" }}
            >
              Mulai Sekarang →
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Render: active exam taking ── */
  if (activeExam) {
    const q = activeExam.questions[currentIdx];
    if (!q) return null;
    const total = activeExam.questions.length;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold">
              {emojiFor(activeExam.subject)} {activeExam.subject}
            </span>
            <span style={{ color: "var(--st-text-dim)" }}>
              Soal {currentIdx + 1} / {total}
            </span>
          </div>
          <div className="h-2 rounded-full" style={{ backgroundColor: "var(--st-bg-card)" }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${((currentIdx + 1) / total) * 100}%`,
                backgroundColor: "var(--st-primary)",
              }}
            />
          </div>
          {/* Question dots */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {activeExam.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className="w-6 h-6 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor:
                    answers[i] !== null
                      ? "var(--st-primary)"
                      : i === currentIdx
                        ? "rgba(99,102,241,0.2)"
                        : "var(--st-bg-card)",
                  color: answers[i] !== null ? "#fff" : "var(--st-text-dim)",
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Question card */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor:
                  q.difficulty === "EASY"
                    ? "rgba(34,197,94,0.15)"
                    : q.difficulty === "MEDIUM"
                      ? "rgba(245,158,11,0.15)"
                      : "rgba(239,68,68,0.15)",
                color:
                  q.difficulty === "EASY"
                    ? "#16a34a"
                    : q.difficulty === "MEDIUM"
                      ? "#d97706"
                      : "#dc2626",
              }}
            >
              {q.difficulty}
            </span>
            {q.topic && (
              <span className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                {q.topic}
              </span>
            )}
          </div>

          <p className="font-semibold text-lg mb-5 whitespace-pre-wrap">{q.question}</p>

          <div className="space-y-2.5">
            {q.options.map((opt, oi) => {
              const selected = answers[currentIdx] === oi;
              return (
                <button
                  key={oi}
                  onClick={() => {
                    const next = [...answers];
                    next[currentIdx] = oi;
                    setAnswers(next);
                  }}
                  className="w-full text-left rounded-xl px-4 py-3 flex items-start gap-3 transition-colors"
                  style={{
                    backgroundColor: selected ? "rgba(99,102,241,0.15)" : "var(--st-bg)",
                    border: `1.5px solid ${selected ? "var(--st-primary)" : "transparent"}`,
                  }}
                >
                  <span
                    className="font-bold w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0"
                    style={{
                      backgroundColor: selected ? "var(--st-primary)" : "var(--st-bg-card)",
                      color: selected ? "#fff" : "var(--st-text-dim)",
                    }}
                  >
                    {LETTERS[oi]}
                  </span>
                  <span className="text-sm pt-0.5">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nav buttons */}
        <div className="flex justify-between mt-5">
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="px-5 py-2.5 rounded-xl font-semibold disabled:opacity-40"
            style={{ backgroundColor: "var(--st-bg-card)" }}
          >
            ← Sebelumnya
          </button>

          {currentIdx === total - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--st-primary)" }}
            >
              {submitting ? "Mengirim..." : `Selesai (${answeredCount}/${total})`}
            </button>
          ) : (
            <button
              onClick={() => setCurrentIdx((i) => Math.min(total - 1, i + 1))}
              className="px-5 py-2.5 rounded-xl font-semibold text-white"
              style={{ backgroundColor: "var(--st-primary)" }}
            >
              Berikutnya →
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── Render: exam list ── */
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📋</span>
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            Weekly Exam
          </h1>
          <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>
            Ujian mingguan untuk mengukur pemahamanmu
          </p>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-5 animate-pulse"
              style={{ backgroundColor: "var(--st-bg-card)" }}
            >
              <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700 mb-3" />
              <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      )}

      {error && !activeExam && (
        <div
          className="rounded-2xl p-4 mb-4 text-sm"
          style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#dc2626" }}
        >
          {error}
        </div>
      )}

      {!loading && !error && exams.length === 0 && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <div className="text-4xl mb-3">🗓️</div>
          <p className="font-semibold mb-1">Belum ada weekly exam</p>
          <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>
            Exam akan muncul di sini saat sudah dijadwalkan.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {exams.map((exam) => {
          const attempt = exam.attempt;
          const done = !!attempt && attempt.status !== "IN_PROGRESS";
          const pct = done && attempt.maxScore > 0
            ? Math.round((attempt.score / attempt.maxScore) * 100)
            : 0;
          return (
            <div
              key={exam.id}
              className="rounded-2xl p-5"
              style={{ backgroundColor: "var(--st-bg-card)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: "var(--st-bg)" }}
                  >
                    {emojiFor(exam.subject)}
                  </div>
                  <div>
                    <p className="font-semibold">{exam.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--st-text-dim)" }}>
                      {exam.questionCount} soal · {exam.subject}
                    </p>
                    {done && attempt && (
                      <p className="text-xs mt-1 font-semibold">
                        ✅ Sudah dikerjakan ·{" "}
                        <span className={pct >= 70 ? "text-green-600" : "text-orange-500"}>
                          {pct}%
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => loadExam(exam.id)}
                  className="px-4 py-2 rounded-xl font-semibold text-white text-sm shrink-0"
                  style={{ backgroundColor: "var(--st-primary)" }}
                >
                  {done ? "Lihat" : "Kerjakan"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <Link
          href="/student"
          className="text-sm font-medium"
          style={{ color: "var(--st-primary)" }}
        >
          ← Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
