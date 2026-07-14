"use client";

import { useState, useEffect, useMemo } from "react";
import {
  getSchoolSchedule,
  getAvailableDays,
  getDaySchedule,
  type SchoolScheduleEntry,
} from "@/data/school-schedule";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

const DAY_COLORS: Record<string, string> = {
  Senin: "#6366f1",
  Selasa: "#f59e0b",
  Rabu: "#22c55e",
  Kamis: "#a78bfa",
  Jumat: "#ef4444",
};

const SUBJECT_COLORS: Record<string, { emoji: string; color: string }> = {
  Biologi: { emoji: "🧬", color: "#22c55e" },
  "Bahasa Inggris": { emoji: "🌏", color: "#8b5cf6" },
  "Speaking Bahasa Inggris": { emoji: "🌏", color: "#8b5cf6" },
  "Bahasa Indonesia": { emoji: "📖", color: "#34d399" },
  Matematika: { emoji: "🔢", color: "#818cf8" },
  "Matematika Dasar": { emoji: "🔢", color: "#818cf8" },
  Kimia: { emoji: "🧪", color: "#06b6d4" },
  "Bahasa Mandarin": { emoji: "🀄", color: "#f43f5e" },
  "Bahasa Palembang": { emoji: "🏛️", color: "#d946ef" },
  "Bimbingan Konseling": { emoji: "💬", color: "#14b8a6" },
  PJOK: { emoji: "⚽", color: "#6366f1" },
  "Life Skill": { emoji: "🔧", color: "#f97316" },
  PPKN: { emoji: "🤝", color: "#fb923c" },
  "Pendidikan Pancasila dan Kewarganegaraan": { emoji: "🤝", color: "#fb923c" },
  Informatika: { emoji: "💻", color: "#06b6d4" },
  Geografi: { emoji: "🌍", color: "#f472b6" },
  "Seni Budaya": { emoji: "🎨", color: "#e11d48" },
  Sejarah: { emoji: "📜", color: "#d97706" },
  "Pendidikan Agama dan Budi Pekerti": { emoji: "🕌", color: "#a78bfa" },
  "Pendidikan Jasmani Olahraga dan Kesehatan": { emoji: "⚽", color: "#6366f1" },
};

function getSubjectMeta(subject: string): { emoji: string; color: string } {
  return SUBJECT_COLORS[subject] ?? { emoji: "📚", color: "#94a3b8" };
}

/**
 * Format jam — singkatan kalau sama dengan baris sebelumnya.
 */
function formatTime(time: string): string {
  return time;
}

export default function SchoolScheduleSection({
  studentCode,
  studentName,
}: {
  studentCode: string;
  studentName: string;
}) {
  const [activeDay, setActiveDay] = useState<string>(() => {
    // Default: hari ini
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return dayNames[new Date().getDay()];
  });
  const [expandedZoom, setExpandedZoom] = useState<number | null>(null);

  const week = useMemo(() => getSchoolSchedule(studentCode), [studentCode]);

  // Pastikan activeDay valid
  useEffect(() => {
    const available = getAvailableDays(studentCode);
    if (!available.includes(activeDay) && available.length > 0) {
      setActiveDay(available[0]);
    }
  }, [studentCode, activeDay]);

  if (!week) return null;

  const availableDays = DAYS.filter((d) => {
    const s = getDaySchedule(studentCode, d);
    return s && s.length > 0;
  });

  if (availableDays.length === 0) return null;

  const schedule = getDaySchedule(studentCode, activeDay) || [];

  // Kelompokkan per jam untuk menangani multiple teacher (PJOK, Seni Budaya)
  const groupedSchedule: { time: string; entries: SchoolScheduleEntry[] }[] =
    [];
  for (const entry of schedule) {
    const last = groupedSchedule[groupedSchedule.length - 1];
    if (last && last.time === entry.time) {
      last.entries.push(entry);
    } else {
      groupedSchedule.push({ time: entry.time, entries: [entry] });
    }
  }

  return (
    <div className="mb-5">
      <h3
        className="text-base font-bold mb-3 px-1"
        style={{ fontFamily: "var(--font-st-display)" }}
      >
        🏫 Jadwal Sekolah — {studentName}
      </h3>

      {/* Tab hari */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {availableDays.map((day) => {
          const isActive = day === activeDay;
          const color = DAY_COLORS[day] ?? "#6366f1";
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                backgroundColor: isActive ? color : "var(--st-bg-card)",
                color: isActive ? "#fff" : "var(--st-text, #1e293b)",
                boxShadow: isActive ? `0 2px 8px ${color}44` : "none",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Tabel jadwal */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--st-bg-card)" }}
      >
        {groupedSchedule.length === 0 ? (
          <div className="p-6 text-center text-sm" style={{ color: "var(--st-text-dim)" }}>
            ✨ Tidak ada jadwal hari ini
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--st-bg, #f0f4ff)" }}>
            {groupedSchedule.map((group, gi) => {
              const first = group.entries[0];
              const meta = getSubjectMeta(first.subject);
              return (
                <div key={gi} className="p-3.5">
                  {/* Header time + subject */}
                  <div className="flex items-start gap-3">
                    {/* Waktu */}
                    <div
                      className="shrink-0 text-center min-w-[60px] py-1 px-1.5 rounded-lg"
                      style={{
                        backgroundColor: `${meta.color}12`,
                      }}
                    >
                      <span
                        className="text-[10px] font-bold leading-tight block"
                        style={{ color: meta.color }}
                      >
                        {group.time}
                      </span>
                    </div>

                    {/* Detail */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        <span className="mr-1">{meta.emoji}</span>
                        {first.subject}
                      </p>

                      {/* Teachers */}
                      <div className="mt-1 space-y-0.5">
                        {group.entries.map((entry, ei) => (
                          <div
                            key={ei}
                            className="flex items-center gap-1.5 text-xs"
                            style={{ color: "var(--st-text-dim)" }}
                          >
                            <span>👤 {entry.teacher}</span>
                            {entry.linkZoom && (
                              <>
                                <span>·</span>
                                <a
                                  href={entry.linkZoom}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium hover:underline"
                                  style={{ color: meta.color }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  🔗 Zoom
                                </a>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Room badge */}
                    <span
                      className="shrink-0 text-[10px] px-2 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: "var(--st-bg, #f0f4ff)",
                        color: "var(--st-text-dim)",
                      }}
                    >
                      {first.room}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <p
        className="text-[10px] mt-2 text-center"
        style={{ color: "var(--st-text-dim)" }}
      >
        📡 Data dari portal SiKumbang · jadwal dapat berubah sewaktu-waktu
      </p>
    </div>
  );
}
