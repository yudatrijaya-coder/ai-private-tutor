"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface ReviewItem {
  id: string;
  quizId: string;
  question: string;
  options: string[];
  correctIndex: number | null;
  correctAnswer: string | null;
  explanation: string | null;
  subject: string;
  topic: string;
  lapses: number;
  repetitions: number;
  intervalDays: number;
  dueAt: string;
}

interface ReviewResponse {
  dueCount: number;
  upcomingCount: number;
  masteredCount: number;
  items: ReviewItem[];
}

export default function ReviewPage() {
  const [data, setData] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ quality: number; intervalDays: number; mastered: boolean } | null>(null);
  const [done, setDone] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch("/api/students/review");
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      setData(d);
    } catch {
      setError("Gagal memuat review");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin">🔄</div></div>;
  if (error) return <div className="text-center py-20"><p>{error}</p></div>;
  if (!data) return null;

  if (done) {
    return (
      <div className="space-y-4 pb-8 text-center">
        <div className="text-5xl mb-2">🎉</div>
        <h1 className="text-xl font-bold">Review Selesai!</h1>
        <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>
          {data.masteredCount + data.upcomingCount} item lagi menunggu.
        </p>
        <div className="flex gap-3 justify-center mt-4">
          <button onClick={() => { setDone(false); setCurrentIdx(0); fetchData(); }}
            className="px-6 py-2 rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: "var(--st-primary)" }}>
            🔄 Lanjut Review
          </button>
          <Link href="/student" className="px-6 py-2 rounded-full text-sm font-bold"
            style={{ backgroundColor: "var(--st-bg-card)", color: "var(--st-text)" }}>
            ← Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (data.dueCount === 0) {
    return (
      <div className="space-y-4 pb-8 text-center">
        <div className="text-5xl mb-2">✅</div>
        <h1 className="text-xl font-bold">Tidak ada review hari ini</h1>
        <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>
          Kamu sudah menguasai {data.masteredCount} soal. Istirahat dulu! 🎉
        </p>
        <Link href="/student" className="inline-block mt-4 px-6 py-2 rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: "var(--st-primary)" }}>
          ← Dashboard
        </Link>
      </div>
    );
  }

  const item = data.items[currentIdx];
  if (!item) {
    setDone(true);
    return null;
  }

  const handleSubmit = async (correct: boolean, selectedIndex?: number) => {
    setSubmitting(true);
    setAnswered(correct);
    setPicked(selectedIndex ?? null);

    try {
      const r = await fetch("/api/students/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: item.id, correct }),
      });
      const d = await r.json();
      setResult(d);
    } catch {
      setResult({ quality: 0, intervalDays: 1, mastered: false });
    }
    setSubmitting(false);
  };

  const next = () => {
    if (currentIdx + 1 >= data.items.length) {
      setDone(true);
    } else {
      setCurrentIdx(currentIdx + 1);
      setAnswered(null);
      setPicked(null);
      setResult(null);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="text-center py-4">
        <div className="text-4xl mb-1">🔄</div>
        <h1 className="text-lg font-bold" style={{ fontFamily: "var(--font-st-display)" }}>
          Spaced Review
        </h1>
        <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
          {currentIdx + 1} dari {data.dueCount} · {item.subject} · {item.topic}
        </p>
      </div>

      {/* Question Card */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--st-bg-card)" }}>
        <p className="font-medium mb-4">{item.question}</p>

        {item.options.length > 0 ? (
          <div className="space-y-2">
            {item.options.map((opt, i) => {
              const isCorrect = item.correctIndex === i;
              let bg = "var(--st-bg)";
              let border = "transparent";
              if (answered !== null) {
                if (isCorrect) { bg = "#bbf7d0"; border = "#22c55e"; }
                else if (picked === i && !isCorrect) { bg = "#fecaca"; border = "#ef4444"; }
              }
              return (
                <button key={i} disabled={answered !== null}
                  onClick={() => handleSubmit(i === item.correctIndex, i)}
                  className="w-full text-left p-3 rounded-xl text-sm transition-all"
                  style={{ backgroundColor: bg, border: `2px solid ${border}` }}>
                  {String.fromCharCode(65 + i)}. {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => handleSubmit(true)} disabled={answered !== null}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: "#22c55e" }}>
              ✅ Benar
            </button>
            <button onClick={() => handleSubmit(false)} disabled={answered !== null}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: "#ef4444" }}>
              ❌ Salah
            </button>
          </div>
        )}
      </div>

      {/* Feedback Card */}
      {answered !== null && (
        <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: "var(--st-bg-card)" }}>
          {answered ? (
            <p className="text-sm font-bold text-green-600">✅ Jawaban benar!</p>
          ) : (
            <div>
              <p className="text-sm font-bold text-red-500">❌ Jawaban salah</p>
              {item.correctAnswer && (
                <p className="text-xs mt-1" style={{ color: "var(--st-text-dim)" }}>
                  Jawaban benar: <strong>{item.correctAnswer}</strong>
                </p>
              )}
            </div>
          )}
          {item.explanation && (
            <p className="text-sm p-3 rounded-xl" style={{ backgroundColor: "var(--st-bg)" }}>
              💡 {item.explanation}
            </p>
          )}
          {result && (
            <div className="flex gap-4 text-xs" style={{ color: "var(--st-text-dim)" }}>
              <span>📅 Next: {result.intervalDays}h</span>
              <span>🎯 Quality: {result.quality}/5</span>
              {result.mastered && <span className="text-green-600 font-bold">🎉 Mastered!</span>}
            </div>
          )}
          <button onClick={next} disabled={submitting}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: "var(--st-primary)" }}>
            {currentIdx + 1 >= data.items.length ? "Selesai 🎉" : "Selanjutnya →"}
          </button>
        </div>
      )}

      <div className="text-center pt-2">
        <Link href="/student" className="inline-block text-xs underline" style={{ color: "var(--st-text-dim)" }}>
          ← Kembali
        </Link>
      </div>
    </div>
  );
}