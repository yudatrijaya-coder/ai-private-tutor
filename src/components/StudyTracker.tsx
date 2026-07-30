"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * StudyTracker — client-side component that tracks student activity.
 * 
 * Heartbeats every 30 seconds while page is active.
 * Sends page visibility changes and subject/topic context.
 * 
 * Drop this component once in the student layout.
 */
export default function StudyTracker() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getContext = useCallback(() => {
    try {
      const pageSubjectEl = document.querySelector("[data-study-subject]");
      const pageTopicEl = document.querySelector("[data-study-topic]");

      return {
        source: "web",
        subject: pageSubjectEl?.getAttribute("data-study-subject") || undefined,
        topic: pageTopicEl?.getAttribute("data-study-topic") || undefined,
      };
    } catch {
      return { source: "web" };
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    try {
      // studentId is resolved server-side from the session cookie.
      await fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getContext()),
        keepalive: true,
      });
    } catch {
      // silent fail — don't interrupt UX
    }
  }, [getContext]);

  useEffect(() => {
    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, 30000);

    // Send heartbeat on visibility change (coming back to tab)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Send heartbeat before unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability
      navigator.sendBeacon("/api/study", JSON.stringify(getContext()));
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sendHeartbeat, getContext]);

  return null; // No UI
}
