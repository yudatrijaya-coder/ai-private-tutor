"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useActivityTracker } from "@/hooks/useActivityTracker";

/**
 * Tracked Link for slide-view buttons.
 * Logs a slide_view activity when the user clicks to read a slide.
 */
export function TrackedSlideLink({
  href,
  materialId,
  topic,
  subject,
  className,
  style,
  children,
}: {
  href: string;
  materialId?: string;
  topic?: string;
  subject: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [studentId, setStudentId] = useState<string | null>(null);
  const { trackSlide } = useActivityTracker(studentId, subject);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.student?.studentId) setStudentId(data.student.studentId);
      })
      .catch(() => {});
  }, []);

  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={() => trackSlide(materialId, topic)}
    >
      {children}
    </Link>
  );
}

/**
 * Tracked link for YouTube video buttons.
 * Logs a video_click activity when the user clicks to watch a video.
 */
export function TrackedVideoLink({
  href,
  topic,
  subject,
  channel,
  title,
  className,
  style,
  children,
}: {
  href: string;
  topic?: string;
  subject: string;
  channel?: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [studentId, setStudentId] = useState<string | null>(null);
  const { trackVideo } = useActivityTracker(studentId, subject);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.student?.studentId) setStudentId(data.student.studentId);
      })
      .catch(() => {});
  }, []);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      title={title ? `${channel} — ${title}` : undefined}
      onClick={() => trackVideo(null, topic)}
    >
      {children}
    </a>
  );
}
