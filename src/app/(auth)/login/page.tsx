"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email atau password salah");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundColor: "var(--su-bg)",
        color: "var(--su-text)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 space-y-6"
        style={{
          backgroundColor: "var(--su-bg-card)",
          border: "1px solid var(--su-border)",
        }}
      >
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-3xl">🏠</div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            AI Private Tutor
          </h1>
          <p className="text-sm" style={{ color: "var(--su-text-dim)" }}>
            Superuser Dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium"
              style={{ color: "var(--su-text-dim)" }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@tutor.ai"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{
                backgroundColor: "var(--su-bg)",
                border: "1px solid var(--su-border)",
                color: "var(--su-text)",
              }}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium"
              style={{ color: "var(--su-text-dim)" }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{
                backgroundColor: "var(--su-bg)",
                border: "1px solid var(--su-border)",
                color: "var(--su-text)",
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="text-sm px-3 py-2 rounded-lg"
              style={{
                backgroundColor: "var(--su-danger)",
                color: "#fff",
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
              backgroundColor: "var(--su-accent, #6366f1)",
              color: "#fff",
            }}
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p
          className="text-xs text-center"
          style={{ color: "var(--su-text-dim)" }}
        >
          Phase 1 — demo credentials: admin@tutor.ai / admin123
        </p>
      </div>
    </div>
  );
}
