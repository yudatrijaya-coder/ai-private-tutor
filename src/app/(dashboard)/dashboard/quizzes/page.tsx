"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Student {
  id: string;
  studentId: string;
  name: string;
  gradeLevel: string;
}

interface QuizSummary {
  id: string;
  materialId: string;
  type: "QUIZ" | "EXAM";
  maxScore: number;
  questions: number;
  createdAt: string;
  material?: { topic: string; subTopic: string; subject: string };
}

export default function QuizPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => setStudents(d.students || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    setLoading(true);
    fetch(`/api/students/quizzes?studentId=${selectedStudent}`)
      .then((r) => r.json())
      .then((d) => setQuizzes(d.quizzes || []))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, [selectedStudent]);

  const generateAllQuizzes = async () => {
    if (!selectedStudent) return;
    setGenerating(true);
    await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "trigger", studentId: selectedStudent, stages: ["assessment"] }),
    });
    alert("✅ Quiz generation queued! Refresh in a moment.");
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          📝 Quiz & Exam
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
          Kelola quiz dan ujian untuk setiap murid
        </p>
      </div>

      {/* Student selector */}
      <div className="flex gap-3 items-center">
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: "var(--su-bg-card)",
            borderColor: "var(--su-border)",
            color: "var(--su-text)",
          }}
        >
          <option value="">— Pilih murid —</option>
          {students.map((s) => (
            <option key={s.id} value={s.studentId}>
              {s.name} ({s.gradeLevel})
            </option>
          ))}
        </select>

        {selectedStudent && (
          <button
            onClick={generateAllQuizzes}
            disabled={generating}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{
              backgroundColor: generating ? "#64748b" : "#7c3aed",
              cursor: generating ? "wait" : "pointer",
            }}
          >
            {generating ? "⏳ Generating..." : "⚡ Generate All Quizzes"}
          </button>
        )}
      </div>

      {/* Quiz list */}
      {selectedStudent && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: "1px solid var(--su-border)",
          }}
        >
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--su-border)" }}>
            <span className="font-semibold">Quiz & Exam</span>
            <span className="text-xs" style={{ color: "var(--su-text-dim)" }}>
              {quizzes.length} total
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--su-text-dim)" }}>
              Loading...
            </div>
          ) : quizzes.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--su-text-dim)" }}>
              Belum ada quiz. Klik "Generate All Quizzes" untuk membuat.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider" style={{ color: "var(--su-text-dim)" }}>
                    <th className="text-left px-4 py-2">Mapel</th>
                    <th className="text-left px-4 py-2">Topik</th>
                    <th className="text-left px-4 py-2">Tipe</th>
                    <th className="text-left px-4 py-2">Soal</th>
                    <th className="text-left px-4 py-2">Tanggal</th>
                    <th className="text-left px-4 py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.map((q) => (
                    <tr key={q.id} className="border-t" style={{ borderColor: "var(--su-border)" }}>
                      <td className="px-4 py-2">{q.material?.subject || "—"}</td>
                      <td className="px-4 py-2">{q.material?.topic || "—"}</td>
                      <td className="px-4 py-2">
                        <span
                          className="inline-block text-xs px-2 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: q.type === "EXAM" ? "rgba(124,58,237,0.12)" : "rgba(59,130,246,0.12)",
                            color: q.type === "EXAM" ? "#a78bfa" : "#60a5fa",
                          }}
                        >
                          {q.type}
                        </span>
                      </td>
                      <td className="px-4 py-2">{q.questions}</td>
                      <td className="px-4 py-2 text-xs" style={{ color: "var(--su-text-dim)" }}>
                        {new Date(q.createdAt).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/dashboard/quizzes/${q.id}`}
                          className="text-xs px-2 py-1 rounded"
                          style={{ backgroundColor: "rgba(59,130,246,0.12)", color: "#60a5fa" }}
                        >
                          Lihat Soal
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Exam generator */}
      {selectedStudent && quizzes.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: "1px solid var(--su-border)",
          }}
        >
          <h3 className="font-semibold mb-3">📋 Buat Exam Gabungan</h3>
          <p className="text-xs mb-4" style={{ color: "var(--su-text-dim)" }}>
            Gabungkan soal dari beberapa topik jadi satu ujian dengan mix difficulty
          </p>
          <Link
            href={`/dashboard/quizzes/exam/template?studentId=${selectedStudent}`}
            className="inline-block px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: "rgba(124,58,237,0.12)", color: "#a78bfa" }}
          >
            📋 Template Ujian
          </Link>
        </div>
      )}
    </div>
  );
}
