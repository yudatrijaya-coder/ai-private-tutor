"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface AgentRow {
  agentType: string;
  totalTokens: number;
  costUsd: number;
  avgLatency: number;
  count: number;
}

interface StudentRow {
  studentId: string;
  name: string;
  totalTokens: number;
  costUsd: number;
  count: number;
}

interface RecentRow {
  id: string;
  model: string;
  agentType: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  costUsd: number;
  createdAt: Date;
}

export function UsageView({
  total,
  byAgent,
  byStudent,
  recentUsage,
}: {
  total: { promptTokens: number | null; completionTokens: number | null; totalTokens: number | null; costUsd: number | null; count: number };
  byAgent: AgentRow[];
  byStudent: StudentRow[];
  recentUsage: RecentRow[];
}) {
  // Format cost in IDR (approximate rate: 1 USD ≈ 16,500 IDR)
  const formatCost = (usd: number) => {
    const idr = usd * 16500;
    if (idr < 100) return `Rp${idr.toFixed(0)}`;
    if (idr < 1000) return `Rp${idr.toFixed(0)}`;
    return `Rp${(idr / 1000).toFixed(1)}rb`;
  };

  const formatTokens = (n: number) => {
    if (n < 1000) return `${n}`;
    if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
    return `${(n / 1_000_000).toFixed(2)}M`;
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Panggilan", value: total.count.toString(), icon: "📞" },
          { label: "Total Token", value: formatTokens(total.totalTokens ?? 0), icon: "🔤" },
          { label: "Total Biaya", value: formatCost(total.costUsd ?? 0), icon: "💰" },
          { label: "Rata-rata per Panggilan", value: formatCost((total.costUsd ?? 0) / Math.max(total.count, 1)), icon: "📊" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-4"
            style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)" }}
          >
            <div className="text-xs mb-1" style={{ color: "var(--su-text-dim)" }}>{card.icon} {card.label}</div>
            <div className="text-xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Per Agent */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)" }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>
          🤖 Per Agent
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--su-text-dim)" }}>
                <th className="text-left pb-2 font-medium">Agent</th>
                <th className="text-right pb-2 font-medium">Panggilan</th>
                <th className="text-right pb-2 font-medium">Token</th>
                <th className="text-right pb-2 font-medium">Biaya</th>
                <th className="text-right pb-2 font-medium">Rata-rata Latency</th>
              </tr>
            </thead>
            <tbody>
              {byAgent.map((a) => (
                <tr key={a.agentType} style={{ borderTop: "1px solid var(--su-border)" }}>
                  <td className="py-2 font-medium capitalize">{a.agentType}</td>
                  <td className="py-2 text-right">{a.count}</td>
                  <td className="py-2 text-right">{formatTokens(a.totalTokens)}</td>
                  <td className="py-2 text-right">{formatCost(a.costUsd)}</td>
                  <td className="py-2 text-right">{a.avgLatency > 0 ? `${(a.avgLatency / 1000).toFixed(1)}s` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per Student */}
      {byStudent.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)" }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>
            👨‍🎓 Per Siswa
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--su-text-dim)" }}>
                  <th className="text-left pb-2 font-medium">Siswa</th>
                  <th className="text-right pb-2 font-medium">Panggilan</th>
                  <th className="text-right pb-2 font-medium">Token</th>
                  <th className="text-right pb-2 font-medium">Biaya</th>
                </tr>
              </thead>
              <tbody>
                {byStudent.map((s) => (
                  <tr key={s.studentId} style={{ borderTop: "1px solid var(--su-border)" }}>
                    <td className="py-2 font-medium">{s.name}</td>
                    <td className="py-2 text-right">{s.count}</td>
                    <td className="py-2 text-right">{formatTokens(s.totalTokens)}</td>
                    <td className="py-2 text-right">{formatCost(s.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent usage */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)" }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>
          📋 Riwayat Panggilan
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--su-text-dim)" }}>
                <th className="text-left pb-2 font-medium">Waktu</th>
                <th className="text-left pb-2 font-medium">Model</th>
                <th className="text-left pb-2 font-medium">Agent</th>
                <th className="text-right pb-2 font-medium">Token</th>
                <th className="text-right pb-2 font-medium">Latency</th>
                <th className="text-right pb-2 font-medium">Biaya</th>
              </tr>
            </thead>
            <tbody>
              {recentUsage.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--su-border)" }}>
                  <td className="py-1.5 text-xs" style={{ color: "var(--su-text-dim)" }}>
                    {format(new Date(r.createdAt), "dd MMM HH:mm", { locale: id })}
                  </td>
                  <td className="py-1.5 text-xs max-w-[140px] truncate">{r.model}</td>
                  <td className="py-1.5 text-xs capitalize">{r.agentType}</td>
                  <td className="py-1.5 text-xs text-right">{formatTokens(r.totalTokens)}</td>
                  <td className="py-1.5 text-xs text-right">{r.latencyMs > 0 ? `${(r.latencyMs / 1000).toFixed(1)}s` : "-"}</td>
                  <td className="py-1.5 text-xs text-right">{formatCost(r.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
