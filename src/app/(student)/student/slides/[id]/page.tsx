"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useActivityTracker } from "@/hooks/useActivityTracker";

/* ── Tema ── */
const SUBJECT_THEMES: Record<string, { bg: string; card: string; accent: string; gradient: string; particles: string }> = {
  IPAS: { bg: "#0a0f1e", card: "rgba(255,255,255,0.06)", accent: "#06b6d4", gradient: "linear-gradient(135deg, #0c1929 0%, #1a0a2e 50%, #0f2027 100%)", particles: "🌊🌋🌴🌍🔬" },
  Matematika: { bg: "#0a0f1e", card: "rgba(255,255,255,0.06)", accent: "#818cf8", gradient: "linear-gradient(135deg, #0a0f2e 0%, #1a0a2e 50%, #0f1a2e 100%)", particles: "🔢📐📊➕➖" },
  default: { bg: "#0a0f1e", card: "rgba(255,255,255,0.06)", accent: "#6366f1", gradient: "linear-gradient(135deg, #0c0c1d 0%, #1a0a2e 50%, #0f0f20 100%)", particles: "✨🌟⭐💫🎯" },
};

function getTheme(subject?: string) {
  return SUBJECT_THEMES[subject ?? ""] ?? SUBJECT_THEMES.default;
}

function extractEmoji(slide: string): string {
  const match = slide.match(/^##\s+(.)/m);
  if (match) { const c = match[1]; if (/[\u{1F000}-\u{1FFFF}]/u.test(c)) return c; }
  return "📖";
}

function renderMarkdown(slide: string, accent: string): string {
  return slide
    .replace(/^##\s+(.+)/gm, (_, t: string) => {
      const emojiMatch = t.match(/^([\u{1F000}-\u{1FFFF}])\s*/u);
      const emoji = emojiMatch ? emojiMatch[1] : "";
      const text = emojiMatch ? t.slice(emojiMatch[0].length) : t;
      const finalText = text || t;
      return `<div class="flex items-center gap-3 mb-6"><span class="text-4xl">${emoji || "📖"}</span><h2 class="text-2xl font-extrabold tracking-tight" style="color:${accent}">${finalText}</h2></div>`;
    })
    .replace(/^#\s+(.+)/gm, '<h1 class="text-3xl font-extrabold mb-4 text-white">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold" style="color:#fff">$1</strong>')
    .replace(/^-\s+(.+)/gm, '<div class="flex items-start gap-2 mb-2"><span class="text-lg shrink-0 mt-0.5">•</span><span class="text-base">$1</span></div>')
    .replace(/^\d\.\s+(.+)/gm, '<div class="flex items-start gap-2 mb-2"><span class="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span><span class="text-base">$1</span></div>')
    .replace(/\n---\n?/g, "").replace(/\n{3,}/g, '\n\n').replace(/\n\n/g, '</div><div class="space-y-3 mt-4">').replace(/\n/g, '<br/>');
}

function Particles({ emojis }: { emojis: string }) {
  const items = useMemo(() => {
    const chars = emojis.split("");
    return Array.from({ length: 12 }).map(() => ({
      emoji: chars[Math.floor(Math.random() * chars.length)],
      x: Math.random() * 100, y: Math.random() * 100,
      size: 14 + Math.random() * 24, speed: 8 + Math.random() * 15, delay: Math.random() * 10,
    }));
  }, [emojis]);
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {items.map((p, i) => (
        <div key={i} className="absolute animate-float" style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size, opacity: 0.2, animation: `float ${p.speed}s ease-in-out ${p.delay}s infinite alternate` }}>{p.emoji}</div>
      ))}
      <style jsx>{`@keyframes float { 0% { transform: translateY(0px) rotate(0deg); opacity: 0.15; } 50% { transform: translateY(-20px) rotate(5deg); opacity: 0.25; } 100% { transform: translateY(0px) rotate(0deg); opacity: 0.15; } }`}</style>
    </div>
  );
}

/* ── Source config ── */
const SOURCES = [
  { key: "default", label: "LLM", emoji: "🤖", accent: "#818cf8" },
  { key: "sibi", label: "SIBI", emoji: "📚", accent: "#d97706" },
  { key: "moodle", label: "Moodle", emoji: "📘", accent: "#16a34a" },
] as const;

type SourceKey = (typeof SOURCES)[number]["key"];

