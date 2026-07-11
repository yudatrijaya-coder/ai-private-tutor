"use client";

import { useCallback, useEffect, useState } from "react";

/* ── Types ── */

type QueueInfo = {
  status: string;
  message: string;
  queues: Array<{ name: string; waiting: number; active: number; completed: number; failed: number }>;
};

type BotStatus = {
  configured: boolean;
  mode: "webhook" | "polling" | "off";
  webhookUrl: string;
};

type SystemInfo = {
  totalStudents: number;
  totalMaterials: number;
  totalQuizzes: number;
};

/* ── Section Card Wrapper ── */

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--su-bg-card)",
        border: "1px solid var(--su-border)",
      }}
    >
      <h2
        className="font-semibold mb-4"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

/* ── Status Badge ── */

function Badge({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
}

/* ── Settings Input ── */

function SettingRow({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  onSubmit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  onSubmit?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-sm w-28 shrink-0" style={{ color: "var(--su-text-dim)" }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-1.5 text-sm rounded-lg border"
        style={{
          backgroundColor: "var(--su-bg-hover)",
          borderColor: "var(--su-border)",
          color: "var(--su-text)",
        }}
      />
      {onSubmit && (
        <button
          onClick={onSubmit}
          className="text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer"
          style={{
            backgroundColor: "rgba(59,130,246,0.12)",
            color: "var(--su-info)",
          }}
        >
          Simpan
        </button>
      )}
    </div>
  );
}

/* ── Main Component ── */

export default function SettingsPage() {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [queue, setQueue] = useState<QueueInfo | null>(null);
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [botRes, queueRes, sysRes] = await Promise.all([
        fetch("/api/admin/bot-status"),
        fetch("/api/queues"),
        fetch("/api/admin/system-info"),
      ]);
      if (botRes.ok) {
        const b = await botRes.json();
        setBotStatus(b);
        setWebhookUrl(b.webhookUrl || "");
      }
      if (queueRes.ok) setQueue(await queueRes.json());
      if (sysRes.ok) setSysInfo(await sysRes.json());
    } catch {
      // server may be cold
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function saveWebhook() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/set-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      if (res.ok) {
        setMsg("Webhook tersimpan");
        fetchData();
      } else {
        const e = await res.json();
        setMsg(`Gagal: ${e.error || "unknown"}`);
      }
    } catch {
      setMsg("Gagal menyimpan webhook");
    } finally {
      setSaving(false);
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>⚙️ Settings</h1>
        <p className="text-sm" style={{ color: "var(--su-text-dim)" }}>Memuat...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ⚙️ Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
          Konfigurasi sistem AI Private Tutor
        </p>
      </div>

      {msg && (
        <div
          className="text-sm px-4 py-2 rounded-lg"
          style={{
            backgroundColor: msg.startsWith("Gagal")
              ? "rgba(239,68,68,0.12)"
              : "rgba(34,197,94,0.12)",
            color: msg.startsWith("Gagal")
              ? "var(--su-danger)"
              : "var(--su-success)",
          }}
        >
          {msg}
        </div>
      )}

      <div className="grid gap-6">

        {/* ── System Info ── */}
        <SectionCard title="📊 Sistem">
          <div className="text-sm space-y-3" style={{ color: "var(--su-text-dim)" }}>
            <div className="grid grid-cols-3 gap-4">
              <div
                className="p-3 rounded-lg text-center"
                style={{ backgroundColor: "var(--su-bg-hover)" }}
              >
                <div className="text-2xl font-bold" style={{ color: "var(--su-text)" }}>
                  {sysInfo?.totalStudents ?? "?"}
                </div>
                <div className="text-xs">Siswa</div>
              </div>
              <div
                className="p-3 rounded-lg text-center"
                style={{ backgroundColor: "var(--su-bg-hover)" }}
              >
                <div className="text-2xl font-bold" style={{ color: "var(--su-text)" }}>
                  {sysInfo?.totalMaterials ?? "?"}
                </div>
                <div className="text-xs">Materi</div>
              </div>
              <div
                className="p-3 rounded-lg text-center"
                style={{ backgroundColor: "var(--su-bg-hover)" }}
              >
                <div className="text-2xl font-bold" style={{ color: "var(--su-text)" }}>
                  {sysInfo?.totalQuizzes ?? "?"}
                </div>
                <div className="text-xs">Kuis</div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Telegram Bot ── */}
        <SectionCard title="🤖 Telegram Bot">
          <div className="text-sm space-y-3" style={{ color: "var(--su-text-dim)" }}>
            <SettingRow
              label="Webhook URL"
              value={webhookUrl}
              onChange={setWebhookUrl}
              placeholder="https://domain.com/api/bot/webhook"
              onSubmit={saveWebhook}
            />
            <div className="flex items-center justify-between py-2">
              <span>Status token</span>
              <Badge
                label={botStatus?.configured ? "✅ Terkonfigurasi" : "❌ Token tidak diset"}
                color={botStatus?.configured ? "var(--su-success)" : "var(--su-danger)"}
                bg={
                  botStatus?.configured
                    ? "rgba(34,197,94,0.12)"
                    : "rgba(239,68,68,0.12)"
                }
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <span>Mode koneksi</span>
              <Badge
                label={botStatus?.mode ?? "?"}
                color={
                  botStatus?.mode === "polling"
                    ? "var(--su-warning)"
                    : botStatus?.mode === "webhook"
                      ? "var(--su-success)"
                      : "var(--su-text-dim)"
                }
                bg={
                  botStatus?.mode === "polling"
                    ? "rgba(245,158,11,0.12)"
                    : botStatus?.mode === "webhook"
                      ? "rgba(34,197,94,0.12)"
                      : "rgba(100,116,139,0.12)"
                }
              />
            </div>
          </div>
        </SectionCard>

        {/* ── Queue & Pipeline ── */}
        <SectionCard title="⚙️ Queue & Pipeline">
          <div className="text-sm space-y-3" style={{ color: "var(--su-text-dim)" }}>
            <div className="flex items-center justify-between py-2">
              <span>Redis</span>
              <Badge
                label={queue?.status === "connected" ? "Terhubung" : queue?.status === "disconnected" ? "Terputus" : "?"}
                color={
                  queue?.status === "connected"
                    ? "var(--su-success)"
                    : "var(--su-danger)"
                }
                bg={
                  queue?.status === "connected"
                    ? "rgba(34,197,94,0.12)"
                    : "rgba(239,68,68,0.12)"
                }
              />
            </div>
            <a
              href="/dashboard/settings/api-usage"
              className="flex items-center justify-between py-2 rounded-lg px-3 transition-colors hover:opacity-80"
              style={{ backgroundColor: "var(--su-bg-hover)" }}
            >
              <span className="font-medium" style={{ color: "var(--su-text)" }}>💰 Penggunaan API</span>
              <span style={{ color: "var(--su-info)" }}>Lihat detail →</span>
            </a>
            {queue?.queues && queue.queues.map((q) => (
              <div key={q.name} className="p-3 rounded-lg" style={{ backgroundColor: "var(--su-bg-hover)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium" style={{ color: "var(--su-text)" }}>{q.name}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <div className="font-bold" style={{ color: "var(--su-warning)" }}>{q.waiting}</div>
                    <div style={{ color: "var(--su-text-dim)" }}>Antre</div>
                  </div>
                  <div>
                    <div className="font-bold" style={{ color: "var(--su-info)" }}>{q.active}</div>
                    <div style={{ color: "var(--su-text-dim)" }}>Proses</div>
                  </div>
                  <div>
                    <div className="font-bold" style={{ color: "var(--su-success)" }}>{q.completed}</div>
                    <div style={{ color: "var(--su-text-dim)" }}>Selesai</div>
                  </div>
                  <div>
                    <div className="font-bold" style={{ color: "var(--su-danger)" }}>{q.failed}</div>
                    <div style={{ color: "var(--su-text-dim)" }}>Gagal</div>
                  </div>
                </div>
              </div>
            ))}
            {queue?.message && !queue?.queues?.length && (
              <p className="text-xs">{queue.message}</p>
            )}
          </div>
        </SectionCard>

        {/* ── Tentang ── */}
        <SectionCard title="ℹ️ Tentang">
          <div className="text-sm space-y-2" style={{ color: "var(--su-text-dim)" }}>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: "var(--su-border)" }}>
              <span>Aplikasi</span>
              <span className="font-medium" style={{ color: "var(--su-text)" }}>AI Private Tutor</span>
            </div>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: "var(--su-border)" }}>
              <span>Framework</span>
              <span className="font-mono text-xs">Next.js 16 + Prisma (SQLite)</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Delivery</span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "var(--su-success)" }}>
                TEXT only (video deferred)
              </span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
