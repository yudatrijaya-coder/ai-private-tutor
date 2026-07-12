"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PasswordChangePage() {
  const router = useRouter();
  const studentName =
    typeof window !== "undefined"
      ? localStorage.getItem("student_name") ?? ""
      : "";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsCurrent, setNeedsCurrent] = useState(true); // will be updated on mount

  // Fetch if student has password on mount
  useEffect(() => {
    fetch("/api/student/me")
      .then((res) => res.json())
      .then((data) => {
        setNeedsCurrent(data.hasPassword);
      })
      .catch(() => {
        // default to showing current password field
      });
  }, []);

  function validate(): string | null {
    if (newPassword.length < 6) {
      return "Password baru minimal 6 karakter";
    }
    if (newPassword !== confirmPassword) {
      return "Konfirmasi password tidak cocok";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const body: Record<string, string> = { newPassword };
      if (needsCurrent) {
        body.currentPassword = currentPassword;
      }

      const res = await fetch("/api/student/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal mengubah password");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/student/profile-link");
        router.refresh();
      }, 1500);
    } catch {
      setError("Terjadi kesalahan koneksi");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="text-center">
        <h1
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-st-display)" }}
        >
          🔐 {needsCurrent ? "Ubah Password" : "Buat Password"}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--st-text-dim)" }}>
          {studentName
            ? `Halo, ${studentName}!`
            : "Buat password untuk akun kamu"}
        </p>
      </div>

      {success ? (
        <div
          className="rounded-2xl p-8 text-center space-y-3"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <span className="text-4xl">✅</span>
          <p
            className="font-bold text-sm"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            Password berhasil {needsCurrent ? "diubah" : "dibuat"}!
          </p>
          <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
            Mengalihkan ke halaman profil...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          {needsCurrent && (
            <div>
              <label
                htmlFor="currentPassword"
                className="text-sm font-medium block mb-1.5"
                style={{ color: "var(--st-text)" }}
              >
                Password Saat Ini
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
                required={needsCurrent}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{
                  backgroundColor: "var(--st-bg)",
                  border: "1px solid #e5e7eb",
                  color: "var(--st-text)",
                }}
              />
            </div>
          )}

          {/* New Password */}
          <div>
            <label
              htmlFor="newPassword"
              className="text-sm font-medium block mb-1.5"
              style={{ color: "var(--st-text)" }}
            >
              Password Baru
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
              style={{
                backgroundColor: "var(--st-bg)",
                border: "1px solid #e5e7eb",
                color: "var(--st-text)",
              }}
            />
          </div>

          {/* Confirm New Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium block mb-1.5"
              style={{ color: "var(--st-text)" }}
            >
              Konfirmasi Password Baru
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang password baru"
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
              style={{
                backgroundColor: "var(--st-bg)",
                border: "1px solid #e5e7eb",
                color: "var(--st-text)",
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-xl"
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
            className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{
              backgroundColor: "var(--st-primary)",
              color: "#fff",
              fontFamily: "var(--font-st-display)",
            }}
          >
            {loading
              ? "Menyimpan..."
              : needsCurrent
                ? "Ubah Password"
                : "Buat Password"}
          </button>
        </form>
      )}

      {/* Hint */}
      {!success && (
        <div
          className="rounded-2xl p-4 text-xs leading-relaxed"
          style={{
            backgroundColor: "var(--st-bg-card)",
            color: "var(--st-text-dim)",
          }}
        >
          <p className="font-medium mb-1">💡 Tips:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Gunakan kombinasi huruf dan angka</li>
            <li>Password minimal 6 karakter</li>
            <li>Jangan gunakan password yang mudah ditebak</li>
          </ul>
        </div>
      )}

      {/* Back to Home */}
      {!success && (
        <div className="text-center">
          <button
            onClick={() => router.push("/student")}
            className="text-sm px-4 py-2 rounded-xl transition-colors cursor-pointer"
            style={{ color: "var(--st-text-dim)" }}
          >
            ← Kembali ke Beranda
          </button>
        </div>
      )}
    </div>
  );
}
