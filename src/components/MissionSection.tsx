"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Mission {
  key: string;
  title: string;
  icon: string;
  href: string;
}

export default function MissionSection() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/student/missions");
      if (!r.ok) return;
      const data = await r.json();
      setMissions(data.missions ?? []);
      setDone(new Set(data.completedKeys ?? []));
      setXp(data.xp ?? 0);
      setStreak(data.streak ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const complete = async (key: string) => {
    if (busy || done.has(key)) return;
    setBusy(true);
    try {
      const r = await fetch("/api/student/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!r.ok) return;
      const data = await r.json();
      setDone((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      if (data.xp > 0) {
        setXp((x) => x + data.xp);
        setFlash("+" + data.xp + " XP! 🔥");
        setTimeout(() => setFlash(null), 2500);
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;
  if (missions.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: "var(--st-bg-card)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="font-bold text-base"
          style={{ fontFamily: "var(--font-st-display)" }}
        >
          🎯 Misi Hari Ini
        </h3>
        <div
          className="flex items-center gap-3 text-xs"
          style={{ color: "var(--st-text-dim)" }}
        >
          {streak > 0 && <span>🔥 {streak} hari</span>}
          <span>✨ {xp} XP</span>
        </div>
      </div>

      <div className="space-y-2">
        {missions.map((m) => {
          const isDone = done.has(m.key);
          return (
            <div
              key={m.key}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
              style={{
                backgroundColor: isDone
                  ? "rgba(34,197,94,0.08)"
                  : "rgba(168,162,158,0.06)",
                opacity: isDone ? 0.75 : 1,
              }}
            >
              <button
                onClick={() => complete(m.key)}
                disabled={busy || isDone}
                aria-label={isDone ? "Selesai" : "Tandai selesai: " + m.title}
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs shrink-0 transition-all hover:scale-110 active:scale-95"
                style={{
                  borderColor: isDone
                    ? "var(--st-success)"
                    : "var(--st-text-dim)",
                  color: isDone ? "var(--st-success)" : "transparent",
                }}
              >
                {isDone ? "✓" : ""}
              </button>
              <span className="text-lg shrink-0">{m.icon}</span>
              <div className="min-w-0 flex-1">
                <Link
                  href={m.href}
                  className="text-sm font-medium block truncate hover:underline"
                >
                  {m.title}
                </Link>
                <span
                  className="text-[10px]"
                  style={{ color: "var(--st-text-dim)" }}
                >
                  {isDone ? "Selesai +10 XP" : "Ketuk lingkaran saat selesai"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="mt-3 text-center text-xs font-bold"
        style={{ color: "var(--st-gold)" }}
        aria-live="polite"
      >
        {flash ?? ""}
      </div>
    </div>
  );
}
