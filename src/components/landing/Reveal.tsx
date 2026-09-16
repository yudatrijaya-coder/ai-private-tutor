"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Direction of the entrance movement. */
  variant?: "up" | "left" | "right" | "scale" | "fade";
  /** Delay in milliseconds before the reveal starts. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
};

const VARIANT_CLASS: Record<NonNullable<Props["variant"]>, string> = {
  up: "reveal-up",
  left: "reveal-left",
  right: "reveal-right",
  scale: "reveal-scale",
  fade: "reveal-fade",
};

/**
 * Scroll-triggered entrance animation.
 *
 * Uses IntersectionObserver so sections below the fold animate when they are
 * actually reached instead of on page load. Falls back to "already visible"
 * when IntersectionObserver is unavailable, and CSS honours
 * prefers-reduced-motion so motion-sensitive users see static content.
 */
export default function Reveal({
  children,
  variant = "up",
  delay = 0,
  className = "",
  as: Tag = "div",
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`${VARIANT_CLASS[variant]} ${visible ? "is-visible" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
