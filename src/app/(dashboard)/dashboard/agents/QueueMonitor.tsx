"use client";

import { useState, useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Queue name → agent type mapping                                    */
/* ------------------------------------------------------------------ */

const QUEUE_TO_AGENT: Record<string, string> = {
  "content:scrape": "CONTENT",
  "curriculum:review": "CURRICULUM",
  "media:render": "MEDIA",
  "media:yt-fallback": "MEDIA",
  "assessment:generate": "ASSESSMENT",
  "assessment:evaluate": "ASSESSMENT",
  "guardian:report": "GUARDIAN",
  "scheduler:assign": "SCHEDULER",
  "scheduler:reminder": "SCHEDULER",
};

const AGENT_META: Record<string, { label: string; icon: string }> = {
  CONTENT: { label: "Content", icon: "📝" },
  CURRICULUM: { label: "Curriculum", icon: "📋" },
  MEDIA: { label: "Media", icon: "🎬" },
  ASSESSMENT: { label: "Assessment", icon: "✍️" },
  TUTOR: { label: "Tutor", icon: "🤖" },
  GUARDIAN: { label: "Guardian", icon: "🛡️" },
  SCHEDULER: { label: "Scheduler", icon: "📅" },
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type QueueEntry = {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
};

type QueueResponse = {
  status: string;
  message?: string;
  queues: QueueEntry[];
};

type AgentQueueTotals = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getDotColor(
  waiting: number,
  active: number,
  failed: number,
): { color: string; label: string } {
  if (active > 0) return { color: "var(--su-success)", label: "running" };
  if (waiting > 0) return { color: "var(--su-warning)", label: "menunggu" };
  if (failed > 0) return { color: "var(--su-danger)", label: "gagal" };
  return { color: "var(--su-text-dim)", label: "idle" };
}

function groupByAgent(queues: QueueEntry[]): Map<string, AgentQueueTotals> {
  const map = new Map<string, AgentQueueTotals>();

  for (const q of queues) {
    const agentType = QUEUE_TO_AGENT[q.name] ?? q.name;
    const prev = map.get(agentType) ?? {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };
    map.set(agentType, {
      waiting: prev.waiting + q.waiting,
      active: prev.active + q.active,
      completed: prev.completed + q.completed,
      failed: prev.failed + q.failed,
    });
  }

  return map;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function QueueMonitor() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [offline, setOffline] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchQueues = async () => {
      try {
        const res = await fetch("/api/queues");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: QueueResponse = await res.json();
        if (!mounted) return;

        if (json.status === "disconnected") {
          setOffline(true);
          setData(null);
        } else {
          setOffline(false);
          setData(json);
        }
      } catch {
        if (mounted) {
          setOffline(true);
          setData(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchQueues();
    const interval = setInterval(fetchQueues, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  /* ---------- Group by agent ------------------------------------- */
  const agentTotals =
    data && !offline ? groupByAgent(data.queues) : new Map();

  /* ---------- Ordered agent keys (all 7 always rendered) ---------- */
  const agentKeys = Object.keys(AGENT_META);

  /* ---------- Render ---------------------------------------------- */
  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--su-bg-card)",
        border: "1px solid var(--su-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-lg font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          🔌 Live Queue Status
        </h2>
        {!offline && !loading && (
          <span className="text-xs" style={{ color: "var(--su-text-dim)" }}>
            auto-refresh 5s
          </span>
        )}
      </div>

      {/* Offline / Redis unavailable */}
      {offline && !loading && (
        <div
          className="text-sm flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{
            backgroundColor: "rgba(245,158,11,0.1)",
            color: "var(--su-warning)",
          }}
        >
          <span>⚠️</span>
          <span>
            Redis belum aktif — queue akan jalan saat deploy
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-sm" style={{ color: "var(--su-text-dim)" }}>
          Memuat antrean...
        </p>
      )}

      {/* Queue cards */}
      {!offline && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {agentKeys.map((agentType) => {
            const meta = AGENT_META[agentType] ?? {
              label: agentType,
              icon: "⚙️",
            };
            const counts = agentTotals.get(agentType) ?? {
              waiting: 0,
              active: 0,
              completed: 0,
              failed: 0,
            };
            const dot = getDotColor(
              counts.waiting,
              counts.active,
              counts.failed,
            );
            const total = counts.waiting + counts.active + counts.completed + counts.failed;

            return (
              <div
                key={agentType}
                className="rounded-lg p-3 text-sm"
                style={{ backgroundColor: "var(--su-bg-hover)" }}
              >
                {/* Agent label + status dot */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-xs">
                    {meta.icon} {meta.label}
                  </span>
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: dot.color }}
                    title={dot.label}
                  />
                </div>

                {/* Counts */}
                <div
                  className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]"
                  style={{ color: "var(--su-text-dim)" }}
                >
                  {total > 0 ? (
                    <>
                      <span style={{ color: "var(--su-info)" }}>
                        ⏳{counts.waiting}
                      </span>
                      <span style={{ color: "var(--su-success)" }}>
                        ▶{counts.active}
                      </span>
                      <span>✓{counts.completed}</span>
                      <span style={{ color: "var(--su-danger)" }}>
                        ✗{counts.failed}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: "var(--su-text-dim)" }}>–</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
