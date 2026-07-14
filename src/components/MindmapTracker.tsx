"use client";

import { useEffect, useState } from "react";
import { useActivityTracker } from "@/hooks/useActivityTracker";

export function MindmapTracker({
  subject,
  materialId,
  children,
}: {
  subject: string;
  materialId?: string;
  children: React.ReactNode;
}) {
  const [studentId, setStudentId] = useState<string | null>(null);
  const tracker = useActivityTracker(studentId, subject);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.student?.studentId) setStudentId(data.student.studentId);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (studentId) {
      tracker.trackMindmap(materialId);
    }
  }, [studentId, materialId]);

  return <>{children}</>;
}
