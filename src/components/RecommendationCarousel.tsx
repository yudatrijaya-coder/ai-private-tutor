"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";

interface RecItem {
  type: string;
  icon: string;
  label: string;
  subtitle: string;
  href: string;
  color: string;
}

/**
 * Recommendation carousel — shows 3 cards at a time, auto-rolls every 6s.
 * Tap left/right side to navigate manually.
 */
export function RecommendationCarousel({ items }: { items: RecItem[] }) {
  const totalPages = Math.ceil(items.length / 3);
  const [page, setPage] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nextPage = useCallback(() => {
    setPage((p) => (p + 1) % totalPages);
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => (p - 1 + totalPages) % totalPages);
  }, [totalPages]);

  // Auto-roll every 6 seconds
  useEffect(() => {
    timerRef.current = setInterval(nextPage, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nextPage]);

  // Pause on hover/touch
  const pause = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
  const resume = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(nextPage, 6000);
  };

  const startIdx = page * 3;
  const visible = items.slice(startIdx, startIdx + 3);

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onTouchStart={pause}
      onTouchEnd={resume}
    >
      {/* Cards container with swipe hint */}
      <div className="space-y-2 min-h-[180px]">
        {visible.map((rec, i) => (
          <Link
            key={`${rec.type}-${startIdx + i}`}
            href={rec.href}
            target={rec.type === "video" || rec.type === "sibi" ? "_blank" : undefined}
            rel={rec.type === "video" ? "noopener noreferrer" : undefined}
            className="flex items-center gap-3 rounded-xl p-3.5 transition-all hover:scale-[1.01] active:scale-95 hover:opacity-90"
            style={{ backgroundColor: "var(--st-bg-card)" }}
          >
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: `${rec.color}20` }}
            >
              {rec.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{rec.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--st-text-dim)" }}>
                {rec.subtitle}
              </p>
            </div>
            <span className="text-lg" style={{ color: "var(--st-text-dim)" }}>
              {rec.type === "video" || rec.type === "sibi" ? "↗" : "→"}
            </span>
          </Link>
        ))}
      </div>

      {/* Dot indicators + manual nav */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {/* Prev */}
          <button
            onClick={prevPage}
            className="w-6 h-6 flex items-center justify-center rounded-full text-xs transition-colors hover:opacity-70"
            style={{ color: "var(--st-text-dim)" }}
            aria-label="Sebelumnya"
          >
            ◀
          </button>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className="block rounded-full transition-all duration-300"
                style={{
                  width: i === page ? 16 : 6,
                  height: 6,
                  backgroundColor:
                    i === page
                      ? "var(--st-primary)"
                      : "var(--st-text-dim, #cbd5e1)",
                  opacity: i === page ? 1 : 0.5,
                }}
                aria-label={`Halaman ${i + 1}`}
              />
            ))}
          </div>

          {/* Next */}
          <button
            onClick={nextPage}
            className="w-6 h-6 flex items-center justify-center rounded-full text-xs transition-colors hover:opacity-70"
            style={{ color: "var(--st-text-dim)" }}
            aria-label="Selanjutnya"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}
