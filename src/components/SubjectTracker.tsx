"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Client wrapper for the server-rendered subject page.
 * Uses event delegation to track clicks on slide links and video links.
 */
export function SubjectTracker({
  subject,
  children,
}: {
  subject: string;
  children: React.ReactNode;
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

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!studentId || !containerRef.current) return;

    const container = containerRef.current;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Walk up DOM to find the link
      const link = target.closest("a");
      if (!link) return;

      const href = link.getAttribute("href") || "";

      // Track video click (YouTube links)
      if (
        href.startsWith("https://") &&
        (href.includes("youtube") || href.includes("youtu.be"))
      ) {
        const title = link.getAttribute("title") || "";
        const topic = title.split("—").pop()?.trim() || title;
        fetch("/api/students/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            type: "video_click",
            metadata: { subject, topic },
          }),
        }).catch(() => {});
        return;
      }

      // Track slide click (Baca links to /student/slides/:id)
      const slideMatch = href.match(/^\/student\/slides\/(.+)$/);
      if (slideMatch) {
        const materialId = slideMatch[1];
        fetch("/api/students/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            materialId,
            type: "slide_view",
            metadata: { subject },
          }),
        }).catch(() => {});
        return;
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [studentId, subject]);

  return <div ref={containerRef}>{children}</div>;
}
