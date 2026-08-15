"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import WeakTopicsSection from "@/components/WeakTopicsSection";

/* ── Types ── */
interface Question {
  question: string;
  options: string[];
  difficulty?: string;
}

/** Per-question grading result returned by POST /api/students/quizzes/[id]/grade */
interface GradeDetail {
  questionIndex: number;
  correct: boolean;
  correctIndex: number;
  explanation: string;
}

/** Final (committed) grade payload from the server */
interface GradeResult {
  score: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  masteryAfter?: number | null;
  details: GradeDetail[];
}

interface QuizData {
  id: string;
  materialId?: string;
  type: string;
  maxScore: number;
  questions: Question[];
  material?: { subject: string; topic: string; subTopic?: string; id?: string };
  timeLimit?: number;
}

interface QuizListItem {
  id: string;
  type: string;
  materialId?: string;
  material: { subject: string; topic: string };
  questions: number;
}

/** Activity state for a material — from GET /api/students/activity */
interface MaterialActivity {
  attempts: number;
  bestScore: number;
  bestMax: number;
  lastScore: number;
  lastMax: number;
}

const EMOJI_PER_SUBJECT: Record<string, string> = {
  Matematika: "🔢",
  "Matematika Penalaran": "🧩",
  "Matematika Tingkat Lanjut": "📐",
  Bahasa: "📖",
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
  Agama: "🕌",
  PKN: "🤝",
  "Pendidikan Pancasila": "🤝",
  Informatika: "💻",
  PJOK: "⚽",
  Seni: "🎨",
  Sejarah: "📜",
  Antropologi: "🏺",
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

/** Per-question grading detail returned by the server */
interface QuestionDetail {
  questionIndex: number;
  correct: boolean;
  correctIndex: number;
  explanation?: string;
}

/* ── Result screen ── */
function QuizResult({
  score,
  maxScore,
  answers,
  questions,
  details,
  onRetry,
  onBack,
  quizType,
  materialId,
  subject,
}: {
  score: number;
  maxScore: number;
  answers: number[];
  questions: Question[];
  details: QuestionDetail[];
  onRetry: () => void;
  onBack: () => void;
  quizType: string;
  materialId?: string;
  subject?: string;
}) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📚";
  const msg = pct >= 80 ? "Luar biasa!" : pct >= 50 ? "Terus semangat!" : "Ayo belajar lagi!";
  const correctCount = details.filter((d) => d.correct).length;
  const totalQuestions = questions.length;
  const badges = details.map((d) => d.correct ? "✅" : "❌");

  // Confetti emojis for high scores
  const confetti = ["🎉", "⭐", "🌟", "✨", "🎊", "💯"];

  return (
    <div className="space-y-4">
      {/* Score summary */}
      <div className="text-center py-6">
        <div className="text-6xl mb-2">{emoji}</div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-st-display)" }}>
          {msg}
        </h2>
        <p className="text-lg mt-1">
          Skor: <strong>{score}</strong> / {maxScore} ({pct}%)
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--st-text-dim)" }}>
          ✅ {correctCount}/{totalQuestions} soal benar · ❌ {totalQuestions - correctCount} salah
        </p>
      </div>

      {/* Adaptive routing cards */}
      {pct < 40 && materialId ? (
        <a
          href={`/student/slides/${materialId}`}
          className="block w-full py-4 px-5 rounded-2xl text-center transition-all hover:scale-[1.01] active:scale-95"
          style={{ backgroundColor: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)" }}
        >
          <p className="text-2xl mb-1">📖</p>
          <p className="font-semibold text-sm" style={{ color: "var(--st-primary)" }}>
            Ayo baca slide dulu
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--st-text-dim)" }}>
            Pelajari materinya sebelum coba quiz lagi
          </p>
        </a>
      ) : pct >= 40 && pct <= 70 && subject ? (
        <a
          href={`/student/quiz?subject=${encodeURIComponent(subject)}`}
          className="block w-full py-4 px-5 rounded-2xl text-center transition-all hover:scale-[1.01] active:scale-95"
          style={{ backgroundColor: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.3)" }}
        >
          <p className="text-2xl mb-1">🔄</p>
          <p className="font-semibold text-sm" style={{ color: "#eab308" }}>
            Coba quiz lain dengan topik serupa
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--st-text-dim)" }}>
            Latihan lebih banyak biar makin paham
          </p>
        </a>
      ) : pct > 80 ? (
        <div className="text-center py-3">
          <p className="text-2xl mb-1">
            {confetti.map((c, i) => <span key={i}>{c} </span>)}
          </p>
          <p className="font-semibold text-sm" style={{ color: "var(--st-success)" }}>
            🎉 Mantap! Terus pertahankan!
          </p>
        </div>
      ) : null}

      {/* Quick summary badges row */}
      <div className="flex flex-wrap gap-1 justify-center">
        {badges.map((b, i) => (
          <span key={i} className="text-sm" title={`Soal ${i + 1}`}>{b}</span>
        ))}
      </div>

      {/* Per-question review */}
      <div className="space-y-3">
        {questions.map((q, i) => {
          const detail = details[i];
          const isCorrect = detail?.correct ?? false;
          const correctIdx = detail?.correctIndex ?? 0;
          return (
          <div
            key={i}
            className="rounded-xl p-4 text-sm"
            style={{
              backgroundColor:
                isCorrect
                  ? "rgba(34,197,94,0.08)"
                  : "rgba(239,68,68,0.08)",
            }}
          >
            <p className="font-medium mb-1">{q.question}</p>
            <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
              {isCorrect ? "✅" : "❌"}{" "}
              Jawabanmu: <strong>{q.options[answers[i]]}</strong>
              {!isCorrect && (
                <> · Benar: <strong style={{ color: "var(--st-success)" }}>{q.options[correctIdx]}</strong></>
              )}
              {isCorrect && (
                <> · <strong style={{ color: "var(--st-success)" }}>Benar! 🎯</strong></>
              )}
            </p>
            {detail?.explanation ? (
              <p className="text-xs mt-1" style={{ color: "var(--st-text-dim)" }}>
                💡 {detail.explanation}
              </p>
            ) : !isCorrect ? (
              <p className="text-xs mt-1" style={{ color: "var(--st-text-dim)" }}>
                💡 Jawaban benar: <strong>{q.options[correctIdx]}</strong>
              </p>
            ) : null}
          </div>
          );
        })}
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
  timeLimit,
  quizId,
}: {
  questions: Question[];
  title: string;
  onSubmit: (answers: number[]) => void;
  onBack: () => void;
  timeLimit?: number; // minutes, null = no limit
  quizId?: string;
}) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [timeLeft, setTimeLeft] = useState<number | null>(
    timeLimit ? timeLimit * 60 : null,
  );
  const [questionFeedback, setQuestionFeedback] = useState<Record<number, { correct: boolean; correctIndex: number; explanation: string }>>({});
  const [gradingIndex, setGradingIndex] = useState<number | null>(null);

  // Countdown timer — ticks down every second, stops at 0
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => (prev === null ? null : Math.max(0, prev - 1)));
    }, 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  // Auto-submit whatever answers exist once the timer hits 0
  const didAutoSubmit = useRef(false);
  useEffect(() => {
    if (timeLeft !== 0 || didAutoSubmit.current) return;
    didAutoSubmit.current = true;
    onSubmit(answers);
  }, [timeLeft, answers, onSubmit]);

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const timerColor =
    timeLeft !== null && timeLeft < 30
      ? "#ef4444" // red
      : timeLeft !== null && timeLeft < 120
        ? "#eab308" // yellow
        : "var(--st-primary)";

  const q = questions[current];
  const isLast = current === questions.length - 1;
  const allAnswered = answers.every((a) => a >= 0);

  function selectAnswer(idx: number) {
    const next = [...answers];
    next[current] = idx;
    setAnswers(next);

    // Immediately grade this question on the server
    if (!quizId) return;
    setGradingIndex(current);
    fetch(`/api/students/quizzes/${quizId}/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: [{ questionIndex: current, selectedIndex: idx }],
        commit: false,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.details && data.details[0]) {
          setQuestionFeedback((prev) => ({
            ...prev,
            [current]: data.details[0],
          }));
        }
      })
      .catch(() => {
        // No client-side fallback: the answer key is server-only by design.
        setQuestionFeedback((prev) => ({
          ...prev,
          [current]: {
            correct: false,
            correctIndex: -1,
            explanation: "",
          },
        }));
      })
      .finally(() => setGradingIndex(null));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm" style={{ color: "var(--st-text-dim)" }}>
          ← Keluar
        </button>
        <span className="text-xs font-medium" style={{ color: "var(--st-text-dim)" }}>
          {answers.filter(a => a >= 0).length}/{questions.length} terjawab
        </span>
      </div>

      <h2 className="text-lg font-bold truncate" style={{ fontFamily: "var(--font-st-display)" }}>
        {title}
      </h2>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--st-bg-card)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%`, backgroundColor: "var(--st-primary)" }} />
      </div>

      {/* Countdown timer */}
      {timeLeft !== null && (
        <div
          className="text-center py-2 px-4 rounded-xl text-sm font-bold transition-colors"
          style={{
            backgroundColor:
              timeLeft < 30
                ? "rgba(239,68,68,0.15)"
                : timeLeft < 120
                  ? "rgba(234,179,8,0.15)"
                  : "rgba(99,102,241,0.1)",
            color: timerColor,
          }}
        >
          ⏱ {formatTime(timeLeft)}
        </div>
      )}

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

        {/* Feedback after selecting an answer */}
        {questionFeedback[current] && (
          <div
            className={`mt-4 p-4 rounded-xl text-sm ${
              questionFeedback[current].correct ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"
            }`}
          >
            <p className="font-bold mb-1">
              {questionFeedback[current].correct ? "✅ Benar!" : "❌ Kurang tepat"}
            </p>
            <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
              {questionFeedback[current].correct
                ? "Jawabanmu tepat!"
                : `Jawaban benar: ${q.options[questionFeedback[current].correctIndex]}`}
            </p>
            {questionFeedback[current].explanation && (
              <p className="text-xs mt-2" style={{ color: "var(--st-text-dim)" }}>
                💡 {questionFeedback[current].explanation}
              </p>
            )}
          </div>
        )}

        {gradingIndex === current && (
          <div className="mt-4 text-center text-xs" style={{ color: "var(--st-text-dim)" }}>
            ⏳ Menilai...
          </div>
        )}

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
  activityByMaterial,
}: {
  quizzes: QuizListItem[];
  onPick: (id: string) => void;
  onBack: () => void;
  activityByMaterial: Record<string, MaterialActivity>;
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
        quizzes.map((q) => {
            const act = q.materialId ? activityByMaterial[q.materialId] : null;
            const isDone = !!act && act.attempts > 0;
            const pct = act && act.bestMax > 0 ? Math.round((act.bestScore / act.bestMax) * 100) : null;
            return (
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
                      {isDone && act && (
                        <span className="ml-2">
                          {" "}✅ Sudah kerjain {act.attempts}x · Skor terbaik {pct}%
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-lg">→</span>
                </div>
              </button>
            );
          })
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
  const [gradeResult, setGradeResult] = useState<{ score: number; maxScore: number; details: QuestionDetail[] } | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showBackModal, setShowBackModal] = useState(false);
  const [activityByMaterial, setActivityByMaterial] = useState<Record<string, MaterialActivity>>({});

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

  // Fetch activity state (quiz history per material) for indicator badges
  useEffect(() => {
    if (!studentId) return;
    fetch(`/api/students/activity?studentId=${encodeURIComponent(studentId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.byMaterial) setActivityByMaterial(data.byMaterial);
      })
      .catch(() => {});
  }, [studentId]);

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
            materialId: data.quiz.materialId,
            type: data.quiz.type,
            maxScore: data.quiz.maxScore,
            questions: data.quiz.questions || [],
            material: data.quiz.material,
            timeLimit: data.quiz.timeLimit ?? undefined,
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
    const matId = quiz.material?.id || quiz.materialId;
    setTimeout(() => {
      if (isExam) {
        tracker.trackExamStart(matId || quizId, topic);
      } else {
        tracker.trackQuizStart(matId || quizId, topic);
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
    async (ans: number[]) => {
      if (!quiz || !studentId) return;

      const isExam = quiz.type === "EXAM" || examMode;
      const topic = quiz.material?.topic;
      const matId = quiz.material?.id || quiz.materialId;

      // Grade on server — persist the attempt. Server is the only source of truth:
      // the quiz detail API no longer ships correctIndex/explanation to the client.
      let gradeData: any = null;
      try {
        const res = await fetch(`/api/students/quizzes/${quiz.id}/grade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: ans
              .map((selectedIndex, questionIndex) => ({ questionIndex, selectedIndex }))
              .filter((a) => a.selectedIndex >= 0),
            commit: true,
          }),
        });
        if (!res.ok) throw new Error(`grade failed: ${res.status}`);
        gradeData = await res.json();
      } catch (e) {
        // No client-side fallback: the answer key is server-only by design.
        setError("Gagal menilai quiz. Cek koneksi lalu coba submit lagi.");
        return;
      }

      const serverScore = gradeData?.score ?? 0;
      const serverMaxScore = gradeData?.maxScore ?? quiz.questions.length * 10;
      const serverDetails: QuestionDetail[] = Array.isArray(gradeData?.details)
        ? gradeData.details
        : [];

      // Track completion BEFORE setting phase to result
      const trackPromise = isExam
        ? tracker.trackExamComplete(matId || quizId, topic, serverScore, serverMaxScore, quiz?.id)
        : tracker.trackQuizComplete(matId || quizId, topic, serverScore, serverMaxScore, quiz?.id);

      setAnswers(ans);
      setGradeResult({ score: serverScore, maxScore: serverMaxScore, details: serverDetails });
      setPhase("result");
    },
    [quiz, studentId, examMode, quizId, tracker]
  );

  // ── Handle exit (Keluar) — always show confirmation ──
  const handleExit = useCallback(() => {
    setShowExitModal(true);
  }, []);

  // ── Confirm exit ──
  const confirmExit = useCallback(() => {
    setShowExitModal(false);
    setShowBackModal(false);
    window.location.href = "/student/quiz";
  }, []);

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
        activityByMaterial={activityByMaterial}
      />
    );
  }

  // Phase: result
  if (phase === "result" && quiz) {
    return (
      <QuizResult
        score={gradeResult?.score ?? 0}
        maxScore={gradeResult?.maxScore ?? quiz.questions.length * 10}
        answers={answers}
        questions={quiz.questions}
        details={gradeResult?.details ?? []}
        onRetry={() => setPhase("quiz")}
        onBack={() => window.location.href = "/student/quiz"}
        quizType={quiz.type}
        materialId={quiz.material?.id || quiz.materialId}
        subject={quiz.material?.subject}
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
          timeLimit={quiz.timeLimit}
          quizId={quiz.id}
        />
      </>
    );
  }

  // Fallback — show subject picker
  return (
    <div className="space-y-4">
      <WeakTopicsSection />
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
