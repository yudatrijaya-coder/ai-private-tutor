"use client";

import { useState, useEffect } from "react";

interface Student {
  studentId: string;
  name: string;
  gradeLevel: string;
}

interface PipelineResult {
  stage: string;
  jobId?: string;
  status: string;
  error?: string;
}

export function PipelineTrigger() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PipelineResult[] | null>(null);
  const [mode, setMode] = useState("");

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => setStudents(d.students ?? []))
      .catch(() => {});
  }, []);

  async function runPipeline(stages: string[]) {
    if (!selected) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger", studentId: selected, stages }),
      });
      const data = await res.json();
      setResult(data.results ?? []);
      setMode(data.mode ?? "");
    } catch {
      setResult([{ stage: "error", status: "failed", error: "Network error" }]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        backgroundColor: "var(--su-bg-card)",
        border: "1px solid var(--su-border)",
      }}
    >
      <div>
        <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
          🚀 Pipeline Trigger
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--su-text-dim)" }}>
          Generate curriculum, content, quiz & jadwal untuk student
        </p>
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium mb-1">Pilih Student</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: "var(--su-bg)",
              border: "1px solid var(--su-border)",
              color: "var(--su-text)",
            }}
          >
            <option value="">— Pilih —</option>
            {students.map((s) => (
              <option key={s.studentId} value={s.studentId}>
                {s.name} ({s.studentId}) — {s.gradeLevel}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => runPipeline(["curriculum"])}
          disabled={!selected || running}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-40"
          style={{ backgroundColor: "rgba(99,102,241,0.15)", color: "#818cf8" }}
        >
          📚 Curriculum
        </button>
        <button
          onClick={() => runPipeline(["content"])}
          disabled={!selected || running}
          className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
          style={{ backgroundColor: "rgba(16,185,129,0.15)", color: "#34d399" }}
        >
          📄 Content
        </button>
        <button
          onClick={() => runPipeline(["assessment"])}
          disabled={!selected || running}
          className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
          style={{ backgroundColor: "rgba(251,191,36,0.15)", color: "#fbbf24" }}
        >
          📝 Quiz
        </button>
        <button
          onClick={() => runPipeline(["schedule"])}
          disabled={!selected || running}
          className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
          style={{ backgroundColor: "rgba(244,114,182,0.15)", color: "#f472b6" }}
        >
          📅 Jadwal
        </button>
        <button
          onClick={() => runPipeline(["curriculum", "content", "assessment", "schedule"])}
          disabled={!selected || running}
          className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
          style={{ backgroundColor: "rgba(139,92,246,0.2)", color: "#a78bfa" }}
        >
          {running ? "⏳ Memproses..." : "⚡ Full Pipeline"}
        </button>
      </div>

      {result && (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium">Mode:</span>
            <span className={mode === "bullmq" ? "text-green-400" : "text-yellow-400"}>
              {mode === "bullmq" ? "✅ BullMQ (Redis)" : "🟡 In-Memory"}
            </span>
          </div>
          {result.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md"
              style={{
                backgroundColor:
                  r.status === "queued"
                    ? "rgba(16,185,129,0.08)"
                    : r.status === "error" || r.error
                      ? "rgba(239,68,68,0.08)"
                      : "rgba(251,191,36,0.08)",
              }}
            >
              <span>
                {r.status === "queued" ? "✅" : r.error ? "❌" : "⚠️"}
              </span>
              <span className="font-medium">{r.stage}</span>
              <span style={{ color: "var(--su-text-dim)" }}>
                {r.jobId ? `job: ${r.jobId.slice(0, 16)}...` : r.error ?? r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
