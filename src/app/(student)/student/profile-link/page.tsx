"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SkeletonPageShell } from "@/components/Skeleton";

interface StudentData {
  id: string;
  studentId: string;
  name: string;
  gradeLevel: string;
  persona: string | null;
  hasPassword: boolean;
}

function ProfileLinkContent() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // ── Monitor link (parent dashboard) ──
  const [monitor, setMonitor] = useState<{
    url: string;
    expiresAt: string;
    validDays: number;
  } | null>(null);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [monitorError, setMonitorError] = useState<string | null>(null);

  const studentName =
    typeof window !== "undefined"
      ? localStorage.getItem("student_name") ?? ""
      : "";

  const LOGIN_URL = "https://senangbelajar.web.id/login/student";

  useEffect(() => {
    fetch("/api/student/me")
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat data");
        return res.json();
      })
      .then((data) => {
        setStudent(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Gagal memuat data siswa");
        setLoading(false);
      });
  }, []);

  // Mint the monitor link on mount. It is a signed read-only token, so the
  // server decides its validity — the student only copies and shares it.
  const loadMonitorLink = useCallback(async () => {
    setMonitorLoading(true);
    setMonitorError(null);
    try {
      const res = await fetch("/api/student/guardian-link");
      if (!res.ok) throw new Error("gagal");
      const data = await res.json();
      setMonitor({ url: data.url, expiresAt: data.expiresAt, validDays: data.validDays });
      if (data?.url) localStorage.setItem("monitor_url", data.url);
    } catch {
      setMonitorError("Gagal membuat link pantau. Coba lagi.");
    } finally {
      setMonitorLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMonitorLink();
  }, [loadMonitorLink]);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }, []);

  /**
   * Share the monitor link. Prefers the native share sheet (WhatsApp, Telegram,
   * SMS all appear there on mobile); falls back to copying the message + link so
   * the parent can be reached by any channel.
   */
  const shareMonitor = useCallback(async () => {
    if (!monitor) return;
    const name = studentName || student?.name || "anak";
    const text = `Pantau perkembangan belajar ${name} di Senang Belajar:\n${monitor.url}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Pantau belajar ${name}`,
          text,
          url: monitor.url,
        });
        return;
      } catch {
        // cancelled, or the sheet is unavailable — fall through to copy
      }
    }
    await copyToClipboard(text, "monitor-share");
  }, [monitor, studentName, student, copyToClipboard]);

  if (loading) {
    return <SkeletonPageShell title="Tautan Profil" subtitle="Memuat tautan berbagi…" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm" style={{ color: "var(--st-text-dim)" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!student) return null;

  const shareText = `🌟 Akses Belajar ${studentName || student.name}
ID: ${student.studentId}
URL: ${LOGIN_URL}`;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="text-center">
        <h1
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-st-display)" }}
        >
          🔗 Link Profil
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--st-text-dim)" }}>
          Bagikan data login ke orang tua/wali
        </p>
      </div>

      {/* Student Info Card */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: "var(--st-bg-card)" }}
      >
        {/* Student ID */}
        <div>
          <label
            className="text-xs font-medium block mb-1"
            style={{ color: "var(--st-text-dim)" }}
          >
            ID Siswa
          </label>
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ backgroundColor: "var(--st-bg)" }}
          >
            <span className="text-sm font-mono font-bold">
              {student.studentId}
            </span>
            <button
              onClick={() => copyToClipboard(student.studentId, "id")}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{
                backgroundColor:
                  copiedField === "id"
                    ? "var(--st-primary)"
                    : "var(--st-primary)",
                color: "#fff",
                opacity: copiedField === "id" ? 0.8 : 1,
              }}
            >
              {copiedField === "id" ? "✅ Tersalin" : "Salin"}
            </button>
          </div>
        </div>

        {/* Login URL */}
        <div>
          <label
            className="text-xs font-medium block mb-1"
            style={{ color: "var(--st-text-dim)" }}
          >
            URL Login
          </label>
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ backgroundColor: "var(--st-bg)" }}
          >
            <span className="text-xs font-mono truncate flex-1 mr-2">
              {LOGIN_URL}
            </span>
            <button
              onClick={() => copyToClipboard(LOGIN_URL, "url")}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0"
              style={{
                backgroundColor: "var(--st-primary)",
                color: "#fff",
                opacity: copiedField === "url" ? 0.8 : 1,
              }}
            >
              {copiedField === "url" ? "✅ Tersalin" : "Salin"}
            </button>
          </div>
        </div>
      </div>

      {/* Monitor link — parent dashboard */}
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ backgroundColor: "var(--st-bg-card)" }}
      >
        <div>
          <h3
            className="text-sm font-bold"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            👀 Pantau Anak
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--st-text-dim)" }}>
            Link khusus orang tua: menampilkan progres belajar, nilai, jadwal
            ujian, dan topik yang perlu diulang. Hanya bisa dibaca.
          </p>
        </div>

        {monitorLoading && (
          <div
            className="h-11 rounded-xl animate-pulse"
            style={{ backgroundColor: "var(--st-bg)" }}
          />
        )}

        {!monitorLoading && monitorError && (
          <div className="space-y-2">
            <p className="text-xs" style={{ color: "var(--st-error)" }}>
              {monitorError}
            </p>
            <button
              onClick={() => void loadMonitorLink()}
              className="text-xs font-semibold px-3 py-2 rounded-lg"
              style={{ backgroundColor: "var(--st-primary)", color: "#fff" }}
            >
              Coba lagi
            </button>
          </div>
        )}

        {!monitorLoading && monitor && (
          <>
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl gap-2"
              style={{ backgroundColor: "var(--st-bg)" }}
            >
              <span className="text-xs font-mono truncate flex-1">
                {monitor.url}
              </span>
              <button
                onClick={() => copyToClipboard(monitor.url, "monitor")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                style={{
                  backgroundColor: "var(--st-primary)",
                  color: "#fff",
                  opacity: copiedField === "monitor" ? 0.8 : 1,
                }}
              >
                {copiedField === "monitor" ? "✅ Tersalin" : "Salin"}
              </button>
            </div>

            <button
              onClick={() => void shareMonitor()}
              className="w-full text-sm font-semibold px-4 py-3 rounded-xl"
              style={{ backgroundColor: "var(--st-secondary)", color: "#fff" }}
            >
              {copiedField === "monitor-share"
                ? "✅ Link tersalin — tempel ke WhatsApp"
                : "📤 Bagikan ke Orang Tua"}
            </button>

            <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
              Berlaku {monitor.validDays} hari sampai{" "}
              {new Date(monitor.expiresAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              . Bisa dibuat ulang kapan saja.
            </p>
          </>
        )}
      </div>

      {/* Password Status */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: "var(--st-bg-card)" }}
      >
        <h3
          className="text-sm font-bold mb-3"
          style={{ fontFamily: "var(--font-st-display)" }}
        >
          🔐 Password
        </h3>
        {student.hasPassword ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">✅</span>
              <span className="text-sm">Password sudah diatur</span>
            </div>
            <a
              href="/student/password"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{
                backgroundColor: "var(--st-primary)",
                color: "#fff",
              }}
            >
              Ubah
            </a>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <span className="text-sm" style={{ color: "var(--st-text-dim)" }}>
                Belum ada password
              </span>
            </div>
            <a
              href="/student/password"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{
                backgroundColor: "var(--st-primary)",
                color: "#fff",
              }}
            >
              Buat Password
            </a>
          </div>
        )}
      </div>

      {/* Share Card */}
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ backgroundColor: "var(--st-bg-card)" }}
      >
        <div
          className="flex items-center justify-between"
          style={{ color: "var(--st-text-dim)" }}
        >
          <h3
            className="text-sm font-bold"
            style={{
              fontFamily: "var(--font-st-display)",
              color: "var(--st-text)",
            }}
          >
            📋 Kartu Info Login
          </h3>
          <button
            onClick={() => copyToClipboard(shareText, "card")}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{
              backgroundColor: "var(--st-primary)",
              color: "#fff",
            }}
          >
            {copiedField === "card" ? "✅ Tersalin" : "Salin Semua"}
          </button>
        </div>
        <pre
          className="text-sm whitespace-pre-wrap rounded-xl p-4 font-mono leading-relaxed"
          style={{
            backgroundColor: "var(--st-bg)",
            color: "var(--st-text)",
            border: "1px dashed #e5e7eb",
          }}
        >
{`🌟 Akses Belajar ${studentName || student.name}
ID: ${student.studentId}
URL: ${LOGIN_URL}`}
        </pre>
      </div>
    </div>
  );
}

export default function ProfileLinkPage() {
  return (
    <ProfileLinkContent />
  );
}
