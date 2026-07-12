"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-2xl animate-pulse">⏳</span>
      </div>
    );
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
