"use client";

import { useCallback } from "react";

type Metadata = {
  subject: string;
  topic?: string;
  score?: number;
  maxScore?: number;
  timeSpent?: number;
  progress?: number;
  source?: string;
  [key: string]: unknown;
};

export function useActivityTracker(studentId: string | null, subject: string) {
  const postActivity = useCallback(
    (type: string, materialId?: string | null, extraMetadata: Partial<Metadata> = {}, quizId?: string | null) => {
      if (!studentId) return;

      const metadata: Metadata = {
        subject,
        ...extraMetadata,
      };

      fetch("/api/students/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          materialId: materialId || undefined,
          quizId: quizId || undefined,
          type,
          metadata,
        }),
      }).then((res) => {
        if (!res.ok)
          console.error("[ActivityTracker] HTTP", res.status, type, subject);
      }).catch((err) => console.error("[ActivityTracker] Network error:", err));
    },
    [studentId, subject]
  );

  const trackSlide = useCallback(
    (materialId?: string | null, topic?: string) => {
      postActivity("slide_view", materialId, { topic });
    },
    [postActivity]
  );

  const trackMindmap = useCallback(
    (materialId?: string | null, topic?: string) => {
      postActivity("mindmap_view", materialId, { topic });
    },
    [postActivity]
  );

  const trackVideo = useCallback(
    (materialId?: string | null, topic?: string) => {
      postActivity("video_click", materialId, { topic });
    },
    [postActivity]
  );

  const trackQuizStart = useCallback(
    (materialId?: string | null, topic?: string) => {
      postActivity("quiz_start", materialId, { topic });
    },
    [postActivity]
  );

  const trackQuizComplete = useCallback(
    (materialId?: string | null, topic?: string, score?: number, maxScore?: number, quizId?: string | null) => {
      postActivity("quiz_complete", materialId, { topic, score, maxScore }, quizId);
    },
    [postActivity]
  );

  const trackExamStart = useCallback(
    (materialId?: string | null, topic?: string) => {
      postActivity("exam_start", materialId, { topic });
    },
    [postActivity]
  );

  const trackExamComplete = useCallback(
    (materialId?: string | null, topic?: string, score?: number, maxScore?: number, quizId?: string | null) => {
      postActivity("exam_complete", materialId, { topic, score, maxScore }, quizId);
    },
    [postActivity]
  );

  return {
    trackSlide,
    trackMindmap,
    trackVideo,
    trackQuizStart,
    trackQuizComplete,
    trackExamStart,
    trackExamComplete,
  };
}
