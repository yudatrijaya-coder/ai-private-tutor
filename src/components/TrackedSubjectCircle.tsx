"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * A subject circle link (rendered on the dashboard) that tracks
 * when the student clicks on a subject card.
 */
export function TrackedSubjectCircle({
  name,
  emoji,
  color,
  progress,
}: {
  name: string;
  emoji: string;
  color: string;
  progress: number;
}) {
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.student?.studentId) setStudentId(data.student.studentId);
      })
      .catch(() => {});
  }, []);

  const handleClick = () => {
    if (!studentId) return;
    fetch("/api/students/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        type: "slide_view",
        metadata: { subject: name },
      }),
    }).catch(() => {});
  };

  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <Link
      href={`/student/subject/${encodeURIComponent(name)}`}
      className="flex flex-col items-center gap-1.5"
      onClick={handleClick}
    >
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="absolute inset-0 w-16 h-16 -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="5"
          />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="text-2xl relative z-10">{emoji}</span>
      </div>
      <span
        className="text-xs font-medium text-center"
        style={{ color: "var(--st-text)" }}
      >
        {name}
      </span>
    </Link>
  );
}
