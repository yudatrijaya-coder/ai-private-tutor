"use client";

/**
 * Prosem (Program Semester) quick-action icon + modal dialog.
 *
 * The week schedule is NOT rendered inline on the subject page - the student
 * taps the calendar icon (placed next to Big Map) to open the plan.
 */
import { useState } from "react";

export interface ProsemWeek {
  week: number;
  hours: number;
}
export interface ProsemEntry {
  topic: string;
  subtopic: string;
  weeks: ProsemWeek[];
}
export interface ProsemGroup {
  topic: string;
  items: ProsemEntry[];
}

interface Props {
  plan: {
    source: string;
    semester: string;
  } | null;
  groups: ProsemGroup[];
  currentWeek: number;
  accentColor: string;
}

export default function ProsemDialog({ plan, groups, currentWeek, accentColor }: Props) {
  const [open, setOpen] = useState(false);
  if (!plan || groups.length === 0) return null;
  const wk = Math.min(currentWeek, 18);

  return (
    <>
      {/* Quick-action icon - same tile style as Big Map etc. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-1.5 rounded-2xl p-4 transition-all hover:scale-105 active:scale-95"
        style={{ backgroundColor: "var(--st-bg-card)" }}
        aria-label="Buka Program Semester"
      >
        <span className="text-2xl">{"\u{1F5D3}\uFE0F"}</span>
        <span className="text-xs font-medium text-center">Prosem</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative z-10 w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-3"
            style={{ backgroundColor: "var(--st-bg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between sticky top-0 pb-2"
              style={{ backgroundColor: "var(--st-bg)" }}
            >
              <h2
                className="text-base font-bold"
                style={{ fontFamily: "var(--font-st-display)" }}
              >
                {"\u{1F5D3}\uFE0F"} Program Semester
              </h2>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--st-bg-card)", color: "var(--st-text-dim)" }}
              >
                {plan.semester + " - minggu ke-" + wk}
              </span>
            </div>

            {/* Topic groups */}
            <div className="space-y-2">
              {groups.map((g, gi) => (
                <details
                  key={gi}
                  className="rounded-2xl px-4 py-3"
                  style={{ backgroundColor: "var(--st-bg-card)" }}
                  open={g.items.some((it) => it.weeks.some((w) => w.week === wk))}
                >
                  <summary className="text-sm font-semibold cursor-pointer list-none flex items-center justify-between">
                    <span className="truncate">{g.topic}</span>
                    <span className="text-xs shrink-0 ml-2" style={{ color: "var(--st-text-dim)" }}>
                      {g.items.reduce((a, it) => a + it.weeks.length, 0)} sesi
                    </span>
                  </summary>
                  <ul className="mt-2 space-y-1.5">
                    {g.items.map((it, ii) => {
                      const wks = it.weeks.map((w) => w.week);
                      const maxW = wks.length ? Math.max(...wks) : 0;
                      const isNow = wks.includes(wk);
                      const isPast = wks.length > 0 && maxW < wk;
                      const weekLabel = wks.length === 0 ? "-" : wks.length === 1 ? "mg " + wks[0] : "mg " + Math.min(...wks) + "-" + maxW;
                      return (
                        <li
                          key={ii}
                          className="flex items-center justify-between text-xs gap-2"
                          style={{ opacity: isPast ? 0.55 : 1 }}
                        >
                          <span className="truncate min-w-0">
                            {isNow ? "\u25B8 " : ""}{it.subtopic}
                          </span>
                          <span
                            className="shrink-0 px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: isNow ? accentColor + "25" : "transparent",
                              color: isNow ? accentColor : "var(--st-text-dim)",
                              fontWeight: isNow ? 600 : 400,
                            }}
                          >
                            {weekLabel}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ))}
            </div>

            <p className="text-[11px]" style={{ color: "var(--st-text-dim)" }}>
              Sumber: {plan.source} - jadwal mingguan dari sekolah
            </p>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl py-2.5 text-sm font-semibold"
              style={{ backgroundColor: accentColor, color: "#fff" }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
