"use client";

import { useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

/**
 * StudyTracker — client-side component that tracks student activity.
 * 
 * Heartbeats every 30 seconds while page is active.
 * Sends page visibility changes and subject/topic context.
 * 
 * Drop this component once in the student layout.
 */
export default function StudyTracker() {
  const params = useParams();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getContext = useCallback(() => {
    try {
      // Try to extract studentId from URL params or sessionStorage
      const url = window.location.pathname;
      const match = url.match(/^\/student(?:\/([^/]+))?/);
      const pageSubjectEl = document.querySelector("[data-study-subject]");
      const pageTopicEl = document.querySelector("[data-study-topic]");

      return {
        studentId: match?.[1] || sessionStorage.getItem("studentId") || "",
        source: "web",
        subject: pageSubjectEl?.getAttribute("data-study-subject") || undefined,
        topic: pageTopicEl?.getAttribute("data-study-topic") || undefined,
      };
    } catch {
      return { studentId: "", source: "web" };
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    const ctx = getContext();
    if (!ctx.studentId) return;

    try {
      await fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ctx),
        // No-cors or keep-alive — fire and forget
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
      const ctx = getContext();
      if (ctx.studentId) {
        navigator.sendBeacon("/api/study", JSON.stringify(ctx));
      }
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