export default function SlideViewerPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSource = (searchParams.get("source") || "default") as SourceKey;

  const [activeSource, setActiveSource] = useState<SourceKey>(urlSource);
  const [slidesState, setSlidesState] = useState<Record<SourceKey, string[]>>({ default: [], sibi: [], moodle: [] });
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState<Record<SourceKey, boolean>>({ default: false, sibi: false, moodle: false });
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isRead, setIsRead] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, any> | null>(null);

  const { trackSlide } = useActivityTracker(studentId, subject);

  // Switch source
  const switchSource = useCallback((key: SourceKey) => {
    if (key === activeSource) return;
    // If we already have slides for this source, just switch
    if (slidesState[key].length > 0) {
      setActiveSource(key);
      setCurrent(0);
      router.replace(`/student/slides/${id}?source=${key}`, { scroll: false });
      return;
    }
    // Otherwise fetch
    setActiveSource(key);
    setCurrent(0);
    setLoading(prev => ({ ...prev, [key]: true }));
    router.replace(`/student/slides/${id}?source=${key}`, { scroll: false });
    fetch(`/api/students/material/${id}?source=${key}`)
      .then(r => r.json())
      .then(data => {
        if (data.slides) {
          const parts = data.slides.split("\n---\n").map((s: string) => s.trim());
          setSlidesState(prev => ({ ...prev, [key]: parts }));
        } else if (data.content) {
          const parts = data.content.split(/\n{3,}/).map((s: string) => s.trim());
          setSlidesState(prev => ({ ...prev, [key]: parts.length > 1 ? parts : [data.content] }));
        }
        setLoading(prev => ({ ...prev, [key]: false }));
      })
      .catch(() => setLoading(prev => ({ ...prev, [key]: false })));
  }, [id, activeSource, slidesState, router]);

  // Fetch student session + activity
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      const sid = data.student?.studentId || null;
      setStudentId(sid);
      if (sid) {
        fetch(`/api/students/activity?studentId=${encodeURIComponent(sid)}`).then(r => r.json()).then(act => {
          if (act.readMaterials?.includes(id)) setIsRead(true);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [id]);

  // Fetch initial slides + metadata (get all sources)
  useEffect(() => {
    // Fetch default
    const fetchAll = async () => {
      // Fetch default + sibi + moodle in parallel
      const results = await Promise.allSettled([
        fetch(`/api/students/material/${id}?source=default`).then(r => r.json()),
        fetch(`/api/students/material/${id}?source=sibi`).then(r => r.json()),
        fetch(`/api/students/material/${id}?source=moodle`).then(r => r.json()),
      ]);

      const newSlides: Record<SourceKey, string[]> = { default: [], sibi: [], moodle: [] };
      let firstTitle = "";
      let firstSubject = "";
      let meta: Record<string, any> | null = null;

      results.forEach((result, i) => {
        const key = ["default", "sibi", "moodle"][i] as SourceKey;
        if (result.status === "fulfilled") {
          const data = result.value;
          if (i === 0) {
            firstTitle = data.topic || "Materi";
            firstSubject = data.subject || "";
            meta = data;
          }
          if (data.slides) {
            const parts = data.slides.split("\n---\n").map((s: string) => s.trim());
            newSlides[key] = parts;
          } else if (data.content) {
            const parts = data.content.split(/\n{3,}/).map((s: string) => s.trim());
            newSlides[key] = parts.length > 1 ? parts : [data.content];
          }
        }
      });

      setSlidesState(newSlides);
      setTitle(firstTitle);
      setSubject(firstSubject);
      setMetadata(meta);

      // If requested source has no slides, fallback to default
      if (newSlides[activeSource].length === 0 && newSlides.default.length > 0) {
        setActiveSource("default");
        router.replace(`/student/slides/${id}?source=default`, { scroll: false });
      }
    };

    fetchAll();
  }, [id]);

  // Track activity
  const lastTrackedSlide = useRef<number>(-1);
  useEffect(() => {
    if (studentId && subject && slidesState[activeSource].length > 0 && current !== lastTrackedSlide.current) {
      lastTrackedSlide.current = current;
      trackSlide(id, title);
    }
  }, [studentId, subject, slidesState, activeSource, current, id, title, trackSlide]);

  const theme = getTheme(subject);
  const currentSlides = slidesState[activeSource] || [];
  const isLoading = loading[activeSource] && currentSlides.length === 0;
  const slide = currentSlides[current] || "";
  const html = useMemo(() => renderMarkdown(slide, theme.accent), [slide, theme.accent]);
  const emoji = useMemo(() => extractEmoji(slide), [slide]);

  // Determine which sources are available
  const availableSources = SOURCES.filter(s => slidesState[s.key].length > 0 || s.key === "default" || s.key === activeSource);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: theme.gradient }}>
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="text-6xl animate-bounce">📖</div>
        <p className="text-white/60 text-sm">Memuat slide...</p>
      </div>
    </div>
  );

  const noSlides = Object.values(slidesState).every(arr => arr.length === 0);

  if (noSlides) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: theme.gradient }}>
      <div className="text-center p-8">
        <div className="text-6xl mb-4 animate-bounce">📄</div>
        <h1 className="text-xl font-bold text-white mb-2">Belum Ada Slide</h1>
        <p className="text-sm text-white/40">Materi ini belum memiliki slide presentasi.</p>
        <Link href="/student" className="inline-block mt-4 text-sm underline text-white/50">← Kembali</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: theme.gradient, color: "#fff" }}>
      <Particles emojis={theme.particles} />

      {/* Header */}
      <header className="relative z-10 px-4 py-2 flex flex-col" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        {/* Top row */}
        <div className="flex items-center justify-between mb-2">
          <Link href="/student" className="text-sm hover:opacity-70 transition-opacity" style={{ color: "rgba(255,255,255,0.6)" }}>
            ← Kembali
          </Link>
          <div className="flex flex-col items-center max-w-[50%]">
            <span className="text-sm font-medium truncate w-full text-center" style={{ color: "rgba(255,255,255,0.8)" }}>{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {isRead && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">✅ READ</span>}
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.accent}30`, color: theme.accent }}>
              {current + 1} / {currentSlides.length}
            </span>
          </div>
        </div>

        {/* Source Switcher */}
        <div className="flex items-center justify-center gap-2 pb-1">
          {availableSources.map(source => {
            const isActive = activeSource === source.key;
            const isAvailable = slidesState[source.key].length > 0;
            return (
              <button
                key={source.key}
                onClick={() => isAvailable && switchSource(source.key)}
                disabled={!isAvailable}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                  transition-all duration-300
                  ${isActive
                    ? "shadow-lg scale-105"
                    : "opacity-50 hover:opacity-80"
                  }
                  ${!isAvailable ? "opacity-20 cursor-not-allowed" : "cursor-pointer"}
                `}
                style={{
                  backgroundColor: isActive ? `${source.accent}30` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isActive ? source.accent : "transparent"}`,
                  color: isActive ? source.accent : "rgba(255,255,255,0.6)",
                  boxShadow: isActive ? `0 0 20px ${source.accent}40` : "none",
                }}
              >
                <span>{source.emoji}</span>
                <span>{source.label}</span>
                {isAvailable && (
                  <span className="text-[10px] px-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {slidesState[source.key].length} sl
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Active source indicator */}
      {activeSource !== "default" && (
        <div className="relative z-10 px-4 py-0.5 text-center">
          <span className="text-[10px] tracking-wider uppercase" style={{ color: (SOURCES.find(s => s.key === activeSource)?.accent || theme.accent) + "80" }}>
            Sumber: {SOURCES.find(s => s.key === activeSource)?.emoji} {SOURCES.find(s => s.key === activeSource)?.label}
          </span>
        </div>
      )}

      {/* Slide */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8 relative z-10">
        <div
          className="w-full max-w-3xl rounded-3xl p-6 md:p-12 min-h-[350px] md:min-h-[450px] flex flex-col justify-center transition-all duration-500"
          style={{
            backgroundColor: theme.card,
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          }}
          key={`${activeSource}-${current}`}
        >
          <div className="text-center mb-6">
            <span className="inline-block text-6xl md:text-7xl animate-emoji" style={{ animation: "emojiBounce 2s ease-in-out infinite" }}>{emoji}</span>
          </div>
          <div className="text-center text-base md:text-lg leading-relaxed space-y-3" style={{ color: "rgba(255,255,255,0.85)" }} dangerouslySetInnerHTML={{ __html: html }} />
          <style jsx>{`@keyframes emojiBounce { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-8px) scale(1.05); } }`}</style>
        </div>
      </main>

      {/* Navigation */}
      <footer className="relative z-10 px-6 py-4 flex items-center justify-center gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <button onClick={() => setCurrent(p => Math.max(0, p - 1))} disabled={current === 0}
          className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-20 disabled:hover:scale-100"
          style={{ backgroundColor: `${theme.accent}25`, color: theme.accent, border: `1px solid ${theme.accent}30` }}>
          ◀ Sebelumnya
        </button>
        <div className="flex items-center gap-1.5 px-3">
          {currentSlides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className="transition-all duration-300 rounded-full"
              style={{
                width: i === current ? 24 : 8, height: 8,
                backgroundColor: i === current ? theme.accent : "rgba(255,255,255,0.15)",
                boxShadow: i === current ? `0 0 12px ${theme.accent}60` : "none",
              }} />
          ))}
        </div>
        <button onClick={() => setCurrent(p => Math.min(currentSlides.length - 1, p + 1))} disabled={current === currentSlides.length - 1}
          className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-20 disabled:hover:scale-100"
          style={{ backgroundColor: `${theme.accent}25`, color: theme.accent, border: `1px solid ${theme.accent}30` }}>
          Selanjutnya ▶
        </button>
      </footer>
    </div>
  );
}
