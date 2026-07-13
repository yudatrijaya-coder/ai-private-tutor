"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Student { studentId: string; name: string; gradeLevel: string; }
interface Period { period: number; weekRange: string; weeks: number; totalMaterials: number; subjects: string[]; }
interface Timeline { totalMaterials: number; totalWeeks: number; periods: Period[]; }
interface ExamResult { examId: string; title: string; period: number; weekRange: string; subject: string; questionCount: number; difficulty: { easy: number; medium: number; hard: number }; }

export default function ExamTemplatePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState("");
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [periodWeeks, setPeriodWeeks] = useState(4);

  useEffect(() => {
    fetch("/api/students").then(r => r.json()).then(d => setStudents(d.students || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/exam/template?studentId=${selected}`)
      .then(r => r.json())
      .then(d => { setTimeline(d); setResults([]); })
      .catch(() => setTimeline(null));
  }, [selected]);

  const generateAll = async () => {
    if (!selected) return;
    setGenerating(true);
    setResults([]);
    try {
      const res = await fetch("/api/exam/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selected, periodWeeks }),
      });
      const data = await res.json();
      setResults(data.exams || []);
    } catch (e) { /* ignore */ }
    setGenerating(false);
  };

  const gradeLabels: Record<string, string> = { SD_5: "SD Kelas 5", SMP_1: "SMP Kelas 1", SMA_2: "SMA Kelas 2" };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/quizzes" className="text-sm opacity-60 hover:opacity-100">← Kembali ke Quiz</Link>
        <h1 className="text-2xl font-bold mt-2" style={{ fontFamily: "var(--font-display)" }}>
          📋 Template Ujian
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
          Auto-generate ujian per periode berdasarkan timeline mingguan
        </p>
      </div>

      {/* Student selector */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium block mb-1">Murid</label>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ backgroundColor: "var(--su-bg-card)", borderColor: "var(--su-border)", color: "var(--su-text)" }}
          >
            <option value="">— Pilih —</option>
            {students.map(s => (
              <option key={s.studentId} value={s.studentId}>{s.name} ({gradeLabels[s.gradeLevel as keyof typeof gradeLabels] || s.gradeLevel})</option>
            ))}
          </select>
        </div>
        <div style={{ width: 100 }}>
          <label className="text-sm font-medium block mb-1">Per minggu</label>
          <select
            value={periodWeeks}
            onChange={e => setPeriodWeeks(parseInt(e.target.value))}
            className="w-full px-2 py-2 rounded-lg border text-sm"
            style={{ backgroundColor: "var(--su-bg-card)", borderColor: "var(--su-border)", color: "var(--su-text)" }}
          >
            <option value={2}>2 minggu</option>
            <option value={4}>4 minggu</option>
            <option value={6}>6 minggu</option>
            <option value={8}>8 minggu</option>
          </select>
        </div>
        <button
          onClick={generateAll}
          disabled={!selected || generating}
          className="px-5 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: generating ? "#64748b" : "#7c3aed", cursor: generating ? "wait" : "pointer" }}
        >
          {generating ? "⏳..." : "⚡ Generate Semua"}
        </button>
      </div>

      {/* Timeline */}
      {timeline && (
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">📅 Timeline</h2>
            <span className="text-xs" style={{ color: "var(--su-text-dim)" }}>
              {timeline.totalMaterials} materi • {timeline.totalWeeks} minggu • {timeline.periods.length} periode
            </span>
          </div>
          <div className="space-y-2">
            {timeline.periods.map(p => (
              <div
                key={p.period}
                className="flex items-center gap-4 p-3 rounded-lg text-sm"
                style={{ backgroundColor: "var(--su-bg)" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: "#7c3aed" }}
                >
                  {p.period}
                </div>
                <div className="flex-1">
                  <div className="font-medium">Minggu {p.weekRange}</div>
                  <div style={{ color: "var(--su-text-dim)", fontSize: 12 }}>
                    {p.totalMaterials} materi • {p.subjects.join(", ")}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.subjects.map(s => (
                    <span
                      key={s}
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: "rgba(124,58,237,0.1)", color: "#a78bfa" }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)" }}
        >
          <h2 className="font-semibold mb-4">✅ {results.length} Ujian Berhasil Dibuat</h2>
          <div className="space-y-2">
            {results.map(r => (
              <div
                key={r.examId}
                className="flex items-center justify-between p-3 rounded-lg text-sm"
                style={{ backgroundColor: "var(--su-bg)" }}
              >
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="flex gap-2 mt-1 text-xs" style={{ color: "var(--su-text-dim)" }}>
                    <span>{r.questionCount} soal</span>
                    <span>🟢{r.difficulty.easy} 🟡{r.difficulty.medium} 🔴{r.difficulty.hard}</span>
                  </div>
                </div>
                <Link
                  href={`/dashboard/quizzes/${r.examId}`}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ backgroundColor: "rgba(124,58,237,0.12)", color: "#a78bfa" }}
                >
                  👁️ Lihat
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
