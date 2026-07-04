"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const CHARACTERS = [
  {
    id: "mbappe",
    name: "Mbappe",
    emoji: "⚽",
    description: "Semangat seperti atlet! Ayo kejar target belajarmu!",
    color: "#6366f1",
  },
  {
    id: "lisa",
    name: "Lisa",
    emoji: "💖",
    description: "Belajar sambil bersenang-senang! Kreatif dan ceria!",
    color: "#ec4899",
  },
  {
    id: "kak-budi",
    name: "Kak Budi",
    emoji: "🦉",
    description: "Bijak dan sabar. Teman belajar yang paling perhatian!",
    color: "#f97316",
  },
];

const CLASS_OPTIONS = ["SD Kelas 5", "SMP Kelas 1", "SMA Kelas 2"];
const WEEKDAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

function loadStr(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

function loadArr(key: string, fallback: string[]): string[] {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const paramName = searchParams.get("name");

  const [name, setName] = useState(() => paramName ?? loadStr("student_name", ""));
  const [charClass, setCharClass] = useState(() => loadStr("student_class", "SD Kelas 5"));
  const [character, setCharacter] = useState(() => loadStr("student_character", "kak-budi"));
  const [dailyTime, setDailyTime] = useState(() => loadStr("student_daily_time", "15:00"));
  const [intensiveDays, setIntensiveDays] = useState(() =>
    loadArr("student_intensive_days", ["Senin", "Rabu", "Jumat"])
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (paramName) localStorage.setItem("student_name", paramName);
  }, [paramName]);

  const handleSave = () => {
    localStorage.setItem("student_name", name);
    localStorage.setItem("student_class", charClass);
    localStorage.setItem("student_character", character);
    localStorage.setItem("student_daily_time", dailyTime);
    localStorage.setItem("student_intensive_days", JSON.stringify(intensiveDays));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleDay = (day: string) => {
    setIntensiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const selectedChar = CHARACTERS.find((c) => c.id === character) ?? CHARACTERS[0];

  return (
    <div className="space-y-5">
      {/* Profile Card */}
      <div
        className="rounded-2xl p-5 text-center"
        style={{ backgroundColor: "var(--st-bg-card)" }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-3"
          style={{ backgroundColor: "var(--st-mascot-bg)" }}
        >
          {selectedChar.emoji}
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama kamu"
          className="text-center text-xl font-bold w-full bg-transparent border-none outline-none"
          style={{ fontFamily: "var(--font-st-display)", color: "var(--st-text)" }}
        />
        <select
          value={charClass}
          onChange={(e) => setCharClass(e.target.value)}
          className="mt-1 text-sm text-center bg-transparent border rounded-lg px-3 py-1 outline-none mx-auto"
          style={{ color: "var(--st-text-dim)", borderColor: "#e5e7eb" }}
        >
          {CLASS_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Character Selection */}
      <div>
        <h3
          className="text-base font-bold mb-3"
          style={{ fontFamily: "var(--font-st-display)" }}
        >
          ⭐ Pilih Karakter
        </h3>
        <div className="space-y-2.5">
          {CHARACTERS.map((char) => {
            const isSelected = character === char.id;
            return (
              <button
                key={char.id}
                onClick={() => setCharacter(char.id)}
                className="w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all border-2"
                style={{
                  backgroundColor: isSelected
                    ? `${char.color}10`
                    : "var(--st-bg-card)",
                  borderColor: isSelected ? char.color : "transparent",
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: "var(--st-mascot-bg)" }}
                >
                  {char.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold text-sm"
                    style={{ fontFamily: "var(--font-st-display)" }}
                  >
                    {char.emoji} {char.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--st-text-dim)" }}>
                    {char.description}
                  </p>
                </div>
                {isSelected && <span className="text-lg" style={{ color: char.color }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule Configuration */}
      <div>
        <h3
          className="text-base font-bold mb-3"
          style={{ fontFamily: "var(--font-st-display)" }}
        >
          ⏰ Jadwal Belajar
        </h3>
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: "var(--st-text)" }}>
              Waktu belajar harian
            </label>
            <input
              type="time"
              value={dailyTime}
              onChange={(e) => setDailyTime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#e5e7eb", backgroundColor: "var(--st-bg)", color: "var(--st-text)" }}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: "var(--st-text)" }}>
              Hari belajar intensif
            </label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const isActive = intensiveDays.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={{
                      backgroundColor: isActive ? "var(--st-primary)" : "var(--st-bg)",
                      color: isActive ? "#fff" : "var(--st-text)",
                      border: isActive
                        ? "2px solid var(--st-primary)"
                        : "2px solid #e5e7eb",
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl text-sm font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={{
          backgroundColor: "var(--st-primary)",
          color: "#fff",
          fontFamily: "var(--font-st-display)",
        }}
      >
        {saved ? "✅ Tersimpan!" : "Simpan Pengaturan"}
      </button>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><span className="text-2xl">⏳</span></div>}>
      <ProfileContent />
    </Suspense>
  );
}
