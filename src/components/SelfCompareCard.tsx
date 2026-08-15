"use client";

import { useEffect, useState } from "react";

interface Metric {
  current: number;
  previous: number;
  deltaPct: number | null;
}

interface CompareData {
  studyMinutes: Metric;
  quizzes: Metric;
  xp: Metric;
}

function DeltaPill({ deltaPct }: { deltaPct: number | null }) {
  if (deltaPct === null) {
    return <span className="text-xs" style={{ color: "var(--st-text-dim)" }}>baru mulai</span>;
  }
  const up = deltaPct > 0;
  const flat = deltaPct === 0;
  return (
    <span
      className="text-xs font-semibold"
      style={{ color: flat ? "var(--st-text-dim)" : up ? "#16a34a" : "#dc2626" }}
    >
      {flat ? "↔ sama" : up ? `▲ +${deltaPct}%` : `▼ ${deltaPct}%`} vs minggu lalu
    </span>
  );
}

export default function SelfCompareCard() {
  const [data, setData] = useState<CompareData | null>(null);

  useEffect(() => {
    fetch("/api/students/self-compare")
      .then((r) => r.json())
      .then((d) => setData(d.error ? null : d))
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  const items = [
    { icon: "⏱️", label: "Menit belajar", value: data.studyMinutes.current, deltaPct: data.studyMinutes.deltaPct },
    { icon: "📝", label: "Quiz dikerjakan", value: data.quizzes.current, deltaPct: data.quizzes.deltaPct },
    { icon: "✨", label: "XP didapat", value: data.xp.current, deltaPct: data.xp.deltaPct },
  ];

  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: "var(--st-bg-card)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🆚</span>
        <span className="font-bold text-lg" style={{ fontFamily: "var(--font-st-display)" }}>
          Perbandingan Diri Sendiri
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-xl p-3 text-center"
            style={{ backgroundColor: "var(--st-bg)" }}
          >
            <span className="text-xl">{it.icon}</span>
            <p className="text-lg font-bold mt-1" style={{ fontFamily: "var(--font-st-display)" }}>
              {it.value}
            </p>
            <p className="text-[11px]" style={{ color: "var(--st-text-dim)" }}>
              {it.label}
            </p>
            <div className="mt-1">
              <DeltaPill deltaPct={it.deltaPct} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
