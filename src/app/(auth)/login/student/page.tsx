"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StudentLoginPage() {
  const router = useRouter();
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const redirectTo = searchParams.get("redirect") || "/student";
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, password: password || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal masuk");
        setLoading(false);
        return;
      }

      // Store student info in localStorage for the student layout to use
      localStorage.setItem("student_name", data.student.name);
      localStorage.setItem("student_class", data.student.gradeLevel ?? "SD Kelas 5");
      localStorage.setItem("student_character", data.student.character ?? "kak-budi");

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan koneksi");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundColor: "var(--st-bg, #f0f4ff)",
        color: "var(--st-text, #1e293b)",
        fontFamily: "var(--font-st-body)",
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 space-y-6"
        style={{
          backgroundColor: "var(--st-bg-card, #fff)",
          border: "1px solid #e5e7eb",
        }}
      >
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-4xl">🦉</div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            Masuk sebagai Siswa
          </h1>
          <p className="text-sm" style={{ color: "var(--st-text-dim, #94a3b8)" }}>
            Masukkan ID siswa dan password kamu
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Student ID */}
          <div className="space-y-1.5">
            <label
              htmlFor="studentId"
              className="text-sm font-medium"
              style={{ color: "var(--st-text-dim, #94a3b8)" }}
            >
              ID Siswa
            </label>
            <input
              id="studentId"
              name="studentId"
              type="text"
              required
              autoComplete="off"
              placeholder="Contoh: SYIFA001"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{
                backgroundColor: "var(--st-bg, #f0f4ff)",
                border: "1px solid #e5e7eb",
                color: "var(--st-text, #1e293b)",
              }}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium"
              style={{ color: "var(--st-text-dim, #94a3b8)" }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Password (kosongkan jika belum dibuat)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{
                backgroundColor: "var(--st-bg, #f0f4ff)",
                border: "1px solid #e5e7eb",
                color: "var(--st-text, #1e293b)",
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="text-sm px-3 py-2 rounded-lg"
              style={{
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fecaca",
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--st-primary, #6366f1)",
              color: "#fff",
            }}
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <div className="text-center space-y-2">
          <a
            href="/login/student?reset=1"
            className="text-xs"
            style={{ color: "var(--st-text-dim, #94a3b8)" }}
          >
            Lupa password? →
          </a>
          <br />
          <a
            href="/login"
            className="text-xs underline"
            style={{ color: "var(--st-text-dim, #94a3b8)" }}
          >
            Login Admin →
          </a>
        </div>
      </div>
    </div>
  );
}
