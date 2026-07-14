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
    (type: string, materialId?: string | null, extraMetadata: Partial<Metadata> = {}) => {
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
          type,
          metadata,
        }),
      }).catch((err) => console.error("[ActivityTracker]", err));
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
    (materialId?: string | null, topic?: string, score?: number, maxScore?: number) => {
      postActivity("quiz_complete", materialId, { topic, score, maxScore });
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
    (materialId?: string | null, topic?: string, score?: number, maxScore?: number) => {
      postActivity("exam_complete", materialId, { topic, score, maxScore });
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
