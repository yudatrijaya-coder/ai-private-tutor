"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useActivityTracker } from "@/hooks/useActivityTracker";

/* ── Types ── */
interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface QuizData {
  id: string;
  type: string;
  maxScore: number;
  questions: Question[];
  material?: { subject: string; topic: string; subTopic?: string };
  timeLimit?: number;
}

interface QuizListItem {
  id: string;
  type: string;
  material: { subject: string; topic: string };
  questions: number;
}

const EMOJI_PER_SUBJECT: Record<string, string> = {
  Matematika: "🔢",
  Bahasa: "📖",
  "Bahasa Indonesia": "📖",
  IPA: "🔬",
  IPAS: "🔬",
  IPS: "🌍",
  Agama: "🕌",
  PKN: "🤝",
  "Pendidikan Pancasila": "🤝",
  PJOK: "⚽",
  Informatika: "💻",
  "Bahasa Inggris": "🌏",
};

/* ── Confirmation Modal ── */
function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl"
        style={{ backgroundColor: "var(--st-bg-card, #1e1e2e)" }}
      >
        <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "var(--font-st-display)" }}>
          {title || "Konfirmasi"}
        </h3>
        <p className="text-sm mb-6" style={{ color: "var(--st-text-dim, #a0a0b0)" }}>
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{
              backgroundColor: "var(--st-bg, #2a2a3e)",
              color: "var(--st-text, #e0e0f0)",
              border: "1px solid var(--st-border, #3a3a50)",
            }}
          >
            {cancelLabel || "Batal"}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ backgroundColor: "var(--st-danger, #ef4444)", color: "#fff" }}
          >
            {confirmLabel || "Ya, Keluar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Result screen ── */
function QuizResult({
  score,
  maxScore,
  answers,
  questions,
  onRetry,
  onBack,
}: {
  score: number;
  maxScore: number;
  answers: number[];
  questions: Question[];
  onRetry: () => void;
  onBack: () => void;
}) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📚";
  const msg = pct >= 80 ? "Luar biasa!" : pct >= 50 ? "Terus semangat!" : "Ayo belajar lagi!";

  return (
    <div className="space-y-4">
      <div className="text-center py-6">
        <div className="text-6xl mb-2">{emoji}</div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-st-display)" }}>
          {msg}
        </h2>
        <p className="text-lg mt-1">
          Skor: <strong>{score}</strong> / {maxScore} ({pct}%)
        </p>
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <div
            key={i}
            className="rounded-xl p-4 text-sm"
            style={{
              backgroundColor:
                answers[i] === q.correctIndex
                  ? "rgba(34,197,94,0.08)"
                  : "rgba(239,68,68,0.08)",
            }}
          >
            <p className="font-medium mb-1">{q.question}</p>
            <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
              Jawabanmu: <strong>{q.options[answers[i]]}</strong>
              {answers[i] !== q.correctIndex && (
                <> · Benar: <strong style={{ color: "var(--st-success)" }}>{q.options[q.correctIndex]}</strong></>
              )}
            </p>
            {q.explanation && (
              <p className="text-xs mt-1" style={{ color: "var(--st-text-dim)" }}>
                💡 {q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onRetry} className="flex-1 py-3 rounded-xl font-bold text-sm"
          style={{ backgroundColor: "var(--st-primary)", color: "#fff" }}>
          🔄 Coba Lagi
        </button>
        <button onClick={onBack} className="flex-1 py-3 rounded-xl font-bold text-sm"
          style={{ backgroundColor: "var(--st-bg-card)", color: "var(--st-text)" }}>
          ← Kembali
        </button>
      </div>
    </div>
  );
}

/* ── Quiz screen ── */
function QuizScreen({
  questions,
  title,
  onSubmit,
  onBack,
}: {
  questions: Question[];
  title: string;
  onSubmit: (answers: number[]) => void;
  onBack: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));

  const q = questions[current];
  const isLast = current === questions.length - 1;
  const answered = answers.filter((a) => a >= 0).length;
  const allAnswered = answers.every((a) => a >= 0);

  function selectAnswer(idx: number) {
    const next = [...answers];
    next[current] = idx;
    setAnswers(next);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm" style={{ color: "var(--st-text-dim)" }}>
          ← Keluar
        </button>
        <span className="text-xs font-medium" style={{ color: "var(--st-text-dim)" }}>
          {answered}/{questions.length} terjawab
        </span>
      </div>

      <h2 className="text-lg font-bold truncate" style={{ fontFamily: "var(--font-st-display)" }}>
        {title}
      </h2>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--st-bg-card)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%`, backgroundColor: "var(--st-primary)" }} />
      </div>

      {/* Question */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--st-bg-card)" }}>
        <p className="text-xs font-medium mb-3" style={{ color: "var(--st-text-dim)" }}>
          Soal {current + 1} dari {questions.length}
        </p>
        <p className="text-base font-medium mb-4">{q.question}</p>
        <div className="space-y-2">
          {q.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => selectAnswer(idx)}
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: answers[current] === idx ? "var(--st-primary)" : "var(--st-bg)",
                color: answers[current] === idx ? "#fff" : "var(--st-text)",
                border: answers[current] === idx ? "none" : "1px solid var(--st-border, #e5e7eb)",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={() => setCurrent((p) => Math.max(0, p - 1))}
          disabled={current === 0}
          className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-30"
          style={{ backgroundColor: "var(--st-bg-card)", color: "var(--st-text)" }}
        >
          ◀ Sebelumnya
        </button>
        {isLast ? (
          <button
            onClick={() => onSubmit(answers)}
            disabled={!allAnswered}
            className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-40"
            style={{ backgroundColor: "var(--st-success, #22c55e)", color: "#fff" }}
          >
            ✅ Selesai
          </button>
        ) : (
          <button
            onClick={() => setCurrent((p) => Math.min(questions.length - 1, p + 1))}
            className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: "var(--st-primary)", color: "#fff" }}
          >
            Selanjutnya ▶
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Quiz picker (list quizzes for subject) ── */
function QuizPicker({
  quizzes,
  onPick,
  onBack,
}: {
  quizzes: QuizListItem[];
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-sm" style={{ color: "var(--st-text-dim)" }}>
        ← Kembali
      </button>
      <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-st-display)" }}>
        📝 Pilih Quiz
      </h2>
      {quizzes.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>
          Belum ada quiz untuk mata pelajaran ini.
        </p>
      ) : (
        quizzes.map((q) => (
          <button
            key={q.id}
            onClick={() => onPick(q.id)}
            className="w-full text-left rounded-xl p-4 transition-all hover:scale-[1.01] active:scale-95"
            style={{ backgroundColor: "var(--st-bg-card)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{q.material.topic}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--st-text-dim)" }}>
                  {q.type === "EXAM" ? "📋 Exam" : "📝 Quiz"} · {q.questions} soal
                </p>
              </div>
              <span className="text-lg">→</span>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

/* ── Main quiz component ── */
function QuizInner() {
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject");
  const quizId = searchParams.get("quizId");
  const examMode = searchParams.get("exam") === "true";

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [quizList, setQuizList] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"list" | "quiz" | "result">("quiz");
  const [answers, setAnswers] = useState<number[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showBackModal, setShowBackModal] = useState(false);

  // Ref to store pending exit action
  const pendingExitAction = useRef<(() => void) | null>(null);

  // Determine if quiz is active (has answers selected)
  const isQuizActive = phase === "quiz" && answers.some((a) => a >= 0);

  // Activity tracker
  const tracker = useActivityTracker(studentId, quiz?.material?.subject || subject || "");

  // Ambil studentId dari session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.student?.studentId) setStudentId(data.student.studentId);
        else setError("Sesi tidak valid. Login ulang.");
        // Also fetch subjects
        if (data.student?.studentId) {
          fetch(`/api/students/subjects?studentId=${encodeURIComponent(data.student.studentId)}`)
            .then(r => r.json())
            .then(sd => { if (sd.subjects) setSubjects(sd.subjects); })
            .catch(() => {});
        }
      })
      .catch(() => setError("Gagal verifikasi sesi"));
  }, []);

  // Fetch quiz list for subject — or show subject picker when none selected
  useEffect(() => {
    if (!studentId) return;
    if (!subject) {
      setQuizList([]);
      setLoading(false);
      return;
    }
    if (quizId) return;
    setLoading(true);
    fetch(`/api/students/quizzes?studentId=${encodeURIComponent(studentId)}`)
      .then((r) => r.json())
      .then((data) => {
        const list = (data.quizzes || []).filter(
          (q: any) => q.material?.subject === subject || !subject
        );
        setQuizList(list);
        if (list.length === 0 && !examMode) {
          setError("Belum ada quiz untuk mata pelajaran ini.");
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); setError("Gagal memuat quiz"); });
  }, [subject, quizId, examMode, studentId]);

  // Fetch specific quiz by ID
  useEffect(() => {
    if (!quizId) return;
    setLoading(true);
    fetch(`/api/students/quizzes/${quizId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.quiz) {
          setQuiz({
            id: data.quiz.id,
            type: data.quiz.type,
            maxScore: data.quiz.maxScore,
            questions: data.quiz.questions || [],
            material: data.quiz.material,
          });
        } else {
          setError("Quiz tidak ditemukan");
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); setError("Gagal memuat quiz"); });
  }, [quizId]);

  // Generate exam via API
  useEffect(() => {
    if (!examMode || !subject || quizId || !studentId) return;
    setLoading(true);
    fetch("/api/exam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, subject, topics: [], questionCount: 10 }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.exam) {
          setQuiz({
            id: data.exam.id,
            type: "EXAM",
            maxScore: data.exam.maxScore,
            questions: data.exam.questions || [],
            material: { subject, topic: `Ujian ${subject}` },
            timeLimit: data.exam.timeLimit,
          });
        } else {
          setError(data.error || "Gagal generate exam");
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); setError("Gagal generate exam"); });
  }, [examMode, subject, quizId]);

  // ── Track quiz/exam start when quiz loads ──
  useEffect(() => {
    if (!quiz || !studentId) return;
    const isExam = quiz.type === "EXAM" || examMode;
    const topic = quiz.material?.topic;
    setTimeout(() => {
      if (isExam) {
        tracker.trackExamStart(quizId, topic);
      } else {
        tracker.trackQuizStart(quizId, topic);
      }
    }, 0);
    // Only fire once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!quiz, studentId]);

  // ── beforeunload protection ──
  useEffect(() => {
    if (!isQuizActive) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isQuizActive]);

  // ── history.pushState trap (browser back guard) ──
  useEffect(() => {
    // Push an extra state so popstate fires when user presses back
    window.history.pushState({ quizActive: true }, "");

    const handler = () => {
      if (isQuizActive) {
        setShowBackModal(true);
        // Re-push state to prevent back navigation
        window.history.pushState({ quizActive: true }, "");
      }
    };

    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [isQuizActive]);

  // ── Handle submit with activity tracking ──
  const handleSubmit = useCallback(
    (ans: number[]) => {
      if (!quiz || !studentId) return;

      const isExam = quiz.type === "EXAM" || examMode;
      const score = ans.filter((a, i) => a === quiz.questions[i]?.correctIndex).length * 10;
      const maxScore = quiz.questions.length * 10;
      const topic = quiz.material?.topic;

      // Track completion BEFORE setting phase to result
      const trackPromise = isExam
        ? tracker.trackExamComplete(quizId, topic, score, maxScore)
        : tracker.trackQuizComplete(quizId, topic, score, maxScore);

      setAnswers(ans);
      setPhase("result");
    },
    [quiz, studentId, examMode, quizId, tracker]
  );

  // ── Handle exit (Keluar) with confirmation ──
  const handleExit = useCallback(() => {
    if (isQuizActive) {
      setShowExitModal(true);
    } else {
      if (quizList.length > 0) setPhase("list");
      else window.location.reload();
    }
  }, [isQuizActive, quizList.length]);

  // ── Confirm exit ──
  const confirmExit = useCallback(() => {
    setShowExitModal(false);
    setShowBackModal(false);
    if (quizList.length > 0) setPhase("list");
    else window.location.reload();
  }, [quizList.length]);

  // ── Cancel exit ──
  const cancelExit = useCallback(() => {
    setShowExitModal(false);
    setShowBackModal(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin text-4xl">📚</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3">😅</div>
        <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-xs underline">
          Coba lagi
        </button>
      </div>
    );
  }

  // Phase: show quiz picker list (when subject selected and quizzes loaded)
  if (!quiz && quizList.length > 0 && phase !== "result") {
    return (
      <QuizPicker
        quizzes={quizList}
        onPick={(id) => {
          setLoading(true);
          window.location.href = `/student/quiz?quizId=${id}`;
        }}
        onBack={() => window.history.back()}
      />
    );
  }

  // Phase: result
  if (phase === "result" && quiz) {
    return (
      <QuizResult
        score={answers.filter((a, i) => a === quiz.questions[i]?.correctIndex).length * 10}
        maxScore={quiz.questions.length * 10}
        answers={answers}
        questions={quiz.questions}
        onRetry={() => setPhase("quiz")}
        onBack={() => window.location.reload()}
      />
    );
  }

  // Phase: quiz active
  if (quiz) {
    return (
      <>
        <ConfirmModal
          open={showExitModal || showBackModal}
          title={showBackModal ? "Kembali?" : "Keluar dari Quiz?"}
          message={
            showBackModal
              ? "Apakah kamu yakin ingin kembali? Progress quiz akan hilang."
              : "Apakah kamu yakin ingin keluar? Progress quiz akan hilang."
          }
          onConfirm={confirmExit}
          onCancel={cancelExit}
        />
        <QuizScreen
          questions={quiz.questions}
          title={`${EMOJI_PER_SUBJECT[quiz.material?.subject || ""] || "📚"} ${quiz.material?.topic || "Quiz"}`}
          onSubmit={handleSubmit}
          onBack={handleExit}
        />
      </>
    );
  }

  // Fallback — show subject picker
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-st-display)" }}>
        📝 Pilih Mata Pelajaran
      </h2>
      {subjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>
            Tidak ada quiz tersedia.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => { window.location.href = `/student/quiz?subject=${encodeURIComponent(s)}`; }}
              className="rounded-2xl p-5 text-left transition-all hover:scale-[1.02] active:scale-95 flex flex-col items-center gap-2"
              style={{ backgroundColor: "var(--st-bg-card)" }}
            >
              <span className="text-3xl">{EMOJI_PER_SUBJECT[s] || "📚"}</span>
              <span className="text-sm font-semibold text-center">{s}</span>
              <span className="text-xs" style={{ color: "var(--st-text-dim)" }}>Lihat Quiz →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Page ── */
export default function QuizPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin text-4xl">📚</div></div>}>
      <QuizInner />
    </Suspense>
  );
}
