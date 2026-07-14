"use client";

import { useEffect, useState } from "react";
import { MOTIVATIONAL_QUOTES, type Quote } from "@/data/quotes";

/**
 * Auto-rotating motivational quote component.
 * Changes every 8 seconds with fade animation.
 * Tap to skip to next quote.
 */
export function QuoteRotator() {
  const [quote, setQuote] = useState<Quote>(() => {
    const idx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[idx];
  });
  const [fadeIn, setFadeIn] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
  );

  function nextQuote() {
    setFadeIn(false);
    setTimeout(() => {
      const next = (currentIndex + 1) % MOTIVATIONAL_QUOTES.length;
      setCurrentIndex(next);
      setQuote(MOTIVATIONAL_QUOTES[next]);
      setFadeIn(true);
    }, 400);
  }

  useEffect(() => {
    const interval = setInterval(nextQuote, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // Dot indicators
  const totalDots = Math.min(MOTIVATIONAL_QUOTES.length, 6);
  const activeDot = Math.floor(
    (currentIndex / MOTIVATIONAL_QUOTES.length) * totalDots
  );

  return (
    <button
      onClick={nextQuote}
      className="w-full text-left transition-opacity"
      style={{ opacity: fadeIn ? 1 : 0.3, transition: "opacity 0.4s ease" }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 mt-0.5">💬</span>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm italic leading-relaxed"
            style={{ color: "var(--st-text)", fontFamily: "var(--font-st-body)" }}
          >
            &ldquo;{quote.text}&rdquo;
          </p>
          <p
            className="text-xs mt-1.5 font-medium"
            style={{ color: "var(--st-primary)" }}
          >
            — {quote.author}
          </p>
        </div>
      </div>
      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {Array.from({ length: totalDots }).map((_, i) => (
          <span
            key={i}
            className="block rounded-full transition-all duration-300"
            style={{
              width: i === activeDot ? 16 : 6,
              height: 6,
              backgroundColor:
                i === activeDot
                  ? "var(--st-primary)"
                  : "var(--st-text-dim, #cbd5e1)",
              opacity: i === activeDot ? 1 : 0.5,
            }}
          />
        ))}
      </div>
    </button>
  );
}
