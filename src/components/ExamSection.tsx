"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ExamStatus {
  hasTakenPreTest: boolean;
  isPostTestAvailable: boolean;
  improvementPlan?: {
    id: string;
    createdAt: string;
    totalScore: number;
    totalMax: number;
  };
}

export function ExamSection() {
  const [status, setStatus] = useState<ExamStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/students/exam-status")
      .then((res) => res.json())
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mb-5">
        <div
          className="rounded-2xl p-4 animate-pulse"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="mb-5">
      {!status.hasTakenPreTest && (
        <div
          className="rounded-2xl p-5 flex flex-col items-center text-center"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <span className="text-4xl mb-2">🎓</span>
          <h3
            className="text-base font-bold mb-1"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            Mulai Perjalananmu!
          </h3>
          <p className="text-xs mb-4" style={{ color: "var(--st-text-dim)" }}>
            Uji pemahaman awalmu dengan pre-test untuk personalisasi belajar.
          </p>
          <Link
            href="/student/quiz?exam=true&type=pre-test"
            className="px-4 py-2 rounded-full text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: "var(--st-primary)" }}
          >
            Mulai Pre-test
          </Link>
        </div>
      )}

      {status.hasTakenPreTest && status.isPostTestAvailable && (
        <div
          className="rounded-2xl p-5 flex flex-col items-center text-center"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <span className="text-4xl mb-2">🎉</span>
          <h3
            className="text-base font-bold mb-1"
            style={{ fontFamily: "var(--font-st-display)" }}
          >
            Uji Pemahaman Akhir!
          </h3>
          <p className="text-xs mb-4" style={{ color: "var(--st-text-dim)" }}>
            Kamu sudah menyelesaikan semua materi. Saatnya post-test!
          </p>
          <Link
            href="/student/quiz?exam=true&type=post-test"
            className="px-4 py-2 rounded-full text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: "var(--st-primary)" }}
          >
            Mulai Post-test
          </Link>
        </div>
      )}

      {status.improvementPlan && (
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <div className="flex items-center gap-4">
            <span className="text-4xl">🚀</span>
            <div className="flex-1">
              <h3
                className="font-bold mb-0.5"
                style={{ fontFamily: "var(--font-st-display)" }}
              >
                Rencana Belajar Terbaru
              </h3>
              <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
                Skor terakhir: {status.improvementPlan.totalScore}/
                {status.improvementPlan.totalMax}. Ayo tingkatkan!
              </p>
            </div>
          </div>
          <Link
            href={`/student/improvement-plan/${status.improvementPlan.id}`}
            className="mt-4 block text-center px-4 py-2 rounded-full text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: "var(--st-primary)" }}
          >
            Lihat Rencana
          </Link>
        </div>
      )}
    </div>
  );
}
