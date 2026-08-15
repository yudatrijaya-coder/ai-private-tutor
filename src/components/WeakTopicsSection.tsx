"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface WeakTopic {
  topic: string;
  subject: string;
  mastery: number;
  weaknessLevel: string;
  quizId: string | null;
}

export default function WeakTopicsSection() {
  const [rows, setRows] = useState<WeakTopic[]>([]);

  useEffect(() => {
    fetch("/api/students/weak-topics")
      .then((r) => r.json())
      .then((d) => setRows(d.weakTopics ?? []))
      .catch(() => setRows([]));
  }, []);

  if (rows.length === 0) return null;

  const emoji = (level: string) =>
    level === "severe" ? "🔴" : level === "moderate" ? "🟡" : "🟠";

  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: "var(--st-bg-card)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🎯</span>
        <span className="font-bold text-base" style={{ fontFamily: "var(--font-st-display)" }}>
          Mode Drill — Perkuat Topik Lemah
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--st-text-dim)" }}>
        Latihan langsung di topik yang masih perlu dikuasai
      </p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.topic}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "var(--st-bg)" }}
          >
            <span className="text-lg shrink-0">{emoji(r.weaknessLevel)}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{r.topic}</p>
              <p className="text-[11px]" style={{ color: "var(--st-text-dim)" }}>
                {r.subject} · mastery {r.mastery}%
              </p>
            </div>
            {r.quizId ? (
              <Link
                href={`/student/quiz?quizId=${r.quizId}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white shrink-0"
                style={{ backgroundColor: "var(--st-primary)" }}
              >
                🚀 Latihan
              </Link>
            ) : (
              <Link
                href={`/student/subject/${encodeURIComponent(r.subject)}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                style={{ backgroundColor: "var(--st-bg-card)", color: "var(--st-text-dim)" }}
              >
                📚 Materi
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
