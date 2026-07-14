"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Client wrapper for the dashboard / student home page.
 * Uses event delegation to track clicks on:
 * - Subject cards (links to /student/subject/:name)
 * - Recommendation carousel items (links in the recs section)
 */
export function DashboardTracker({
  children,
}: {
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
      const link = target.closest("a");
      if (!link) return;

      const href = link.getAttribute("href") || "";

      // Track subject card click
      const subjectMatch = href.match(/^\/student\/subject\/(.+)$/);
      if (subjectMatch) {
        const subject = decodeURIComponent(subjectMatch[1]);
        fetch("/api/students/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            type: "slide_view",
            metadata: { subject, source: "dashboard_subject_card" },
          }),
        }).catch(() => {});
        return;
      }

      // Track recommendation carousel item clicks (they point to various destinations)
      // Everything inside the RecommendationCarousel's parent div is a rec item
      const recContainer = link.closest("[data-recs-section]");
      if (recContainer) {
        const label = link.textContent?.trim() || "";
        const subject = extractSubjectFromRec(link);
        fetch("/api/students/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            type: "slide_view",
            metadata: {
              subject: subject || "general",
              source: "recommendation",
              label,
            },
          }),
        }).catch(() => {});
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [studentId]);

  return <div ref={containerRef}>{children}</div>;
}

/** Try to extract a subject name from a recommendation link's text or nearby elements */
function extractSubjectFromRec(link: Element): string | undefined {
  const text = link.textContent || "";
  const knownSubjects = [
    "Matematika",
    "Bahasa Indonesia",
    "IPA",
    "IPAS",
    "IPS",
    "Agama",
    "PKN",
    "Pendidikan Pancasila",
    "PJOK",
    "Informatika",
    "Bahasa Inggris",
    "Bahasa",
    "Geografi",
    "Sosiologi",
    "Ekonomi",
  ];
  for (const s of knownSubjects) {
    if (text.includes(s)) return s;
  }
  return undefined;
}
