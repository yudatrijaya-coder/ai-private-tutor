"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LeaderboardRow {
  rank: number;
  name: string;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  badgeCount: number;
  isMe: boolean;
}

interface LeaderboardData {
  total: number;
  myRank: number | null;
  rows: LeaderboardRow[];
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/students/leaderboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(() => setError("Gagal memuat papan peringkat"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin text-4xl">🏆</div></div>;
  if (error) return <div className="text-center py-20"><p>{error}</p></div>;
  if (!data) return null;

  return (
    <div className="space-y-5 pb-8">
      <div className="text-center py-4">
        <div className="text-5xl mb-2">🏆</div>
        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-st-display)" }}>
          Papan Peringkat
        </h1>
        <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
          {data.total} siswa aktif
        </p>
      </div>

      {/* My Rank */}
      {data.myRank && (
        <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: "var(--st-primary)", color: "#fff" }}>
          <p className="text-xs opacity-80">Peringkatmu</p>
          <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-st-display)" }}>
            #{data.myRank}
          </p>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--st-bg-card)" }}>
        {data.rows.map((row) => {
          const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : `#${row.rank}`;
          return (
            <div key={row.rank} className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: "var(--st-bg)", backgroundColor: row.isMe ? "rgba(99,102,241,0.08)" : "transparent" }}>
              <span className="text-lg font-bold w-8 text-center" style={{ fontFamily: "var(--font-st-display)" }}>
                {medal}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{row.name}{row.isMe ? " (kamu)" : ""}</p>
                <div className="flex gap-3 text-xs" style={{ color: "var(--st-text-dim)" }}>
                  <span>🔥 {row.currentStreak}h</span>
                  <span>🏅 {row.badgeCount}</span>
                </div>
              </div>
              <span className="text-lg font-bold" style={{ fontFamily: "var(--font-st-display)", color: "var(--st-primary)" }}>
                ⭐ {row.xp.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-2">
        <Link href="/student" className="inline-block text-xs underline" style={{ color: "var(--st-text-dim)" }}>
          ← Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}