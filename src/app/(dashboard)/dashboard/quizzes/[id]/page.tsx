"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: string;
  explanation: string;
}

interface QuizData {
  id: string;
  type: string;
  maxScore: number;
  questions: Question[];
  material: { subject: string; topic: string; subTopic: string };
  createdAt: string;
}

export default function QuizDetailPage() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students/quizzes/${id}`)
      .then(r => r.json())
      .then(d => { setQuiz(d.quiz); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center" style={{ color: "var(--su-text-dim)" }}>Loading...</div>;
  if (!quiz) return <div className="p-8 text-center" style={{ color: "var(--su-text-dim)" }}>Quiz tidak ditemukan</div>;

  const diffColors: Record<string, string> = {
    easy: "#22c55e", medium: "#eab308", hard: "#ef4444",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/quizzes" className="text-sm opacity-60 hover:opacity-100">← Kembali</Link>
        <h1 className="text-2xl font-bold mt-2" style={{ fontFamily: "var(--font-display)" }}>
          📝 {quiz.type}: {quiz.material?.topic || "Quiz"}
        </h1>
        <p className="text-sm" style={{ color: "var(--su-text-dim)" }}>
          {quiz.material?.subject} — {quiz.material?.subTopic} • {quiz.questions.length} soal • Nilai maks: {quiz.maxScore}
        </p>
      </div>

      <button
        onClick={() => setShowAnswers(!showAnswers)}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white"
        style={{ backgroundColor: showAnswers ? "#64748b" : "#7c3aed" }}
      >
        {showAnswers ? "🙈 Sembunyikan Jawaban" : "👁️ Tampilkan Kunci Jawaban"}
      </button>

      <div className="space-y-4">
        {quiz.questions.map((q, i) => (
          <div
            key={i}
            className="rounded-xl p-5"
            style={{
              backgroundColor: "var(--su-bg-card)",
              border: "1px solid var(--su-border)",
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="font-semibold text-sm">
                {i + 1}. {q.question}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded font-medium text-white ml-2 shrink-0"
                style={{ backgroundColor: diffColors[q.difficulty] || "#64748b" }}
              >
                {q.difficulty}
              </span>
            </div>

            <div className="space-y-1.5 ml-4">
              {q.options.map((opt, oi) => {
                const isCorrect = showAnswers && oi === q.correctIndex;
                return (
                  <div
                    key={oi}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-sm"
                    style={{
                      backgroundColor: isCorrect ? "rgba(34,197,94,0.15)" : "transparent",
                      border: isCorrect ? "1px solid rgba(34,197,94,0.3)" : "1px solid transparent",
                    }}
                  >
                    <span style={{ color: "var(--su-text-dim)", width: 20 }}>
                      {"ABCD"[oi]}.
                    </span>
                    <span>{opt}</span>
                    {isCorrect && <span className="ml-auto text-xs">✅</span>}
                  </div>
                );
              })}
            </div>

            {showAnswers && (
              <div
                className="mt-3 p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.2)",
                }}
              >
                <strong>✅ Jawaban: {"ABCD"[q.correctIndex]}</strong>
                <br />
                <span style={{ color: "var(--su-text-dim)" }}>{q.explanation}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
