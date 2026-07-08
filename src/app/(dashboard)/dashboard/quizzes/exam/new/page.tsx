"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Student { studentId: string; name: string; gradeLevel: string; }
interface Material { subject: string; topic: string; }

export default function NewExamPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get("studentId") || "";

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState(studentId);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/students").then(r => r.json()).then(d => setStudents(d.students || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    fetch(`/api/students/subjects?studentId=${selectedStudent}`)
      .then(r => r.json())
      .then(d => { setSubjects(d.subjects || []); setSelectedSubject(""); setSelectedTopics([]); })
      .catch(() => {});
  }, [selectedStudent]);

  useEffect(() => {
    if (!selectedSubject || !selectedStudent) return;
    fetch(`/api/students/topics?studentId=${selectedStudent}&subject=${selectedSubject}`)
      .then(r => r.json())
      .then(d => setTopics(d.topics || []))
      .catch(() => {});
  }, [selectedSubject, selectedStudent]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const generateExam = async () => {
    if (!selectedStudent || !selectedSubject || selectedTopics.length === 0) return;
    setGenerating(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent,
          subject: selectedSubject,
          topics: selectedTopics,
          questionCount,
        }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data.exam);
    } catch (e) {
      setError("Gagal generate exam");
    }
    setGenerating(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/quizzes" className="text-sm opacity-60 hover:opacity-100">← Kembali</Link>
        <h1 className="text-2xl font-bold mt-2" style={{ fontFamily: "var(--font-display)" }}>
          ✨ Buat Exam Baru
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
          Gabungkan soal dari beberapa topik jadi satu ujian dengan mix difficulty
        </p>
      </div>

      <div className="space-y-4">
        {/* Student */}
        <div>
          <label className="text-sm font-medium block mb-1">Murid</label>
          <select
            value={selectedStudent}
            onChange={e => { setSelectedStudent(e.target.value); setResult(null); }}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ backgroundColor: "var(--su-bg-card)", borderColor: "var(--su-border)", color: "var(--su-text)" }}
          >
            <option value="">— Pilih murid —</option>
            {students.map(s => (
              <option key={s.studentId} value={s.studentId}>{s.name} ({s.gradeLevel})</option>
            ))}
          </select>
        </div>

        {/* Subject */}
        {subjects.length > 0 && (
          <div>
            <label className="text-sm font-medium block mb-1">Mata Pelajaran</label>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <button
                  key={s}
                  onClick={() => { setSelectedSubject(s); setSelectedTopics([]); setResult(null); }}
                  className="px-3 py-1.5 rounded-lg text-sm border transition-all"
                  style={{
                    backgroundColor: selectedSubject === s ? "rgba(124,58,237,0.15)" : "var(--su-bg-card)",
                    borderColor: selectedSubject === s ? "#7c3aed" : "var(--su-border)",
                    color: selectedSubject === s ? "#7c3aed" : "var(--su-text)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Topics */}
        {topics.length > 0 && (
          <div>
            <label className="text-sm font-medium block mb-1">Topik (pilih minimal 1)</label>
            <div className="flex flex-wrap gap-2">
              {topics.map(t => (
                <button
                  key={t}
                  onClick={() => toggleTopic(t)}
                  className="px-3 py-1.5 rounded-lg text-sm border transition-all"
                  style={{
                    backgroundColor: selectedTopics.includes(t) ? "rgba(34,197,94,0.15)" : "var(--su-bg-card)",
                    borderColor: selectedTopics.includes(t) ? "#22c55e" : "var(--su-border)",
                    color: selectedTopics.includes(t) ? "#22c55e" : "var(--su-text)",
                  }}
                >
                  {selectedTopics.includes(t) ? "✅ " : ""}{t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question count */}
        {selectedTopics.length > 0 && (
          <div>
            <label className="text-sm font-medium block mb-1">Jumlah Soal: {questionCount}</label>
            <input
              type="range"
              min={5}
              max={50}
              value={questionCount}
              onChange={e => setQuestionCount(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs" style={{ color: "var(--su-text-dim)" }}>
              <span>5 soal</span>
              <span>50 soal</span>
            </div>
          </div>
        )}

        {/* Generate button */}
        {selectedTopics.length > 0 && (
          <button
            onClick={generateExam}
            disabled={generating}
            className="w-full py-3 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: generating ? "#64748b" : "#7c3aed", cursor: generating ? "wait" : "pointer" }}
          >
            {generating ? "⏳ Generating..." : `✨ Generate Exam (${selectedTopics.length} topik, ~${questionCount} soal)`}
          </button>
        )}
      </div>

      {/* Error */}
      {error && <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>{error}</div>}

      {/* Result */}
      {result && (
        <div
          className="rounded-xl p-6 space-y-4"
          style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold">📋 Exam Berhasil Dibuat!</h2>
            <span className="text-xs px-2 py-0.5 rounded font-medium text-white" style={{ backgroundColor: "#7c3aed" }}>
              EXAM
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(34,197,94,0.1)" }}>
              <div className="font-bold text-lg">{result.questionCount}</div>
              <div style={{ color: "var(--su-text-dim)" }}>Soal</div>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(59,130,246,0.1)" }}>
              <div className="font-bold text-lg">{result.maxScore}</div>
              <div style={{ color: "var(--su-text-dim)" }}>Nilai Maks</div>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
              <div className="font-bold text-lg flex justify-center gap-1 text-xs">
                <span style={{ color: "#22c55e" }}>🟢{result.difficulty.easy}</span>
                <span style={{ color: "#eab308" }}>🟡{result.difficulty.medium}</span>
                <span style={{ color: "#ef4444" }}>🔴{result.difficulty.hard}</span>
              </div>
              <div style={{ color: "var(--su-text-dim)" }}>Difficulty</div>
            </div>
          </div>

          <div className="text-sm space-y-1" style={{ color: "var(--su-text-dim)" }}>
            <div>📚 {result.subject}</div>
            <div>📌 {result.topics?.join(", ") || "-"}</div>
          </div>

          <Link
            href={`/dashboard/quizzes/${result.id}`}
            className="block w-full text-center py-3 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: "#7c3aed" }}
          >
            👁️ Lihat Soal & Kunci Jawaban
          </Link>
        </div>
      )}
    </div>
  );
}
