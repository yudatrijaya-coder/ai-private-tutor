"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ApplyPlanButtonProps {
  planId: string;
}

export function ApplyPlanButton({ planId }: ApplyPlanButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleApply = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/exam/apply-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menerapkan rencana.");
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-sm font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 p-3 rounded-xl border border-green-200 dark:border-green-900 flex items-center gap-2">
        <span>✅ Jadwal baru berhasil diterapkan!</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleApply}
        disabled={loading}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
      >
        {loading ? "Menerapkan..." : "Terapkan Rencana Belajar Baru 🚀"}
      </button>
      {error && (
        <p className="text-xs text-red-500 font-medium mt-1">{error}</p>
      )}
    </div>
  );
}
